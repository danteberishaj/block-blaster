import AsyncStorage from '@react-native-async-storage/async-storage';

const HIGH_SCORE_KEY = '@block_blaster/high_score';
const TUTORIAL_KEY = '@block_blaster/tutorial_seen';
const SOUND_KEY = '@block_blaster/sound_on';

export async function getHighScore(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(HIGH_SCORE_KEY);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function saveHighScore(score: number): Promise<void> {
  try {
    await AsyncStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // best-effort; ignore write failures
  }
}

export async function hasSeenTutorial(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(TUTORIAL_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markTutorialSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_KEY, '1');
  } catch {
    // ignore
  }
}

export async function getSoundOn(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(SOUND_KEY);
    return v === null ? true : v === '1'; // default on
  } catch {
    return true;
  }
}

export async function saveSoundOn(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SOUND_KEY, on ? '1' : '0');
  } catch {
    // ignore
  }
}
