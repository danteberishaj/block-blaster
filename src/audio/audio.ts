import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { getSoundOn, saveSoundOn } from '../storage/storage';

const MUSIC_VOLUME = 0.32; // subtle background level

let music: AudioPlayer | null = null;
let clear: AudioPlayer | null = null;
let soundOn = true;
let initialized = false;

/** Create the players and start the loop (once). Safe to call repeatedly. */
export async function initAudio(): Promise<void> {
  if (initialized) return;
  initialized = true;

  soundOn = await getSoundOn();

  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
  } catch {
    // non-fatal
  }

  try {
    music = createAudioPlayer(require('../../assets/audio/music.wav'));
    music.loop = true;
    music.volume = MUSIC_VOLUME;

    clear = createAudioPlayer(require('../../assets/audio/clear.wav'));
    clear.volume = 0.9;

    if (soundOn) music.play();
  } catch {
    // audio is best-effort; never crash the game over it
  }
}

export function isSoundOn(): boolean {
  return soundOn;
}

/** Toggle music + SFX on/off, persist, and return the new state. */
export function toggleSound(): boolean {
  soundOn = !soundOn;
  saveSoundOn(soundOn);
  try {
    if (music) {
      if (soundOn) music.play();
      else music.pause();
    }
  } catch {
    // ignore
  }
  return soundOn;
}

/** Play the line-clear chime (restarts it if already playing). */
export function playClear(): void {
  if (!soundOn || !clear) return;
  try {
    clear.seekTo(0).then(() => clear?.play()).catch(() => {});
  } catch {
    // ignore
  }
}
