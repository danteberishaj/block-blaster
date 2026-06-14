# Block Blast

A polished, offline block-puzzle game for Android, built with Expo + React Native.

Drag shapes onto an 8×8 grid. Fill any full **row or column** to blast it away and
score points. When none of your three shapes can fit anywhere — game over. Your high
score is saved on-device.

## Features

- Animated **home screen** with a big Play button, best score, and "How to Play"
- Forgiving drag-and-drop: the piece **snaps to the nearest valid spot** (even hanging off the edge), with a colored ghost preview showing exactly where it lands
- **Helpers** (3 each per game): **Shuffle** new pieces · **Break** a single block (tap-to-smash) · **Hint** (highlights a move). Run out of room? "Shuffle & Continue" revives you on game over
- **Combos** — consecutive clears build a streak multiplier (×2, ×3…); multi-line clears pop "DOUBLE!/TRIPLE!" with escalating color + haptics
- **Cross Blast** — simultaneous row and column clears get a distinct popup, burst, haptic, and synthesized sound
- **Retention stats** — local best score, run chain, all-time best chain, and biggest blast
- **Audio** — a subtle looping ambient pad + a chime on line clears, with a mute toggle. All sound is **self-synthesized** (`scripts/generate-audio.mjs`), so it's genuinely royalty-free — no licences, no attribution
- Animated splash screen — colored tiles assemble into the logo
- First-launch tutorial (4 quick coachmark steps)
- Line-clear burst effects + haptic feedback on place / clear
- Local high-score persistence (AsyncStorage) — **no backend required**
- Dark, vibrant gradient UI, custom app icon, and maintained vector controls instead of emoji UI

## Run it

```bash
npm install        # if you haven't already
npx expo start     # then press "a" for Android, or scan the QR with Expo Go
# or directly:
npm run android
```

> **Note:** Pinned to **Expo SDK 54** so it runs in the current Play Store Expo Go.
> Reanimated 4 requires the New Architecture (default in SDK 54); no extra config is
> needed beyond what's in `babel.config.js`.

## Project structure

```
App.tsx                       Root: gesture provider + splash handoff
src/
  game/
    logic.ts                  Pure game rules (place / clear / game-over / score / tray fairness)
    shapes.ts                 Shape templates + random shape construction
    types.ts                  Board / Shape types
  components/
    HomeScreen.tsx            Start screen: Play button, best score, How to Play
    GameScreen.tsx            Orchestrates board, tray, drag overlay, scoring, combos, modals
    Grid.tsx                  8×8 board + placement preview, measures itself in-window
    DraggableShape.tsx        Pan gesture → shared values + target-cell reporting
    ShapeView.tsx / Block.tsx Glossy gradient tiles
    LogoMark.tsx              Reusable 2×2 block logo (matches the app icon)
    Header.tsx                Score / best display
    GameOverModal.tsx         End screen (Play Again / Home)
    Tutorial.tsx              First-launch onboarding
    AnimatedSplash.tsx        Branded intro animation
    ClearBurst.tsx            Line-clear flash effect
    ComboPopup.tsx            "COMBO ×N" / multi-clear popup
    GameIcon.tsx              Maintained control/icon wrapper
  storage/storage.ts          AsyncStorage (high score + tutorial flag)
  theme/theme.ts              Colors, spacing, radii, board size
scripts/generate-icons.mjs    Generates app icon / splash PNGs from one SVG (run: node scripts/generate-icons.mjs)
scripts/tray-balance-check.mjs Deterministic tray fairness audit (run: npm run balance:tray)
```

## Regenerate the app icon

The icon, adaptive icon, splash logo, and favicon are all produced from a single SVG in
`scripts/generate-icons.mjs` (rendered with `sharp`, a devDependency). Tweak the colors
or layout there and re-run:

```bash
node scripts/generate-icons.mjs
```

## Regenerate the audio

`assets/audio/music.wav` (ambient loop), `clear.wav` (line-clear chime), and
`cross.wav` (Cross Blast hit) are
synthesized from scratch in `scripts/generate-audio.mjs` — pure sine math, no samples,
so it's licence-free. Tweak the chords/tempo and re-run:

```bash
node scripts/generate-audio.mjs
```

## Want an online leaderboard later?

Everything is local-first today. To add global high scores, drop in a small backend
(Supabase or Firebase work well) and post `{ name, score }` on game over — the game
logic doesn't need to change.
