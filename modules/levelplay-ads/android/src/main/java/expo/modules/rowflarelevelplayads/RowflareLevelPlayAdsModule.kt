package expo.modules.rowflarelevelplayads

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RowflareLevelPlayAdsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RowflareLevelPlayAds")

    AsyncFunction("configurePrivacyAsync") {
        userConsent: Boolean,
        userOptOut: Boolean,
        nonBehavioral: Boolean ->
      RowflareLevelPlayAdsClient.configurePrivacy(userConsent, userOptOut, nonBehavioral)
      true
    }

    AsyncFunction("initializeAsync") { appKey: String, testMode: Boolean, promise: Promise ->
      val context = appContext.reactContext?.applicationContext
      if (context == null) {
        promise.reject("LEVELPLAY_NO_CONTEXT", "No Android context is available.", null)
        return@AsyncFunction
      }

      RowflareLevelPlayAdsClient.initialize(context, appKey, testMode) { code, message ->
        if (code == null) promise.resolve(true)
        else promise.reject(code, message, null)
      }
    }

    AsyncFunction("showRewardedAsync") {
        adUnitId: String,
        rewardKey: String,
        promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("LEVELPLAY_NO_ACTIVITY", "No active Android screen is available.", null)
        return@AsyncFunction
      }

      RowflareLevelPlayAdsClient.showRewarded(
        activity,
        adUnitId,
        rewardKey
      ) { rewarded, code, message ->
        if (code == null) promise.resolve(rewarded)
        else promise.reject(code, message, null)
      }
    }
  }
}
