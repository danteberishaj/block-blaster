// Synthesizes royalty-free game audio (we author it, so it's licence-free):
//   - music.wav : a subtle, seamless-looping ambient pad
//   - clear.wav : a soft rising chime for line clears
// Run with: node scripts/generate-audio.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'assets', 'audio');
mkdirSync(OUT, { recursive: true });

const SR = 22050;

function writeWav(name, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  writeFileSync(join(OUT, name), buf);
  console.log('  ✓', name, `(${(buf.length / 1024).toFixed(0)} KB, ${(n / SR).toFixed(1)}s)`);
}

function normalize(arr, peak = 0.8) {
  let max = 0;
  for (const v of arr) max = Math.max(max, Math.abs(v));
  if (max === 0) return arr;
  const g = peak / max;
  for (let i = 0; i < arr.length; i++) arr[i] *= g;
  return arr;
}

// ---------- Ambient pad (seamless 16s loop) ----------
function makeMusic() {
  const L = 16; // loop length (s)
  const N = SR * L;
  // Snap every frequency to a whole number of cycles over L so the loop is
  // perfectly continuous (no click at the seam).
  const snap = (f) => Math.round(f * L) / L;
  // Fmaj7 -> Am7, a warm, calm progression.
  const chordA = [174.61, 220.0, 261.63, 329.63].map(snap); // F A C E
  const chordB = [220.0, 261.63, 329.63, 392.0].map(snap); // A C E G
  const det = snap(0.5); // gentle chorus detune (also whole-cycle)

  const voice = (freqs, t) => {
    let s = 0;
    for (let i = 0; i < freqs.length; i++) {
      const w = 1 / (1 + i * 0.55); // lower notes a touch louder
      const f = freqs[i];
      s += w * (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * (f + det) * t));
    }
    return s;
  };

  const out = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    const t = n / SR;
    const aAmp = (1 + Math.cos((2 * Math.PI * t) / L)) / 2; // 1->0->1 over loop
    const bAmp = 1 - aAmp;
    let v = aAmp * voice(chordA, t) + bAmp * voice(chordB, t);
    const tremolo = 0.85 + 0.15 * Math.sin((2 * Math.PI * t) / 8); // slow breath
    out[n] = v * tremolo;
  }
  normalize(out, 0.62);
  writeWav('music.wav', out);
}

// ---------- Line-clear chime (~0.7s) ----------
function makeClear() {
  const dur = 0.75;
  const N = Math.floor(SR * dur);
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  const onset = [0, 0.05, 0.1, 0.16];
  const tau = 0.19;
  const out = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    const t = n / SR;
    let v = 0;
    for (let i = 0; i < notes.length; i++) {
      const dt = t - onset[i];
      if (dt < 0) continue;
      const env = Math.exp(-dt / tau);
      const f = notes[i];
      v += env * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * 2 * f * t));
    }
    // tiny fade-out tail to avoid a click at the end
    const tailFade = t > dur - 0.03 ? (dur - t) / 0.03 : 1;
    out[n] = v * tailFade;
  }
  normalize(out, 0.85);
  writeWav('clear.wav', out);
}

console.log('Generating audio →', OUT);
makeMusic();
makeClear();
console.log('Done.');
