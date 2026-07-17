# Rowflare Android Rewarded-Ad Audit

Read-only adversarial audit of the Android rewarded-ad path (branch `codex/production-ready-ads-ui`).
Scope: G1–G6 as stated. No files modified.

## Executive summary

The reward-integrity core is sound. I could not construct any interleaving that grants a
reward that the guarantees forbid: G2, G3, G4, G5, G6 hold by trace. G1 (fail-closed +
recoverable UI) holds for every enumerated failure, with two real but bounded caveats around
the 5-minute `SHOW_TIMEOUT` path. No BLOCKER or HIGH findings.

The design is notably defensive in two load-bearing spots:
- The native ad-owner is a per-request identity object released via
  `ACTIVE_AD_OWNER.compareAndSet(adOwner, null)` (Client.java:386). A stale/late `finish()`
  from a previous ad therefore *cannot* release a newer ad's ownership — cross-ad ownership
  release is structurally impossible.
- A single `settled` `AtomicBoolean` (Client.java:179, 387) guarantees exactly one JS
  settlement per request; every later native callback returns early before touching the promise.

---

## Findings (severity-ordered)

### F1 — MEDIUM (G1): `SHOW_TIMEOUT` can kill ads for the whole process session and lock the game UI for up to 5 minutes

**Files:** `RowflareUnityAdsClient.java:258-271` (showTimeout, `releaseAdOwnership=false`),
`:375-392` (finish), `:32` (`SHOW_TIMEOUT_MS = 5 * 60_000L`); `src/ads/rewardedAds.ts:84-95`
(no JS-side timeout); `src/components/GameScreen.tsx:713-717` (`finally` unlocks only when the
promise settles), `:852-853` (`adBusy`/`interactionLocked`).

**Scenario (step-by-step):**
1. `RewardedAd.load` succeeds; handoff clears; `rewardedAd.show(...)` is called and the Unity
   ad activity comes to the foreground. `showTimeout` (5 min) is the active timeout.
2. The Unity SDK hangs on screen and never fires `onCompleted`/`onFailed` (SDK bug, wedged ad
   activity, OS ANR on the ad process, etc.).
3. On the JS side `await RowflareUnityAds.showRewardedAsync(...)` never returns → the `finally`
   in `requestRewardedHelper` never runs → `rewardingHelper` stays non-null →
   `interactionLocked` (GameScreen.tsx:853) keeps the entire game UI disabled and audio paused.
4. At 5 minutes `showTimeout` fires `finish(..., releaseAdOwnership=false, rewarded=false,
   "UNITY_ADS_SHOW_TIMEOUT")`. It settles → module rejects → JS `catch` returns
   `{status:"error"}` → `finally` unlocks the game and resumes audio. **Recoverable — good.**
5. BUT because `releaseAdOwnership=false`, `ACTIVE_AD_OWNER` is *not* cleared. If the hung
   `onCompleted`/`onFailed` never subsequently arrives (the same condition that caused the
   hang), the owner stays held for the rest of the process. Every later `showRewarded` hits
   `compareAndSet(null, adOwner)` == false → `UNITY_ADS_BUSY` → JS `{status:"error"}`. The
   watch-ad / revive feature is dead for the remainder of the app session.

**Why the `false` is intentional and the trade-off:** not releasing on `SHOW_TIMEOUT` is the
correct choice for the *common* case (ad genuinely still on screen — releasing would let a
second ad start mid-show and break G3). The recovery hook is that a *late* `onCompleted`/
`onFailed` calls `finish(releaseAdOwnership=true, ...)` whose `compareAndSet(adOwner,null)`
runs *before* the `settled` check (Client.java:386-387) and reclaims ownership. The leak only
becomes permanent when that late callback never fires at all.

**Fail-closed?** Yes — no reward is granted, game stays fully playable without ads. This is a
degraded-ads condition, not a correctness break. That is why it is MEDIUM, not HIGH.

**Confidence:** CONFIRMED-BY-TRACE for the lock-and-recover and the non-release. PLAUSIBLE for
whether Unity ever actually leaves `onCompleted`/`onFailed` unfired for 5+ minutes — that is an
SDK runtime property I cannot verify statically.

**Suggested fix (do not implement):** (a) drop `SHOW_TIMEOUT_MS` to a value closer to real ad
length (e.g. 60–90 s) so a hung show unlocks the UI far sooner; and/or (b) add a bounded
"reaper": after the show timeout fires, arm a short secondary timer that force-releases
`ACTIVE_AD_OWNER` for that `adOwner` if no completion has arrived, accepting a small mid-show
race in exchange for not bricking ads for the session; and/or (c) add a JS-side timeout in
`showRewardedHelperAd` so the UI never depends on the 5-minute native ceiling.

---

### F2 — LOW (G1): JS has no independent timeout; UI-unlock relies entirely on the native ceilings

**Files:** `src/ads/rewardedAds.ts:84-102` (bare `await`, no `Promise.race`/timeout);
native ceilings `Client.java:29-32` (init 15 s, load 20 s, handoff 10 s, show 5 min).

Every native path *does* eventually settle (enumerated in the G1 verdict below), so the JS
promise cannot hang forever — worst case is the 5-minute show ceiling from F1. There is no
independent JS guard, so the JS/UI recovery time is exactly the native ceiling. Acceptable
today but brittle: any future native path added without a timeout would silently translate into
a permanent `interactionLocked` game. **Confidence:** CONFIRMED-BY-TRACE.
**Suggested fix:** wrap `showRewardedAsync` in a JS timeout slightly above the native show
ceiling as defense-in-depth, and/or add a native invariant test that every acquire-owner path
posts a timeout.

---

### F3 — LOW (G1): watching a full ad, then unmounting before it resolves, silently drops the reward

**Files:** `src/components/GameScreen.tsx:684-685` (`if (!mountedRef.current) return false;`
before grant), `:239-244` (cleanup sets `mountedRef.current=false`), `:687-705` (grant + record
only on the mounted path).

If the component unmounts between ad completion and promise resolution, the reward is discarded
after the user watched the whole ad. This is user-hostile but **fail-closed and self-correcting**:
`recordRewardedHelperUse` is only reached inside the `granted` branch (line 690), so
`rewardUsage[helper]` is *not* consumed — the user can retry the ad for that helper after
remount. Not a double-grant, not a permanent penalty. Reachability is low because the home
button is disabled while `interactionLocked` (line 880), so the user cannot self-navigate away
mid-ad; only external teardown triggers it. **Confidence:** CONFIRMED-BY-TRACE.
**Suggested fix (optional):** grant to a ref/persist before the mount check so a reward survives
remount, or leave as-is and accept the rare lost-ad case.

---

### F4 — INFO (init): stale-attempt init success can be overwritten by a newer attempt's failure

**Files:** `Client.java:131-153` (`completeInitialization`), specifically the mismatch branch
`:139-142` (`if (attempt != initializationAttempt) { if (success) initialized = true; return; }`).

If attempt 1 times out (sets `initializing=false`, `initialized=false`) and a *new* init
(attempt 2) starts, a late attempt-1 Unity success sets `initialized=true` but does not touch
attempt 2's in-flight state; a subsequent attempt-2 failure then flips `initialized` back to
`false`. This is last-attempt-wins and never double-resolves a callback (the stale branch
returns without flushing), so it has **no reward-integrity impact**. The JS memoization recovers
correctly either way: on any resolved-false / rejected init, `initializationPromise` is reset to
`null` (rewardedAds.ts:37-46), and a later native `initialized==true` short-circuits
`initialize()` at Client.java:82 so the next JS attempt resolves immediately. I could not
construct a permanently-stuck-false memo. **Confidence:** CONFIRMED-BY-TRACE.
**Suggested fix:** none required; optionally have the stale-success branch skip mutating shared
`initialized` to avoid the flip.

---

### F5 — INFO (persistence): `rewardUsage` is a hard-required field in the `run_v1` schema

**Files:** `src/game/runState.ts:109-114, 116-146` (`isRewardUsage` required; whole parse
returns `null` if absent/invalid), `src/storage/storageCore.ts:15` (`run_v1`), `:166-183`
(invalid save is removed and treated as no run).

A saved run lacking a valid `rewardUsage` (values 0–1 per helper) is rejected wholesale, not
defaulted — any pre-existing `run_v1` blob without the field would be silently discarded (run
wipe). This is **moot for this release**: `git log` shows `runState.ts` is introduced for the
first time in the single store-candidate commit `22c7613`, so no prior shipped build wrote a
`run_v1` save without `rewardUsage`. Flagging per the persisted-schema/wipe-risk discipline:
if a build with an older `run_v1` shape ever reached devices, bump the version key or default
the field instead of rejecting. **Confidence:** CONFIRMED-BY-TRACE (history + validator).

---

## Per-guarantee verdicts

**G1 (fail closed + recoverable UI): HOLDS-WITH-CAVEATS.** Every native path settles the JS
promise exactly once and grants no reward on failure. Enumerated settle paths, all via
`finish()` under the `settled` guard: not-initialized (Client.java:162), missing placement
(:166), activity-unusable at entry (:170), busy (:175), load timeout (:184), load error/null
(:207), load exception (:352), handoff timeout (:221), handoff exception (:337),
runOnUiThread activity-unusable (:244), show timeout (:258), `onCompleted` (:291),
`onFailed` (:306), show exception (:323). Owner acquired at :174 is always paired with a
posted timeout before any callback wait. Caveats: F1 (session-long ad death + up-to-5-min UI
lock on a hung show) and F2 (no JS timeout).

**G2 (late native callback can't grant after timeout): HOLDS.** `settled.compareAndSet(false,
true)` (Client.java:387) makes the first settle win; `SHOW_TIMEOUT`'s `finish` (release=false,
rewarded=false) settles and rejects, and the later `onRewarded`+`onCompleted` path returns early
at :387 without calling the callback. `onRewarded` (:285-287) only sets a flag and never
settles, so a reward observed after a timeout is dropped. CONFIRMED-BY-TRACE.

**G3 (exactly one request in flight, incl. double-tap): HOLDS.** JS: `requestRewardedHelper`
checks `rewardingHelperRef.current !== null` (GameScreen.tsx:673) and sets it (:679)
synchronously *before* the first `await` (:684); a second synchronous tap returns false. UI:
`HelperButton` disables on `rewarding !== null` (HelperBar.tsx:72-75) and the modal revive
button on `rewardingHelper !== null` (GameScreen.tsx:1053). Native belt-and-suspenders:
`ACTIVE_AD_OWNER.compareAndSet(null, adOwner)` (Client.java:174) rejects a concurrent request
with `UNITY_ADS_BUSY`, and the identity-keyed release (:386) prevents cross-ad clobbering.
CONFIRMED-BY-TRACE.

**G4 (≤1 ad-funded use per helper per run, across kill/restore, reset on new run): HOLDS.**
`rewardUsageRef` is the synchronous source of truth for `canEarnRewardedHelperUse`
(GameScreen.tsx:666); it is restored from the validated save at hydration (:221) *before*
`runHydrated` unlocks any button (`interactionLocked` includes `!runHydrated`, :853; HelperBar
disabled via the `disabled` prop; GameOverModal gated on `runHydrated`, :1039). `rewardUsage`
is in every persisted snapshot (effect deps :263-274; AppState/goHome via `runSnapshotRef`
:175-189, 280, 290), serialized through a write queue (storageCore.ts:184-192), and validated
0–1 on load (runState.ts:109-114). New run resets both ref and state (:575-579). Worst kill-race
loses the helper *and* leaves `rewardUsage` unset together — re-earnable, never double-granted.
CONFIRMED-BY-TRACE.

**G5 (exactly one use per completed ad): HOLDS.** `grantHelperUse` sets the count to exactly
`1` and refuses if already `>0` (GameScreen.tsx:651-660) — it is not an increment. Revive earns
one shuffle then `spend("shuffle")` consumes exactly it (:817-821) with no concurrent consumer
(game-over, single-threaded). CONFIRMED-BY-TRACE.

**G6 (privacy configured before init; contextual/opt-out; test mode only in `__DEV__`): HOLDS.**
Argument order is consistent end to end: `configurePrivacyAsync(userConsent, userOptOut,
nonBehavioral)` (index.ts:4-8) → Kotlin `(userConsent, userOptOut, nonBehavioral)` (Module.kt:
11-16) → Java `configurePrivacy` → `setUserConsent`/`setUserOptOut`/`setNonBehavioral`
(Client.java:52-61). The call passes `(false, true, true)` (rewardedAds.ts:32) = no consent,
opted out, non-behavioral/contextual. Init hard-refuses if privacy is unset
(Client.java:68-74), and JS chains privacy→init (rewardedAds.ts:31-36). `testMode = __DEV__`
(rewardedAds.ts:35), so production builds run live ads. CONFIRMED-BY-TRACE for wiring/order;
PLAUSIBLE that Unity's SDK interprets this triple as fully non-personalized (SDK semantics I
can't verify statically).

---

## Device-only verification (cannot be proven statically)

1. **F1 realism / owner leak:** on a real device, force a wedged show (e.g. kill the Unity ad
   process, or airplane-mode mid-show) and confirm whether `onCompleted`/`onFailed` ever fires.
   Verify: game UI unlocks at the show timeout, and whether a *subsequent* watch-ad attempt
   returns `UNITY_ADS_BUSY` (leak) or works (recovered). This decides F1's real-world severity.
2. **Activity destruction mid-show (config change):** rotate the device / trigger activity
   recreation while the ad is on screen; confirm the promise settles (via `onFailed`, the
   activity-usable check, or timeout) and the game recovers with audio resumed.
3. **Background/kill during load and during show:** background the app during the 20 s load and
   again during show; confirm no reward is granted and controls unlock on return.
4. **Rapid double-tap on a real touch screen:** hammer the Watch-Ad button and the modal Revive
   button; confirm only one ad ever loads (the ref guard is JS-synchronous, but verify no native
   double-load slips through under real event timing).
5. **Force-kill persistence for G4:** earn a helper via ad, force-stop the app immediately
   (before/after the async save flushes), relaunch; confirm `rewardUsage` restored so the same
   helper cannot be re-earned when the earned use was actually consumed.
6. **G6 ad content:** confirm on a release (`__DEV__=false`) build that served ads are
   non-personalized/contextual per the Unity dashboard, and that no test ads appear.
