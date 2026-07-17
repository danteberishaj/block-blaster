import AsyncStorage from "@react-native-async-storage/async-storage";
import { createStorageCore } from "./storageCore";

const core = createStorageCore({
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
});

export const getHighScore = core.getHighScore;
export const saveHighScore = core.saveHighScore;
export const getBestChain = core.getBestChain;
export const saveBestChain = core.saveBestChain;
export const hasSeenTutorial = core.hasSeenTutorial;
export const markTutorialSeen = core.markTutorialSeen;
export const hasSeenIntro = core.hasSeenIntro;
export const markIntroSeen = core.markIntroSeen;
export const getSoundOn = core.getSoundOn;
export const saveSoundOn = core.saveSoundOn;
export const getSavedRun = core.getSavedRun;
export const saveRun = core.saveRun;
export const hasSavedRun = core.hasSavedRun;
export const clearSavedRun = core.clearSavedRun;
