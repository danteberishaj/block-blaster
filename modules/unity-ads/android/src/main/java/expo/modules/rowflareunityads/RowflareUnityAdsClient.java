package expo.modules.rowflareunityads;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;

import androidx.lifecycle.Lifecycle;
import androidx.lifecycle.LifecycleOwner;

import com.unity3d.ads.InitializationConfiguration;
import com.unity3d.ads.InitializationListener;
import com.unity3d.ads.LoadConfiguration;
import com.unity3d.ads.RewardedAd;
import com.unity3d.ads.RewardedShowListener;
import com.unity3d.ads.ShowConfiguration;
import com.unity3d.ads.ShowFinishState;
import com.unity3d.ads.UnityAds;
import com.unity3d.ads.UnityAdsError;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import kotlin.OptIn;

@OptIn(markerClass = com.unity3d.ads.UnityAdsExperimental.class)
public final class RowflareUnityAdsClient {
  private static final long INITIALIZATION_TIMEOUT_MS = 15_000L;
  private static final long LOAD_TIMEOUT_MS = 20_000L;
  private static final long SHOW_HANDOFF_TIMEOUT_MS = 10_000L;
  private static final long SHOW_TIMEOUT_MS = 5 * 60_000L;
  private static final Object INITIALIZATION_LOCK = new Object();
  private static final AtomicReference<Object> ACTIVE_AD_OWNER = new AtomicReference<>();
  private static final List<InitializationCallback> INITIALIZATION_CALLBACKS = new ArrayList<>();

  private static boolean privacyConfigured = false;
  private static boolean initialized = false;
  private static boolean initializing = false;
  private static int initializationAttempt = 0;

  private RowflareUnityAdsClient() {}

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
    UnityAds.setUserConsent(userConsent);
    UnityAds.setUserOptOut(userOptOut);
    UnityAds.setNonBehavioral(nonBehavioral);
    privacyConfigured = true;
  }

  public static void initialize(
      String gameId,
      boolean testMode,
      InitializationCallback callback
  ) {
    if (!privacyConfigured) {
      callback.onComplete(
          "UNITY_ADS_PRIVACY_NOT_CONFIGURED",
          "Unity Ads privacy settings must be configured before initialization."
      );
      return;
    }
    if (gameId == null || gameId.trim().isEmpty()) {
      callback.onComplete("UNITY_ADS_MISSING_GAME_ID", "Unity Ads Game ID is missing.");
      return;
    }

    final int attempt;
    synchronized (INITIALIZATION_LOCK) {
      if (initialized) {
        callback.onComplete(null, null);
        return;
      }

      INITIALIZATION_CALLBACKS.add(callback);
      if (initializing) return;

      initializing = true;
      attempt = ++initializationAttempt;
    }

    Handler mainHandler = new Handler(Looper.getMainLooper());
    Runnable initializationTimeout = () -> completeInitialization(
        attempt,
        false,
        "UNITY_ADS_INIT_TIMEOUT",
        "Unity Ads took too long to initialize."
    );
    mainHandler.postDelayed(initializationTimeout, INITIALIZATION_TIMEOUT_MS);

    InitializationConfiguration configuration =
        new InitializationConfiguration.Builder(gameId.trim())
            .withTestMode(testMode)
            .build();

    InitializationListener listener = error -> {
      mainHandler.removeCallbacks(initializationTimeout);
      completeInitialization(
          attempt,
          error == null,
          error == null ? null : unityErrorCode("UNITY_ADS_INIT_FAILED", error),
          error == null ? null : error.getMessage()
      );
    };

    try {
      UnityAds.initialize(configuration, listener);
    } catch (RuntimeException error) {
      mainHandler.removeCallbacks(initializationTimeout);
      completeInitialization(
          attempt,
          false,
          "UNITY_ADS_INIT_EXCEPTION",
          error.getMessage()
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
        if (success) initialized = true;
        return;
      }

      initialized = success;
      initializing = false;
      callbacks = new ArrayList<>(INITIALIZATION_CALLBACKS);
      INITIALIZATION_CALLBACKS.clear();
    }

    for (InitializationCallback pendingCallback : callbacks) {
      pendingCallback.onComplete(errorCode, errorMessage);
    }
  }

  public static void showRewarded(
      Activity activity,
      String placementId,
      String rewardKey,
      RewardedCallback callback
  ) {
    if (!initialized) {
      callback.onComplete(false, "UNITY_ADS_NOT_INITIALIZED", "Unity Ads is not initialized.");
      return;
    }
    if (placementId == null || placementId.trim().isEmpty()) {
      callback.onComplete(false, "UNITY_ADS_MISSING_PLACEMENT", "Rewarded placement ID is missing.");
      return;
    }
    if (!isActivityUsable(activity)) {
      callback.onComplete(false, "UNITY_ADS_NO_ACTIVITY", "The Android screen is no longer active.");
      return;
    }
    Object adOwner = new Object();
    if (!ACTIVE_AD_OWNER.compareAndSet(null, adOwner)) {
      callback.onComplete(false, "UNITY_ADS_BUSY", "Another ad is already loading or showing.");
      return;
    }

    AtomicBoolean settled = new AtomicBoolean(false);
    AtomicBoolean rewardEarned = new AtomicBoolean(false);
    Handler mainHandler = new Handler(Looper.getMainLooper());
    AtomicReference<Runnable> activeTimeout = new AtomicReference<>();

    Runnable loadTimeout = () -> finish(
        mainHandler,
        activeTimeout,
        settled,
        adOwner,
        true,
        callback,
        false,
        "UNITY_ADS_LOAD_TIMEOUT",
        "The rewarded ad took too long to load."
    );
    activeTimeout.set(loadTimeout);
    mainHandler.postDelayed(loadTimeout, LOAD_TIMEOUT_MS);

    try {
      LoadConfiguration loadConfiguration =
          new LoadConfiguration.Builder(placementId.trim()).build();

      RewardedAd.load(loadConfiguration, (rewardedAd, error) -> {
        if (settled.get()) return;

        if (error != null || rewardedAd == null) {
          mainHandler.removeCallbacks(loadTimeout);
          finish(
              mainHandler,
              activeTimeout,
              settled,
              adOwner,
              true,
              callback,
              false,
              unityErrorCode("UNITY_ADS_LOAD_FAILED", error),
              error == null ? "No rewarded ad was returned." : error.getMessage()
          );
          return;
        }

        Runnable handoffTimeout = () -> finish(
            mainHandler,
            activeTimeout,
            settled,
            adOwner,
            true,
            callback,
            false,
            "UNITY_ADS_SHOW_HANDOFF_TIMEOUT",
            "The rewarded ad could not start in time."
        );
        activeTimeout.set(handoffTimeout);
        mainHandler.removeCallbacks(loadTimeout);
        mainHandler.postDelayed(handoffTimeout, SHOW_HANDOFF_TIMEOUT_MS);

        try {
          ShowConfiguration showConfiguration = new ShowConfiguration.Builder()
              .withCustomRewardString(rewardKey == null ? "helper" : rewardKey)
              .build();

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
                  "UNITY_ADS_NO_ACTIVITY",
                  "The Android screen is no longer active."
              );
              return;
            }

            Runnable showTimeout = () -> finish(
                mainHandler,
                activeTimeout,
                settled,
                adOwner,
                false,
                callback,
                false,
                "UNITY_ADS_SHOW_TIMEOUT",
                "The rewarded ad did not finish in time."
            );
            activeTimeout.set(showTimeout);
            mainHandler.removeCallbacks(handoffTimeout);
            mainHandler.postDelayed(showTimeout, SHOW_TIMEOUT_MS);

            try {
              rewardedAd.show(
                  activity,
                  showConfiguration,
                  new RewardedShowListener() {
                    @Override
                    public void onStarted(RewardedAd ad) {}

                    @Override
                    public void onClicked(RewardedAd ad) {}

                    @Override
                    public void onRewarded(RewardedAd ad) {
                      rewardEarned.set(true);
                    }

                    @Override
                    public void onCompleted(RewardedAd ad, ShowFinishState state) {
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
                    }

                    @Override
                    public void onFailed(RewardedAd ad, UnityAdsError showError) {
                      finish(
                          mainHandler,
                          activeTimeout,
                          settled,
                          adOwner,
                          true,
                          callback,
                          false,
                          unityErrorCode("UNITY_ADS_SHOW_FAILED", showError),
                          showError == null
                              ? "The rewarded ad could not be shown."
                              : showError.getMessage()
                      );
                    }
                  }
              );
            } catch (RuntimeException showError) {
              finish(
                  mainHandler,
                  activeTimeout,
                  settled,
                  adOwner,
                  true,
                  callback,
                  false,
                  "UNITY_ADS_SHOW_EXCEPTION",
                  showError.getMessage()
              );
            }
          });
        } catch (RuntimeException handoffError) {
          finish(
              mainHandler,
              activeTimeout,
              settled,
              adOwner,
              true,
              callback,
              false,
              "UNITY_ADS_SHOW_HANDOFF_EXCEPTION",
              handoffError.getMessage()
          );
        }
      });
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
          "UNITY_ADS_LOAD_EXCEPTION",
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

  private static String unityErrorCode(String fallback, UnityAdsError error) {
    return error == null ? fallback : fallback + "_" + error.getCode();
  }
}
