import { NativeModules, Platform } from 'react-native';

const ANDROID_GAME_ID = '800006066';
const ANDROID_REWARDED_PLACEMENT_ID = 'Rewarded_Android';
const ANDROID_INTERSTITIAL_PLACEMENT_ID = 'Interstitial_Android';

type UnityAdsBridge = {
  initialize(gameId: string, testMode: boolean): Promise<boolean>;
  isInitialized(): Promise<boolean>;
  showRewarded(placementId: string): Promise<boolean>;
  showInterstitial(placementId: string): Promise<boolean>;
};

const bridge = NativeModules.UnityAdsBridge as UnityAdsBridge | undefined;

let initPromise: Promise<boolean> | null = null;

export function initializeUnityAds(): Promise<boolean> {
  if (Platform.OS !== 'android' || !bridge) return Promise.resolve(false);

  if (!initPromise) {
    initPromise = bridge
      .initialize(ANDROID_GAME_ID, __DEV__)
      .catch((error) => {
        initPromise = null;
        console.warn('Unity Ads initialization failed', error);
        return false;
      });
  }

  return initPromise;
}

export async function showRewardedReviveAd(): Promise<boolean> {
  if (Platform.OS !== 'android' || !bridge) return true;

  const initialized = await initializeUnityAds();
  if (!initialized) return true;

  try {
    return await bridge.showRewarded(ANDROID_REWARDED_PLACEMENT_ID);
  } catch (error) {
    console.warn('Unity rewarded ad failed', error);
    return true;
  }
}

export async function showGameOverInterstitial(): Promise<boolean> {
  if (Platform.OS !== 'android' || !bridge) return true;

  const initialized = await initializeUnityAds();
  if (!initialized) return true;

  try {
    return await bridge.showInterstitial(ANDROID_INTERSTITIAL_PLACEMENT_ID);
  } catch (error) {
    console.warn('Unity interstitial ad failed', error);
    return false;
  }
}
