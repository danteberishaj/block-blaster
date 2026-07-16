import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseSavedRunState, type SavedRunState } from "../game/runState";

const PREFIX = "@rowflare";
const HIGH_SCORE_KEY = `${PREFIX}/high_score`;
const BEST_CHAIN_KEY = `${PREFIX}/best_chain`;
const TUTORIAL_KEY = `${PREFIX}/tutorial_seen`;
const SOUND_KEY = `${PREFIX}/sound_on`;
const INTRO_KEY = `${PREFIX}/intro_seen`;
const RUN_KEY = `${PREFIX}/run_v1`;

const LEGACY_HIGH_SCORE_KEY = "@block_blaster/high_score";
const LEGACY_BEST_CHAIN_KEY = "@block_blaster/best_chain";
const LEGACY_TUTORIAL_KEY = "@block_blaster/tutorial_seen";
const LEGACY_SOUND_KEY = "@block_blaster/sound_on";

let highScoreWriteQueue: Promise<void> = Promise.resolve();
let bestChainWriteQueue: Promise<void> = Promise.resolve();
let runWriteQueue: Promise<void> = Promise.resolve();

function parseRecord(value: string | null): number {
  return value ? parseInt(value, 10) || 0 : 0;
}

function reportStorageError(operation: string, error: unknown): void {
  console.error(`[Rowflare storage] ${operation} failed.`, error);
}

async function readWithLegacy(
  key: string,
  legacyKey: string,
): Promise<string | null> {
  const current = await AsyncStorage.getItem(key);
  if (current !== null) return current;

  const legacy = await AsyncStorage.getItem(legacyKey);
  if (legacy !== null) await AsyncStorage.setItem(key, legacy);
  return legacy;
}

export async function getHighScore(): Promise<number> {
  try {
    await highScoreWriteQueue;
    return parseRecord(
      await readWithLegacy(HIGH_SCORE_KEY, LEGACY_HIGH_SCORE_KEY),
    );
  } catch (error) {
    reportStorageError("read high score", error);
    return 0;
  }
}

export function saveHighScore(score: number): Promise<void> {
  highScoreWriteQueue = highScoreWriteQueue.then(async () => {
    try {
      const current = parseRecord(await AsyncStorage.getItem(HIGH_SCORE_KEY));
      if (score > current)
        await AsyncStorage.setItem(HIGH_SCORE_KEY, String(score));
    } catch (error) {
      reportStorageError("save high score", error);
    }
  });
  return highScoreWriteQueue;
}

export async function getBestChain(): Promise<number> {
  try {
    await bestChainWriteQueue;
    return parseRecord(
      await readWithLegacy(BEST_CHAIN_KEY, LEGACY_BEST_CHAIN_KEY),
    );
  } catch (error) {
    reportStorageError("read best chain", error);
    return 0;
  }
}

export function saveBestChain(chain: number): Promise<void> {
  bestChainWriteQueue = bestChainWriteQueue.then(async () => {
    try {
      const current = parseRecord(await AsyncStorage.getItem(BEST_CHAIN_KEY));
      if (chain > current)
        await AsyncStorage.setItem(BEST_CHAIN_KEY, String(chain));
    } catch (error) {
      reportStorageError("save best chain", error);
    }
  });
  return bestChainWriteQueue;
}

export async function hasSeenTutorial(): Promise<boolean> {
  try {
    return (await readWithLegacy(TUTORIAL_KEY, LEGACY_TUTORIAL_KEY)) === "1";
  } catch (error) {
    reportStorageError("read tutorial state", error);
    return false;
  }
}

export async function markTutorialSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_KEY, "1");
  } catch (error) {
    reportStorageError("save tutorial state", error);
  }
}

export async function hasSeenIntro(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(INTRO_KEY)) === "1";
  } catch (error) {
    reportStorageError("read intro state", error);
    return false;
  }
}

export async function markIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(INTRO_KEY, "1");
  } catch (error) {
    reportStorageError("save intro state", error);
  }
}

export async function getSoundOn(): Promise<boolean> {
  try {
    const value = await readWithLegacy(SOUND_KEY, LEGACY_SOUND_KEY);
    return value === null ? true : value === "1";
  } catch (error) {
    reportStorageError("read sound state", error);
    return true;
  }
}

export async function saveSoundOn(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SOUND_KEY, on ? "1" : "0");
  } catch (error) {
    reportStorageError("save sound state", error);
  }
}

export async function getSavedRun(): Promise<SavedRunState | null> {
  try {
    await runWriteQueue;
    const raw = await AsyncStorage.getItem(RUN_KEY);
    if (!raw) return null;

    const parsed = parseSavedRunState(JSON.parse(raw));
    if (!parsed) {
      await AsyncStorage.removeItem(RUN_KEY);
      return null;
    }
    return parsed;
  } catch (error) {
    reportStorageError("read saved run", error);
    return null;
  }
}

export function saveRun(run: SavedRunState): Promise<void> {
  runWriteQueue = runWriteQueue.then(async () => {
    try {
      await AsyncStorage.setItem(RUN_KEY, JSON.stringify(run));
    } catch (error) {
      reportStorageError("save run", error);
    }
  });
  return runWriteQueue;
}

export async function hasSavedRun(): Promise<boolean> {
  return (await getSavedRun()) !== null;
}

export function clearSavedRun(): Promise<void> {
  runWriteQueue = runWriteQueue.then(async () => {
    try {
      await AsyncStorage.removeItem(RUN_KEY);
    } catch (error) {
      reportStorageError("clear run", error);
    }
  });
  return runWriteQueue;
}
