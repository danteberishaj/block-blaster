import { Platform } from "react-native";
import RowflareUnityAds from "../../modules/unity-ads";
import type { HelperType } from "../game/helpers";

export type RewardedAdResult =
  | { status: "rewarded" }
  | { status: "skipped"; message: string }
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string };

const GAME_ID = process.env.EXPO_PUBLIC_UNITY_ANDROID_GAME_ID?.trim();
const REWARDED_PLACEMENT_ID =
  process.env.EXPO_PUBLIC_UNITY_ANDROID_REWARDED_PLACEMENT_ID?.trim();

let initializationPromise: Promise<boolean> | null = null;

export function canShowRewardedHelperAds(): boolean {
  return Boolean(
    Platform.OS === "android" &&
      RowflareUnityAds &&
      GAME_ID &&
      REWARDED_PLACEMENT_ID,
  );
}

async function initializeRewardedAds(): Promise<boolean> {
  const ads = RowflareUnityAds;
  if (!ads || !GAME_ID) return false;

  if (!initializationPromise) {
    initializationPromise = ads
      .configurePrivacyAsync(false, true, true)
      .then((privacyConfigured) => {
        if (!privacyConfigured) return false;
        return ads.initializeAsync(GAME_ID, __DEV__);
      })
      .then((initialized) => {
        if (!initialized) initializationPromise = null;
        return initialized;
      })
      .catch((error) => {
        initializationPromise = null;
        if (__DEV__)
          console.warn("Unity Ads privacy or initialization failed.", error);
        return false;
      });
  }

  return initializationPromise;
}

export async function showRewardedHelperAd(
  helper: HelperType,
): Promise<RewardedAdResult> {
  if (Platform.OS !== "android") {
    return {
      status: "unavailable",
      message: "Rewarded ads are available in the Android app.",
    };
  }

  if (!RowflareUnityAds) {
    return {
      status: "unavailable",
      message: "Rewarded ads need an Android development or release build.",
    };
  }

  if (!GAME_ID || !REWARDED_PLACEMENT_ID) {
    return {
      status: "unavailable",
      message: "Rewarded ads are not configured yet.",
    };
  }

  const initialized = await initializeRewardedAds();
  if (!initialized) {
    return {
      status: "error",
      message: "The ad service is unavailable right now. Please try again.",
    };
  }

  try {
    const rewarded = await RowflareUnityAds.showRewardedAsync(
      REWARDED_PLACEMENT_ID,
      `helper_${helper}`,
    );

    return rewarded
      ? { status: "rewarded" }
      : {
          status: "skipped",
          message: "Finish the ad to earn +1 helper use.",
        };
  } catch (error) {
    if (__DEV__) console.warn("Unity rewarded ad failed.", error);
    return {
      status: "error",
      message: "No ad is available right now. Please try again soon.",
    };
  }
}
