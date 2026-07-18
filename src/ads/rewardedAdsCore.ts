import type { HelperType } from "../game/helpers";

export type RewardedAdResult =
  | { status: "rewarded" }
  | { status: "skipped"; message: string }
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string };

export interface RewardedAdsNativeModule {
  // Opt-in privacy declarations for a future consent-management flow. Rowflare
  // makes no privacy declarations by default, so initialization does not call
  // this; a CMP can invoke it explicitly to set GDPR/CCPA/device-id opt-out.
  configurePrivacyAsync(
    userConsent: boolean,
    userOptOut: boolean,
    nonBehavioral: boolean,
  ): Promise<boolean>;
  initializeAsync(appKey: string, testMode: boolean): Promise<boolean>;
  showRewardedAsync(adUnitId: string, rewardKey: string): Promise<boolean>;
}

export interface RewardedAdsEnv {
  platformOS: string;
  nativeModule: RewardedAdsNativeModule | null | undefined;
  appKey: string | undefined;
  rewardedAdUnitId: string | undefined;
  isDev: boolean;
}

export interface RewardedAdsCore {
  canShowRewardedHelperAds(): boolean;
  showRewardedHelperAd(helper: HelperType): Promise<RewardedAdResult>;
}

export function createRewardedAdsCore(env: RewardedAdsEnv): RewardedAdsCore {
  const { platformOS, nativeModule, isDev } = env;
  const appKey = env.appKey?.trim();
  const rewardedAdUnitId = env.rewardedAdUnitId?.trim();

  let initializationPromise: Promise<boolean> | null = null;

  function canShowRewardedHelperAds(): boolean {
    return Boolean(
      platformOS === "android" &&
        nativeModule &&
        appKey &&
        rewardedAdUnitId,
    );
  }

  async function initializeRewardedAds(): Promise<boolean> {
    const ads = nativeModule;
    if (!ads || !appKey) return false;

    if (!initializationPromise) {
      // Rowflare makes no privacy declarations by default. Initialization goes
      // straight to initializeAsync; a future CMP may call configurePrivacyAsync
      // explicitly before this runs.
      initializationPromise = ads
        .initializeAsync(appKey, isDev)
        .then((initialized) => {
          if (!initialized) initializationPromise = null;
          return initialized;
        })
        .catch((error) => {
          initializationPromise = null;
          if (isDev) console.warn("LevelPlay initialization failed.", error);
          return false;
        });
    }

    return initializationPromise;
  }

  async function showRewardedHelperAd(
    helper: HelperType,
  ): Promise<RewardedAdResult> {
    if (platformOS !== "android") {
      return {
        status: "unavailable",
        message: "Rewarded ads are available in the Android app.",
      };
    }

    if (!nativeModule) {
      return {
        status: "unavailable",
        message: "Rewarded ads need an Android development or release build.",
      };
    }

    if (!appKey || !rewardedAdUnitId) {
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
      const rewarded = await nativeModule.showRewardedAsync(
        rewardedAdUnitId,
        `helper_${helper}`,
      );

      return rewarded
        ? { status: "rewarded" }
        : {
            status: "skipped",
            message: "Finish the ad to earn +1 helper use.",
          };
    } catch (error) {
      if (isDev) console.warn("LevelPlay rewarded ad failed.", error);
      return {
        status: "error",
        message: "No ad is available right now. Please try again soon.",
      };
    }
  }

  return { canShowRewardedHelperAds, showRewardedHelperAd };
}
