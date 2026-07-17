# Dependency audit record

Last reviewed: 2026-07-17

## JavaScript dependency graph

`npm audit --omit=dev` reports 11 moderate paths for
[GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq).
All reported paths collapse to this installed chain:

```text
expo-splash-screen@56.0.13
└─ @expo/config-plugins@56.0.13
   └─ xcode@3.0.1
      └─ uuid@7.0.3
```

## Current decision

Accepted temporarily for the 1.0 candidate, with an upstream-update gate before
public release.

- `xcode` and this `uuid` copy are configuration/prebuild tooling. They are not
  imported into Rowflare's Android, iOS, or web JavaScript bundles.
- The advisory concerns UUID v3/v5/v6 calls with a caller-provided buffer.
  Rowflare does not invoke that package or accept input into the prebuild process.
- npm currently offers only `--force` remediation that would install an Expo 55
  splash-screen version, crossing the SDK boundary and creating a larger
  compatibility risk.
- A package override was not applied because forcing a major `uuid` version below
  `xcode` can break its API contract and native generation.

## Follow-up

- Re-run `npm audit --omit=dev` for every store candidate.
- Upgrade to the first Expo SDK 56-compatible config-plugin/splash-screen release
  that removes the vulnerable chain, then rerun prebuild, native compilation,
  Expo Doctor, and `npm run verify`.
- Reopen this decision immediately if the package becomes reachable at runtime,
  the advisory severity changes, or untrusted input is introduced into prebuild.

## Android native dependency graph

The local Expo module pins `com.unity3d.ads-mediation:mediation-sdk:9.5.0`
(Unity LevelPlay) exactly, plus the Google Play services artifacts LevelPlay
requires (`play-services-appset:16.0.0`, `play-services-ads-identifier:18.1.0`,
`play-services-basement:18.1.0`). The SDK is isolated to the Android
rewarded-ad path and the app remains playable when that path fails closed.

For every candidate, inspect the generated release graph with:

```bash
cd android
./gradlew :app:dependencies --configuration releaseRuntimeClasspath
```

Review Unity's security/release notes and the resolved Maven transitives before
approval. The generated native project is intentionally not committed, so its
full graph and SBOM are candidate artifacts rather than permanent repository
files. A candidate must not ship if the resolved graph differs unexpectedly or
contains an unresolved high/critical advisory.

The merged release manifest intentionally permits network state, Internet,
advertising ID, vibration, audio settings, and wake lock for foreground video-ad
playback. Topics, AdServices attribution, boot-completed, microphone, storage,
overlay, notification, and foreground-service permissions are explicitly
removed in `app.json`. The LevelPlay SDK declares AdServices attribution in its
own manifest; the `app.json` block strips it deliberately to preserve the
contextual-ads posture, so rewarded fill must be confirmed on device with the
permission absent.
