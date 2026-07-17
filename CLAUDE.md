@AGENTS.md

# Rowflare project notes

Expo SDK 56 + React Native offline-first block puzzle. Android has an optional
native rewarded-ad module; iOS, web, and Expo Go retain the complete core game
without ads.

## Architecture

- Keep rules in `src/game/logic.ts` pure and covered by Node tests.
- `GameScreen` owns coherent run state; refs mirror state for stable gesture
  callbacks and persistence snapshots.
- Drag visuals stay on the UI thread through Reanimated shared values. Target
  changes cross to JavaScript only when the snapped board cell changes.
- The board and pan gesture both use window coordinates
  (`measureInWindow`/`absoluteX` and `absoluteY`).
- Local data is versioned and validated before restoration.
- Rewarded ads grant helpers only from the native reward callback and are capped
  by persisted per-run usage.

## Runtime notes

- Node 20.19.4 or newer is required by Expo SDK 56.
- Reanimated 4 uses `react-native-worklets`; keep its Babel plugin last.
- Ads require an Android development/release build, LevelPlay environment values,
  and completed dashboard/privacy/store setup. Never treat Expo Go as an ad test.

## Verify

Run `npm run verify`, `npx expo-doctor@latest`, and the native compile/device
matrix in `docs/RELEASE_CHECKLIST.md` before a store candidate.
