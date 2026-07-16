# Rowflare

Rowflare is an offline-first block puzzle for Android and iOS, built with Expo
SDK 56 and React Native. Place shapes on an 8×8 board, clear full rows or
columns, and chain consecutive clears for larger scores.

## What is included

- Drag-to-place and accessible tap-to-select/tap-to-place controls.
- Board-aware tray repair that prevents an immediately dead random deal when a
  legal repair exists.
- Shuffle, Break, and Hint helpers with three starting uses each.
- Optional Android rewarded ads only after a helper reaches zero. A completed
  ad grants one use, capped at one ad-funded use per helper per run.
- Local active-run restore, high score, best chain, sound preference, and
  tutorial state. No account or backend is required.
- Safe-area layouts, compact-phone behavior, reduced-motion support, screen
  reader labels, synthesized audio, haptics, clear previews, and combo feedback.
- Unit tests, deterministic tray-balance checks, bundle exports, CI, and a
  manually approved EAS store-candidate workflow.

## Local development

Use Node 20.19.4 LTS (Node 20.x). The repository intentionally rejects other
major Node lines so local, CI, and EAS installs stay reproducible.

```bash
npm ci
npm run start
```

Use a development build for native testing:

```bash
npm run android
npm run ios
```

Rewarded ads use the local Android Expo module in `modules/unity-ads`, so they
are unavailable in Expo Go, on web, and currently on iOS. Copy `.env.example`
to `.env` and supply the Unity Android Game ID and rewarded placement ID for an
Android development or release build. Missing ad configuration fails closed;
the game remains playable and no reward is granted.

## Verification

```bash
npm run verify
npx expo-doctor@latest
```

`npm run verify` type-checks, runs pure game and persistence tests, performs the
deterministic tray-balance audit, and exports Android, iOS, and web bundles.

See [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) before creating a
store build. Cloud EAS builds and submissions consume account resources and are
intentionally not run by local verification.

## Project map

```text
App.tsx                       App lifecycle, safe area, splash, error boundary
src/components/              Home, game, board, tray, helpers, modals, effects
src/game/                    Pure rules, shapes, helper economy, saved-run parser
src/ads/rewardedAds.ts       Fail-closed rewarded-ad orchestration
src/audio/audio.ts           App/ad-aware synthesized audio playback
src/storage/storage.ts       Serialized local persistence and legacy migration
modules/unity-ads/           Android Expo module backed by Unity Ads 4.19
tests/                       Node-based pure logic and saved-run tests
.github/workflows/ci.yml     Pull-request and main-branch verification
.eas/workflows/release.yml   Gated store-candidate build and internal submission
```

## Generated assets

The app icons and splash art are generated from the SVG source in
`scripts/generate-icons.mjs`:

```bash
node scripts/generate-icons.mjs
```

Audio files are synthesized from code and contain no third-party samples:

```bash
node scripts/generate-audio.mjs
```
