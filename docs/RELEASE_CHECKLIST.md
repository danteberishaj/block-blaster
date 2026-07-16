# Rowflare release checklist

The repository is prepared to produce store candidates, but the app is not
publishable until every external gate below is completed by the publisher. Do
not replace a failed gate with an assumption.

## 1. Identity and legal gates

- [ ] Confirm **Rowflare** through trademark counsel/searches, company-name and
      domain checks, and exact/fuzzy searches in every target app store. The current
      name and `com.rowflare.game` identifiers are provisional.
- [ ] Confirm the publisher legal name, address, contact email, tax, and banking
      details in Apple Developer and Google Play Console.
- [ ] Decide the target audience and minimum age. Apply the same designation in
      Unity, Play Console, App Store Connect, the privacy policy, and ad-content
      controls. Do not enroll in a children's/families program without a dedicated
      compliance review of every SDK and creative source.
- [ ] Complete and legally review `docs/privacy-policy-template.md`; host it at a
      stable public HTTPS URL.
- [ ] Complete and host `docs/support-page-template.md` at a public HTTPS URL.
- [ ] Put both production URLs in the EAS `production` environment as
      `EXPO_PUBLIC_PRIVACY_POLICY_URL` and `EXPO_PUBLIC_SUPPORT_URL`.
- [ ] Replace all placeholders in `store.config.example.json`, rename the copy to
      `store.config.json` only when it is safe to push, and review metadata in each
      target language.

## 2. Expo and store-account setup

- [ ] Use Node 20.19.4 LTS (Node 20.x), matching `package.json`, CI, and EAS.
- [ ] Run `eas init` with the publisher's Expo account and review the generated
      `owner` / `extra.eas.projectId` app configuration before committing it.
- [ ] Configure iOS distribution and App Store Connect credentials for the
      production profile.
- [ ] Create the Google Play app with package `com.rowflare.game`, complete one
      initial manual upload if required, and configure the Google service account
      for EAS Submit. Never commit its JSON key.
- [ ] Configure remote versioning and confirm that iOS build number and Android
      version code increment as expected.
- [ ] Review EAS plan usage before running cloud builds. Builds and submissions
      consume account resources.

## 3. Ads and privacy setup

- [ ] Create the production Android project and rewarded placement in Unity.
- [ ] Store `EXPO_PUBLIC_UNITY_ANDROID_GAME_ID` and
      `EXPO_PUBLIC_UNITY_ANDROID_REWARDED_PLACEMENT_ID` in the EAS production
      environment. Confirm the build is not using test ads.
- [ ] Verify Unity privacy, regional consent/opt-out, age designation, ad-content
      filters, and data-processing terms with counsel. The app currently requests
      contextual/non-personalized ads; that does not remove every regional notice
      or consent obligation.
- [ ] Download the complete current authorized-seller list from Unity's
      App-ads.txt dashboard, add `ownerdomain`, host it at the exact root domain used
      by the store listings, and verify it in Unity. Recheck it monthly because the
      seller list can change. See Unity's [setup guide](https://docs.unity.com/en-us/monetization/dashboard/app-ads-txt/set-up-app-ads-txt).
- [ ] Complete Google Play Data safety, **Contains ads**, advertising ID, and
      target-audience declarations from observed production behavior—not from this
      checklist alone.
- [ ] Complete App Store privacy nutrition labels. iOS currently has no ad SDK,
      but the declarations must match the final binary and all other dependencies.
- [ ] Decide whether Android-only rewarded helpers are acceptable for launch and
      document this in review notes/support. Core gameplay remains identical.
- [ ] Track Unity's direct-integration guidance. Unity says direct Ads remains
      supported, but recommends LevelPlay for monetization performance after April
      1, 2026; treat migration as a measured post-launch decision, not a blind
      release-day dependency swap. See the [Unity Ads changelog](https://docs.unity.com/grow/ads/changelog).

## 4. Automated release gates

From a clean checkout:

```bash
npm ci
npm run verify
npx expo-doctor@latest
npm audit --omit=dev
```

- [ ] TypeScript passes.
- [ ] All pure logic and saved-run tests pass.
- [ ] Deterministic tray-balance audit passes.
- [ ] Android, iOS, and web JavaScript exports pass.
- [ ] Expo Doctor passes every check.
- [ ] Production dependency audit has no unresolved high/critical issue; review
      moderate issues for reachability and update `docs/SECURITY_AUDIT.md`.
- [ ] GitHub CI is green on the exact commit.
- [ ] The EAS release workflow validates against the current schema.

## 5. Native build gates

- [ ] Run a clean Expo prebuild and compile the local Unity module against the
      generated SDK 56 Android project.
- [ ] Inspect the merged Android manifest: network state, Internet, AD_ID,
      vibration, audio settings, and wake lock are expected for foreground ad
      playback. Topics, AdServices attribution, boot-completed, microphone,
      storage, overlay, notification, and foreground-service permissions are not.
- [ ] Build a signed Android App Bundle with the production EAS profile.
- [ ] Build a signed iOS archive with the production EAS profile.
- [ ] Confirm bundle identifiers, app name, icon, splash, version, build numbers,
      encryption declaration, orientation, and dark status-bar behavior in the
      installed release binaries.

## 6. Real-device game matrix

Test at least one low/mid Android device, one recent Android device, one small
iPhone, and one notched/Dynamic Island iPhone. Include a tablet if tablet support
remains enabled.

- [ ] First launch, returning launch, background/foreground, force-kill, and OS
      process recreation.
- [ ] Resume restores the exact board, tray, score, helpers, combo data, game-over
      state, and per-run ad caps.
- [ ] Restart confirmation preserves a live run when cancelled and clears every
      run-scoped value when confirmed.
- [ ] Drag placement, invalid drop, edge snapping, tap selection, highlighted
      placement, selection toggle, and tray refill.
- [ ] Full row, full column, cross clear, multi-line score, combo reset/growth,
      high score, best chain, and biggest blast.
- [ ] Shuffle, Break, Hint, all zero states, unavailable-ad state, and revive.
- [ ] VoiceOver and TalkBack can select shapes, find valid board cells, place a
      shape, activate helpers, understand disabled states, and close every modal.
- [ ] System reduced-motion setting removes repeating/large movement while
      retaining state feedback.
- [ ] 320×568, 360×640, 390×844, largest supported phone, and tablet layouts have
      no clipping, overlap, hidden action, or unsafe-area collision.
- [ ] Large font/display scaling remains usable. If a supported system scale
      breaks the game, fix it or document and narrow support before release.
- [ ] Offline play, airplane mode, audio interruptions, headphones/Bluetooth,
      mute persistence, and no network at launch.

## 7. Rewarded-ad failure matrix on Android release builds

- [ ] Complete ad: exactly one helper is granted and audio resumes.
- [ ] Skip/close ad: no helper is granted and the run is unchanged.
- [ ] No fill, load failure, initialization failure, offline, and timeout: clear
      recoverable message, no reward, controls unlock, and audio resumes.
- [ ] Rapid/double tap: only one ad request is active.
- [ ] Background, lock, rotate-at-system level, activity loss, and app kill during
      load/show: no crash and no false reward.
- [ ] Late callback after timeout cannot grant a reward.
- [ ] Each helper earns no more than one ad-funded use per run, including after a
      force-kill/restore. A new run resets the cap.
- [ ] Ads obey configured age/content/privacy choices and use production placement
      IDs only in release candidates.

## 8. Store-candidate rollout

- [ ] Run `.eas/workflows/release.yml` manually. It must verify, build both
      platforms, stop for approval, then submit only after the artifacts are
      inspected.
- [ ] Android lands on Play's internal draft track. Run the Play pre-launch
      report, accessibility checks, device catalog review, and internal testing.
- [ ] iOS lands in App Store Connect/TestFlight. Complete internal testing first,
      then at least one external TestFlight cycle and Beta App Review.
- [ ] Review startup time, frame rate, ANRs, crashes, ad completion/no-fill rates,
      battery use, and support feedback from the actual release binaries.
- [ ] Capture final store screenshots from release binaries, including honest
      gameplay and no debug/test-ad UI.
- [ ] Manually promote with a staged/phased rollout and a rollback/stop plan.
      Public release is never an automatic consequence of a successful build.
