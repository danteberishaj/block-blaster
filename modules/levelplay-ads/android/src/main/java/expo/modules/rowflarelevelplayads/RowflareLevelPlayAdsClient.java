package expo.modules.rowflarelevelplayads;

import android.app.Activity;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import androidx.lifecycle.Lifecycle;
import androidx.lifecycle.LifecycleOwner;

import com.unity3d.mediation.LevelPlay;
import com.unity3d.mediation.LevelPlayAdError;
import com.unity3d.mediation.LevelPlayAdInfo;
import com.unity3d.mediation.LevelPlayConfiguration;
import com.unity3d.mediation.LevelPlayInitError;
import com.unity3d.mediation.LevelPlayInitListener;
import com.unity3d.mediation.LevelPlayInitRequest;
import com.unity3d.mediation.LevelPlayPrivacySettings;
import com.unity3d.mediation.rewarded.LevelPlayReward;
import com.unity3d.mediation.rewarded.LevelPlayRewardedAd;
import com.unity3d.mediation.rewarded.LevelPlayRewardedAdListener;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

public final class RowflareLevelPlayAdsClient {
  private static final long INITIALIZATION_TIMEOUT_MS = 15_000L;
  private static final long LOAD_TIMEOUT_MS = 20_000L;
  private static final long SHOW_TIMEOUT_MS = 5 * 60_000L;
  // LevelPlay documents onAdRewarded before onAdClosed, but mediated networks can
  // deliver the reward a beat late; a closed-without-reward show waits this long
  // for a trailing reward before settling as skipped.
  private static final long REWARD_GRACE_MS = 10_000L;
  private static final Object INITIALIZATION_LOCK = new Object();
  private static final AtomicReference<Object> ACTIVE_AD_OWNER = new AtomicReference<>();
  private static final List<InitializationCallback> INITIALIZATION_CALLBACKS = new ArrayList<>();

  private static boolean privacyConfigured = false;
  private static boolean initialized = false;
  private static boolean initializing = false;
  private static boolean initializationTimedOut = false;
  private static int initializationAttempt = 0;

  private RowflareLevelPlayAdsClient() {}

  public interface InitializationCallback {
    void onComplete(String errorCode, String errorMessage);
  }

  public interface RewardedCallback {
    void onComplete(boolean rewarded, String errorCode, String errorMessage);
  }

  public static void configurePrivacy(
      boolean userConsent,
      boolean userOptOut,
      boolean nonBehavioral
  ) {
    LevelPlayPrivacySettings.setGDPRConsent(userConsent);
    LevelPlayPrivacySettings.setCCPA(userOptOut);
    LevelPlay.setMetaData("is_deviceid_optout", nonBehavioral ? "true" : "false");
    privacyConfigured = true;
  }

  public static void initialize(
      Context context,
      String appKey,
      boolean testMode,
      InitializationCallback callback
  ) {
    // testMode is accepted for API compatibility; LevelPlay serves test ads to
    // devices registered on the dashboard, not through an SDK flag.
    if (!privacyConfigured) {
      callback.onComplete(
          "LEVELPLAY_PRIVACY_NOT_CONFIGURED",
          "LevelPlay privacy settings must be configured before initialization."
      );
      return;
    }
    if (context == null) {
      callback.onComplete("LEVELPLAY_NO_CONTEXT", "No Android context is available.");
      return;
    }
    if (appKey == null || appKey.trim().isEmpty()) {
      callback.onComplete("LEVELPLAY_MISSING_APP_KEY", "The LevelPlay app key is missing.");
      return;
    }

    final int attempt;
    synchronized (INITIALIZATION_LOCK) {
      if (initialized) {
        callback.onComplete(null, null);
        return;
      }

      // LevelPlay.init cannot be cancelled. After our caller-facing timeout,
      // fail later callers quickly until the original SDK callback arrives;
      // never start overlapping process-global initialization calls.
      if (initializing && initializationTimedOut) {
        callback.onComplete(
            "LEVELPLAY_INIT_STILL_PENDING",
            "LevelPlay initialization is still pending. Please try again later."
        );
        return;
      }

      INITIALIZATION_CALLBACKS.add(callback);
      if (initializing) return;

      initializing = true;
      attempt = ++initializationAttempt;
    }

    Handler mainHandler = new Handler(Looper.getMainLooper());
    Runnable initializationTimeout = () -> timeoutInitialization(attempt);
    mainHandler.postDelayed(initializationTimeout, INITIALIZATION_TIMEOUT_MS);

    LevelPlayInitRequest initRequest =
        new LevelPlayInitRequest.Builder(appKey.trim()).build();

    LevelPlayInitListener listener = new LevelPlayInitListener() {
      @Override
      public void onInitSuccess(LevelPlayConfiguration configuration) {
        mainHandler.removeCallbacks(initializationTimeout);
        completeInitialization(attempt, true, null, null);
      }

      @Override
      public void onInitFailed(LevelPlayInitError error) {
        mainHandler.removeCallbacks(initializationTimeout);
        completeInitialization(
            attempt,
            false,
            levelPlayInitErrorCode("LEVELPLAY_INIT_FAILED", error),
            error == null ? "LevelPlay failed to initialize." : error.getErrorMessage()
        );
      }
    };

    try {
      LevelPlay.init(context, initRequest, listener);
    } catch (RuntimeException error) {
      mainHandler.removeCallbacks(initializationTimeout);
      completeInitialization(
          attempt,
          false,
          "LEVELPLAY_INIT_EXCEPTION",
          error.getMessage()
      );
    }
  }

  private static void timeoutInitialization(int attempt) {
    List<InitializationCallback> callbacks;
    synchronized (INITIALIZATION_LOCK) {
      if (attempt != initializationAttempt || !initializing) return;
      initializationTimedOut = true;
      callbacks = new ArrayList<>(INITIALIZATION_CALLBACKS);
      INITIALIZATION_CALLBACKS.clear();
    }

    for (InitializationCallback pendingCallback : callbacks) {
      pendingCallback.onComplete(
          "LEVELPLAY_INIT_TIMEOUT",
          "LevelPlay took too long to initialize."
      );
    }
  }

  private static void completeInitialization(
      int attempt,
      boolean success,
      String errorCode,
      String errorMessage
  ) {
    List<InitializationCallback> callbacks;
    synchronized (INITIALIZATION_LOCK) {
      if (attempt != initializationAttempt) {
        if (!success || initialized) return;

        // LevelPlay initialization is process-global and cannot be cancelled.
        // If an older timed-out attempt succeeds while a retry is pending,
        // success wins and invalidates the newer attempt's eventual callback.
        initialized = true;
        initializing = false;
        initializationTimedOut = false;
        initializationAttempt++;
        callbacks = new ArrayList<>(INITIALIZATION_CALLBACKS);
        INITIALIZATION_CALLBACKS.clear();
      } else {
        initialized = success;
        initializing = false;
        initializationTimedOut = false;
        callbacks = new ArrayList<>(INITIALIZATION_CALLBACKS);
        INITIALIZATION_CALLBACKS.clear();
      }
    }

    for (InitializationCallback pendingCallback : callbacks) {
      pendingCallback.onComplete(errorCode, errorMessage);
    }
  }

  public static void showRewarded(
      Activity activity,
      String adUnitId,
      String rewardKey,
      RewardedCallback callback
  ) {
    // rewardKey is accepted for API compatibility; the reward name and amount
    // are defined on the LevelPlay dashboard ad unit, not per show call.
    if (!initialized) {
      callback.onComplete(false, "LEVELPLAY_NOT_INITIALIZED", "LevelPlay is not initialized.");
      return;
    }
    if (adUnitId == null || adUnitId.trim().isEmpty()) {
      callback.onComplete(false, "LEVELPLAY_MISSING_AD_UNIT", "The rewarded ad unit ID is missing.");
      return;
    }
    if (!isActivityUsable(activity)) {
      callback.onComplete(false, "LEVELPLAY_NO_ACTIVITY", "The Android screen is no longer active.");
      return;
    }
    Object adOwner = new Object();
    if (!ACTIVE_AD_OWNER.compareAndSet(null, adOwner)) {
      callback.onComplete(false, "LEVELPLAY_BUSY", "Another ad is already loading or showing.");
      return;
    }

    AtomicBoolean settled = new AtomicBoolean(false);
    AtomicBoolean rewardEarned = new AtomicBoolean(false);
    Handler mainHandler = new Handler(Looper.getMainLooper());
    AtomicReference<Runnable> activeTimeout = new AtomicReference<>();
    AtomicReference<Runnable> pendingRewardGrace = new AtomicReference<>();
    Runnable ownerReleaseTimeout = () -> ACTIVE_AD_OWNER.compareAndSet(adOwner, null);

    Runnable loadTimeout = () -> finish(
        mainHandler,
        activeTimeout,
        settled,
        adOwner,
        true,
        callback,
        false,
        "LEVELPLAY_LOAD_TIMEOUT",
        "The rewarded ad took too long to load."
    );
    activeTimeout.set(loadTimeout);
    mainHandler.postDelayed(loadTimeout, LOAD_TIMEOUT_MS);

    try {
      LevelPlayRewardedAd rewardedAd = new LevelPlayRewardedAd(adUnitId.trim());

      rewardedAd.setListener(new LevelPlayRewardedAdListener() {
        @Override
        public void onAdLoaded(LevelPlayAdInfo adInfo) {
          if (settled.get()) return;

          Runnable showCallbackTimeout = () -> finish(
              mainHandler,
              activeTimeout,
              settled,
              adOwner,
              true,
              callback,
              false,
              "LEVELPLAY_SHOW_TIMEOUT",
              "The rewarded ad did not finish in time."
          );
          activeTimeout.set(showCallbackTimeout);
          mainHandler.removeCallbacks(loadTimeout);
          // showAd has no cancellation API. Keep ownership until the SDK
          // confirms display failure/close or the full show timeout expires,
          // so a delayed ad cannot overlap a retry.
          mainHandler.postDelayed(showCallbackTimeout, SHOW_TIMEOUT_MS);

          activity.runOnUiThread(() -> {
            if (settled.get()) return;
            if (!isActivityUsable(activity)) {
              finish(
                  mainHandler,
                  activeTimeout,
                  settled,
                  adOwner,
                  true,
                  callback,
                  false,
                  "LEVELPLAY_NO_ACTIVITY",
                  "The Android screen is no longer active."
              );
              return;
            }

            try {
              rewardedAd.showAd(activity);
            } catch (RuntimeException showError) {
              finish(
                  mainHandler,
                  activeTimeout,
                  settled,
                  adOwner,
                  true,
                  callback,
                  false,
                  "LEVELPLAY_SHOW_EXCEPTION",
                  showError.getMessage()
              );
            }
          });
        }

        @Override
        public void onAdLoadFailed(LevelPlayAdError error) {
          if (settled.get()) return;
          mainHandler.removeCallbacks(loadTimeout);
          finish(
              mainHandler,
              activeTimeout,
              settled,
              adOwner,
              true,
              callback,
              false,
              levelPlayAdErrorCode("LEVELPLAY_LOAD_FAILED", error),
              error == null ? "No rewarded ad was returned." : error.getErrorMessage()
          );
        }

        @Override
        public void onAdDisplayed(LevelPlayAdInfo adInfo) {
          if (settled.get()) return;

          Runnable showTimeout = () -> finish(
              mainHandler,
              activeTimeout,
              settled,
              adOwner,
              true,
              callback,
              false,
              "LEVELPLAY_SHOW_TIMEOUT",
              "The rewarded ad did not finish in time."
          );
          Runnable previousTimeout = activeTimeout.getAndSet(showTimeout);
          if (previousTimeout != null) mainHandler.removeCallbacks(previousTimeout);
          mainHandler.postDelayed(showTimeout, SHOW_TIMEOUT_MS);
        }

        @Override
        public void onAdDisplayFailed(LevelPlayAdError error, LevelPlayAdInfo adInfo) {
          finish(
              mainHandler,
              activeTimeout,
              settled,
              adOwner,
              true,
              callback,
              false,
              levelPlayAdErrorCode("LEVELPLAY_SHOW_FAILED", error),
              error == null ? "The rewarded ad could not be shown." : error.getErrorMessage()
          );
        }

        @Override
        public void onAdRewarded(LevelPlayReward reward, LevelPlayAdInfo adInfo) {
          rewardEarned.set(true);
          Runnable grace = pendingRewardGrace.getAndSet(null);
          if (grace != null) {
            mainHandler.removeCallbacks(grace);
          }
          // Unity documents reward and close as asynchronous. The reward
          // callback is authoritative whether it arrives before or after close.
          finish(
              mainHandler,
              activeTimeout,
              settled,
              adOwner,
              grace != null,
              callback,
              true,
              null,
              null
          );
          if (grace == null && settled.get()) {
            // The reward promise can resolve before close. Preserve exclusivity
            // while the full-screen ad is present, but never wedge the process
            // if a mediated network omits its close callback.
            mainHandler.postDelayed(ownerReleaseTimeout, SHOW_TIMEOUT_MS);
          }
        }

        @Override
        public void onAdClicked(LevelPlayAdInfo adInfo) {}

        @Override
        public void onAdClosed(LevelPlayAdInfo adInfo) {
          mainHandler.removeCallbacks(ownerReleaseTimeout);
          if (settled.get()) {
            ACTIVE_AD_OWNER.compareAndSet(adOwner, null);
            return;
          }

          if (rewardEarned.get()) {
            finish(
                mainHandler,
                activeTimeout,
                settled,
                adOwner,
                true,
                callback,
                true,
                null,
                null
            );
            return;
          }

          Runnable graceSettle = () -> {
            pendingRewardGrace.set(null);
            finish(
                mainHandler,
                activeTimeout,
                settled,
                adOwner,
                true,
                callback,
                rewardEarned.get(),
                null,
                null
            );
          };
          pendingRewardGrace.set(graceSettle);
          Runnable previousTimeout = activeTimeout.getAndSet(graceSettle);
          if (previousTimeout != null) mainHandler.removeCallbacks(previousTimeout);
          mainHandler.postDelayed(graceSettle, REWARD_GRACE_MS);
        }

        @Override
        public void onAdInfoChanged(LevelPlayAdInfo adInfo) {}
      });

      rewardedAd.loadAd();
    } catch (RuntimeException loadError) {
      mainHandler.removeCallbacks(loadTimeout);
      finish(
          mainHandler,
          activeTimeout,
          settled,
          adOwner,
          true,
          callback,
          false,
          "LEVELPLAY_LOAD_EXCEPTION",
          loadError.getMessage()
      );
    }
  }

  private static boolean isActivityUsable(Activity activity) {
    if (activity == null || activity.isFinishing() || activity.isDestroyed()) return false;
    if (activity instanceof LifecycleOwner) {
      Lifecycle.State state = ((LifecycleOwner) activity).getLifecycle().getCurrentState();
      return state.isAtLeast(Lifecycle.State.RESUMED);
    }
    return activity.hasWindowFocus();
  }

  private static void finish(
      Handler mainHandler,
      AtomicReference<Runnable> activeTimeout,
      AtomicBoolean settled,
      Object adOwner,
      boolean releaseAdOwnership,
      RewardedCallback callback,
      boolean rewarded,
      String errorCode,
      String errorMessage
  ) {
    if (releaseAdOwnership) ACTIVE_AD_OWNER.compareAndSet(adOwner, null);
    if (!settled.compareAndSet(false, true)) return;

    Runnable timeout = activeTimeout.getAndSet(null);
    if (timeout != null) mainHandler.removeCallbacks(timeout);
    callback.onComplete(rewarded, errorCode, errorMessage);
  }

  private static String levelPlayInitErrorCode(String fallback, LevelPlayInitError error) {
    return error == null ? fallback : fallback + "_" + error.getErrorCode();
  }

  private static String levelPlayAdErrorCode(String fallback, LevelPlayAdError error) {
    return error == null ? fallback : fallback + "_" + error.getErrorCode();
  }
}
