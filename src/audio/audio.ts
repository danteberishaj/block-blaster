import { Platform } from "react-native";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { getSoundOn, saveSoundOn } from "../storage/storage";

const MUSIC_VOLUME = 0.32; // subtle background level

let music: AudioPlayer | null = null;
let clear: AudioPlayer | null = null;
let crossBlast: AudioPlayer | null = null;
let soundOn = true;
let initialized = false;
const audioPlaybackSupported = Platform.OS !== "web";
let appIsActive = true;
let adIsActive = false;
let soundPreferenceVersion = 0;
const soundStateListeners = new Set<(enabled: boolean) => void>();

function notifySoundState(): void {
  for (const listener of soundStateListeners) listener(soundOn);
}

function reportAudioError(operation: string, error: unknown): void {
  console.error(`[Rowflare audio] ${operation} failed.`, error);
}

function syncMusicPlayback(): void {
  if (!audioPlaybackSupported || !music) return;

  try {
    if (soundOn && appIsActive && !adIsActive) music.play();
    else music.pause();
  } catch (error) {
    reportAudioError("sync music", error);
  }
}

/** Create the players and start the loop (once). Safe to call repeatedly. */
export async function initAudio(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const preferenceVersionAtLoad = soundPreferenceVersion;
  const savedSoundOn = await getSoundOn();
  if (soundPreferenceVersion === preferenceVersionAtLoad) {
    soundOn = savedSoundOn;
    notifySoundState();
  }

  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
  } catch (error) {
    reportAudioError("configure audio mode", error);
  }

  try {
    music = createAudioPlayer(require("../../assets/audio/music.wav"));
    music.loop = true;
    music.volume = MUSIC_VOLUME;

    clear = createAudioPlayer(require("../../assets/audio/clear.wav"));
    clear.volume = 0.9;

    crossBlast = createAudioPlayer(require("../../assets/audio/cross.wav"));
    crossBlast.volume = 0.95;

    syncMusicPlayback();
  } catch (error) {
    reportAudioError("initialize players", error);
  }
}

export function isAudioPlaybackSupported(): boolean {
  return audioPlaybackSupported;
}

export function isSoundOn(): boolean {
  return soundOn;
}

export function subscribeToSoundState(
  listener: (enabled: boolean) => void,
): () => void {
  soundStateListeners.add(listener);
  listener(soundOn);
  return () => soundStateListeners.delete(listener);
}

/** Toggle music + SFX on/off, persist, and return the new state. */
export function toggleSound(): boolean {
  soundOn = !soundOn;
  soundPreferenceVersion += 1;
  notifySoundState();
  saveSoundOn(soundOn);
  syncMusicPlayback();
  return soundOn;
}

/** Keep app audio out of the way while a full-screen rewarded ad is active. */
export function pauseAudioForAd(): void {
  adIsActive = true;
  syncMusicPlayback();
}

/** Resume only when the player still has sound enabled. */
export function resumeAudioAfterAd(): void {
  adIsActive = false;
  syncMusicPlayback();
}

export function setAppAudioActive(active: boolean): void {
  appIsActive = active;
  syncMusicPlayback();
}

/** Play the line-clear chime (restarts it if already playing). */
export function playClear(): void {
  if (
    !audioPlaybackSupported ||
    !soundOn ||
    !appIsActive ||
    adIsActive ||
    !clear
  )
    return;
  try {
    clear
      .seekTo(0)
      .then(() => clear?.play())
      .catch(() => {});
  } catch (error) {
    reportAudioError("play clear", error);
  }
}

/** Play the stronger simultaneous row+column clear cue. */
export function playCrossBlast(): void {
  if (
    !audioPlaybackSupported ||
    !soundOn ||
    !appIsActive ||
    adIsActive ||
    !crossBlast
  )
    return;
  try {
    crossBlast
      .seekTo(0)
      .then(() => crossBlast?.play())
      .catch(() => {});
  } catch (error) {
    reportAudioError("play cross blast", error);
  }
}
