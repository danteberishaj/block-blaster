import { requireOptionalNativeModule } from "expo";

export interface RowflareLevelPlayAdsNativeModule {
  // Opt-in privacy declarations for a future consent-management flow.
  // Initialization no longer requires this; a CMP may call it explicitly.
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
