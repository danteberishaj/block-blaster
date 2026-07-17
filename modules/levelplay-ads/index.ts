import { requireOptionalNativeModule } from "expo";

export interface RowflareLevelPlayAdsNativeModule {
  configurePrivacyAsync(
    userConsent: boolean,
    userOptOut: boolean,
    nonBehavioral: boolean,
  ): Promise<boolean>;
  initializeAsync(appKey: string, testMode: boolean): Promise<boolean>;
  showRewardedAsync(adUnitId: string, rewardKey: string): Promise<boolean>;
}

export default requireOptionalNativeModule<RowflareLevelPlayAdsNativeModule>(
  "RowflareLevelPlayAds",
);
