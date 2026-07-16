import { requireOptionalNativeModule } from "expo";

export interface RowflareUnityAdsNativeModule {
  configurePrivacyAsync(
    userConsent: boolean,
    userOptOut: boolean,
    nonBehavioral: boolean,
  ): Promise<boolean>;
  initializeAsync(gameId: string, testMode: boolean): Promise<boolean>;
  showRewardedAsync(placementId: string, rewardKey: string): Promise<boolean>;
}

export default requireOptionalNativeModule<RowflareUnityAdsNativeModule>(
  "RowflareUnityAds",
);
