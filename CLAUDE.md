@AGENTS.md

# Block Blast — project notes

Expo (SDK 54) + React Native block-puzzle game, **Android-first**, fully offline.
(Pinned to SDK 54 to match the user's Expo Go; `create-expo-app` defaults to a newer SDK.)

## Architecture
- **Pure game logic** lives in `src/game/logic.ts` (no RN imports) — placement, line
  clears, game-over, scoring. Keep it pure and unit-testable.
- **GameScreen** holds all React state and the gesture callbacks. Callbacks are kept
  **stable** (empty-dep `useCallback`, reading from refs) so `DraggableShape` never
  re-renders mid-drag and the active gesture object isn't recreated.
- Drag visuals run on the **UI thread** via shared values (`dragX/dragY/...`). Only the
  *placement preview* crosses to JS, and only when the target cell changes (guarded by
  `lastKey` in the pan worklet) to keep re-renders minimal.
- Grid maps finger window-coords → cells using `measureInWindow`; gesture
  `absoluteX/absoluteY` are also window coords, so the math lines up.

## Gotchas
- Reanimated 4 needs `react-native-worklets` + `react-native-worklets/plugin` **last**
  in `babel.config.js`. `babel-preset-expo` must be installed.
- High score / tutorial-seen flag persist via AsyncStorage in `src/storage/storage.ts`.

## Verify
- Bundle check: `npx expo export --platform android` should bundle with 0 errors.
