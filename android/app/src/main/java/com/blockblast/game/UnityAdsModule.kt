package com.blockblast.game

import android.app.Activity
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

  private var initialized = false

  override fun getName(): String = "UnityAdsBridge"

  @ReactMethod
  fun initialize(gameId: String, testMode: Boolean, promise: Promise) {
    if (initialized || UnityAds.isInitialized()) {
      initialized = true
      promise.resolve(true)
      return
    }

    UnityAds.initialize(
      reactContext.applicationContext,
      gameId,
      testMode,
      object : IUnityAdsInitializationListener {
        override fun onInitializationComplete() {
          initialized = true
          promise.resolve(true)
        }

        override fun onInitializationFailed(
          error: UnityAds.UnityAdsInitializationError,
          message: String
        ) {
          initialized = false
          promise.reject("UNITY_ADS_INIT_FAILED", "[$error] $message")
        }
      }
    )
  }

  @ReactMethod
  fun isInitialized(promise: Promise) {
    promise.resolve(initialized || UnityAds.isInitialized())
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
    if (!initialized && !UnityAds.isInitialized()) {
      promise.reject("UNITY_ADS_NOT_INITIALIZED", "Unity Ads is not initialized.")
      return
    }

    val activity: Activity? = getCurrentActivity()
    if (activity == null) {
      promise.reject("UNITY_ADS_NO_ACTIVITY", "No current Android activity.")
      return
    }

    UnityAds.load(
      placementId,
      object : IUnityAdsLoadListener {
        override fun onUnityAdsAdLoaded(loadedPlacementId: String) {
          activity.runOnUiThread {
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
                  promise.reject("UNITY_ADS_SHOW_FAILED", "[$error] $message")
                }

                override fun onUnityAdsShowStart(startedPlacementId: String) = Unit

                override fun onUnityAdsShowClick(clickedPlacementId: String) = Unit

                override fun onUnityAdsShowComplete(
                  completedPlacementId: String,
                  state: UnityAds.UnityAdsShowCompletionState
                ) {
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
          promise.reject("UNITY_ADS_LOAD_FAILED", "[$error] $message")
        }
      }
    )
  }
}
