import { Platform } from "react-native";
import RowflareUnityAds from "../../modules/unity-ads";
import { createRewardedAdsCore } from "./rewardedAdsCore";

export type { RewardedAdResult } from "./rewardedAdsCore";

const core = createRewardedAdsCore({
  platformOS: Platform.OS,
  nativeModule: RowflareUnityAds,
  gameId: process.env.EXPO_PUBLIC_UNITY_ANDROID_GAME_ID,
  rewardedPlacementId: process.env.EXPO_PUBLIC_UNITY_ANDROID_REWARDED_PLACEMENT_ID,
  isDev: __DEV__,
});

export function canShowRewardedHelperAds(): boolean {
  return core.canShowRewardedHelperAds();
}

export const showRewardedHelperAd = core.showRewardedHelperAd;
