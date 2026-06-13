import AsyncStorage from '@react-native-async-storage/async-storage';

const HIGH_SCORE_KEY = '@block_blaster/high_score';
const TUTORIAL_KEY = '@block_blaster/tutorial_seen';

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
