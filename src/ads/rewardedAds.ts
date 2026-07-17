import { Platform } from "react-native";
import RowflareLevelPlayAds from "../../modules/levelplay-ads";
import { createRewardedAdsCore } from "./rewardedAdsCore";

export type { RewardedAdResult } from "./rewardedAdsCore";

const core = createRewardedAdsCore({
  platformOS: Platform.OS,
  nativeModule: RowflareLevelPlayAds,
  appKey: process.env.EXPO_PUBLIC_LEVELPLAY_ANDROID_APP_KEY,
  rewardedAdUnitId: process.env.EXPO_PUBLIC_LEVELPLAY_ANDROID_REWARDED_AD_UNIT_ID,
  isDev: __DEV__,
});

export function canShowRewardedHelperAds(): boolean {
  return core.canShowRewardedHelperAds();
}

export const showRewardedHelperAd = core.showRewardedHelperAd;
