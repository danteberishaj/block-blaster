package com.blockblast.game

import android.app.Activity
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.unity3d.ads.IUnityAdsInitializationListener
import com.unity3d.ads.IUnityAdsLoadListener
import com.unity3d.ads.IUnityAdsShowListener
import com.unity3d.ads.UnityAds
import com.unity3d.ads.UnityAdsShowOptions

class UnityAdsModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val TAG = "BlockBlastUnityAds"
  }

  private var initialized = false

  override fun getName(): String = "UnityAdsBridge"

  @ReactMethod
  fun initialize(gameId: String, testMode: Boolean, promise: Promise) {
    if (initialized || UnityAds.isInitialized) {
      Log.i(TAG, "initialize() skipped; already initialized. gameId=$gameId")
      initialized = true
      promise.resolve(true)
      return
    }

    Log.i(TAG, "initialize() gameId=$gameId testMode=$testMode")

    UnityAds.initialize(
      reactContext.applicationContext,
      gameId,
      testMode,
      object : IUnityAdsInitializationListener {
        override fun onInitializationComplete() {
          Log.i(TAG, "onInitializationComplete()")
          initialized = true
          promise.resolve(true)
        }

        override fun onInitializationFailed(
          error: UnityAds.UnityAdsInitializationError,
          message: String
        ) {
          Log.e(TAG, "onInitializationFailed() error=$error message=$message")
          initialized = false
          promise.reject("UNITY_ADS_INIT_FAILED", "[$error] $message")
        }
      }
    )
  }

  @ReactMethod
  fun isInitialized(promise: Promise) {
    Log.d(TAG, "isInitialized() -> ${initialized || UnityAds.isInitialized}")
    promise.resolve(initialized || UnityAds.isInitialized)
  }

  @ReactMethod
  fun showInterstitial(placementId: String, promise: Promise) {
    showAd(placementId, false, promise)
  }

  @ReactMethod
  fun showRewarded(placementId: String, promise: Promise) {
    showAd(placementId, true, promise)
  }

  private fun showAd(placementId: String, rewarded: Boolean, promise: Promise) {
    if (!initialized && !UnityAds.isInitialized) {
      Log.e(TAG, "showAd() rejected; SDK not initialized. placementId=$placementId rewarded=$rewarded")
      promise.reject("UNITY_ADS_NOT_INITIALIZED", "Unity Ads is not initialized.")
      return
    }

    val activity: Activity? = getCurrentActivity()
    if (activity == null) {
      Log.e(TAG, "showAd() rejected; no current activity. placementId=$placementId rewarded=$rewarded")
      promise.reject("UNITY_ADS_NO_ACTIVITY", "No current Android activity.")
      return
    }

    Log.i(TAG, "load() placementId=$placementId rewarded=$rewarded activity=${activity.localClassName}")
    UnityAds.load(
      placementId,
      object : IUnityAdsLoadListener {
        override fun onUnityAdsAdLoaded(loadedPlacementId: String) {
          Log.i(TAG, "onUnityAdsAdLoaded() placementId=$loadedPlacementId rewarded=$rewarded")
          activity.runOnUiThread {
            Log.i(TAG, "show() placementId=$loadedPlacementId rewarded=$rewarded")
            UnityAds.show(
              activity,
              loadedPlacementId,
              UnityAdsShowOptions(),
              object : IUnityAdsShowListener {
                override fun onUnityAdsShowFailure(
                  failedPlacementId: String,
                  error: UnityAds.UnityAdsShowError,
                  message: String
                ) {
                  Log.e(
                    TAG,
                    "onUnityAdsShowFailure() placementId=$failedPlacementId rewarded=$rewarded error=$error message=$message"
                  )
                  promise.reject(
                    "UNITY_ADS_SHOW_FAILED",
                    "placementId=$failedPlacementId rewarded=$rewarded [$error] $message"
                  )
                }

                override fun onUnityAdsShowStart(startedPlacementId: String) {
                  Log.i(TAG, "onUnityAdsShowStart() placementId=$startedPlacementId rewarded=$rewarded")
                }

                override fun onUnityAdsShowClick(clickedPlacementId: String) {
                  Log.i(TAG, "onUnityAdsShowClick() placementId=$clickedPlacementId rewarded=$rewarded")
                }

                override fun onUnityAdsShowComplete(
                  completedPlacementId: String,
                  state: UnityAds.UnityAdsShowCompletionState
                ) {
                  Log.i(
                    TAG,
                    "onUnityAdsShowComplete() placementId=$completedPlacementId rewarded=$rewarded state=$state"
                  )
                  if (!rewarded) {
                    promise.resolve(true)
                    return
                  }

                  promise.resolve(state == UnityAds.UnityAdsShowCompletionState.COMPLETED)
                }
              }
            )
          }
        }

        override fun onUnityAdsFailedToLoad(
          failedPlacementId: String,
          error: UnityAds.UnityAdsLoadError,
          message: String
        ) {
          Log.e(
            TAG,
            "onUnityAdsFailedToLoad() placementId=$failedPlacementId rewarded=$rewarded error=$error message=$message"
          )
          promise.reject(
            "UNITY_ADS_LOAD_FAILED",
            "placementId=$failedPlacementId rewarded=$rewarded [$error] $message"
          )
        }
      }
    )
  }
}
