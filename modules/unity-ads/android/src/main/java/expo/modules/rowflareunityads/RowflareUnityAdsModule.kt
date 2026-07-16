package expo.modules.rowflareunityads

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RowflareUnityAdsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RowflareUnityAds")

    AsyncFunction("configurePrivacyAsync") {
        userConsent: Boolean,
        userOptOut: Boolean,
        nonBehavioral: Boolean ->
      RowflareUnityAdsClient.configurePrivacy(userConsent, userOptOut, nonBehavioral)
      true
    }

    AsyncFunction("initializeAsync") { gameId: String, testMode: Boolean, promise: Promise ->
      RowflareUnityAdsClient.initialize(gameId, testMode) { code, message ->
        if (code == null) promise.resolve(true)
        else promise.reject(code, message, null)
      }
    }

    AsyncFunction("showRewardedAsync") {
        placementId: String,
        rewardKey: String,
        promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("UNITY_ADS_NO_ACTIVITY", "No active Android screen is available.", null)
        return@AsyncFunction
      }

      RowflareUnityAdsClient.showRewarded(
        activity,
        placementId,
        rewardKey
      ) { rewarded, code, message ->
        if (code == null) promise.resolve(rewarded)
        else promise.reject(code, message, null)
      }
    }
  }
}
