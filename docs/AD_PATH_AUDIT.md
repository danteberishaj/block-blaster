# Rowflare Android Rewarded-Ad Audit

> **2026-07-18 — LevelPlay follow-up.** The direct Unity Ads client was replaced
> by `RowflareLevelPlayAdsClient`. A follow-up static audit added the Unity Ads
> adapter/SDK to the LevelPlay build, made stale initialization success
> authoritative, retained ad ownership while an uncancellable show is pending,
> and treats `onAdRewarded` as authoritative before or after `onAdClosed`. A
> 10-second close grace still bounds the skipped-ad response; real network/device
> callback ordering remains a mandatory §7 release gate.

> **2026-07-18 — privacy-posture correction (supersedes G6 below).** The
> mandatory privacy-before-init coupling described in the G6 verdict has been
> removed. The app no longer calls `configurePrivacyAsync(false, true, true)`
> during initialization, and the native client no longer refuses init with
> `LEVELPLAY_PRIVACY_NOT_CONFIGURED`. Rowflare now makes **no privacy
> declarations by default** so the advertising ID stays available for LevelPlay
> dashboard test-device matching and fill; the `configurePrivacy(Async)` API is
> retained as opt-in for a future consent-management platform. The G6 trace
> below (privacy `(false, true, true)` chained before init, "Init hard-refuses
> if privacy is unset") is preserved as historical record and no longer reflects
> the shipped flow.

Adversarial audit of the Android rewarded-ad path (branch `codex/production-ready-ads-ui`).
Scope: G1–G6 as stated. F1 was remediated after the initial read-only audit; the
status below describes the current implementation.

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

### F1 — REMEDIATED (G1): a show timeout no longer disables ads for the process session

`SHOW_TIMEOUT` now settles fail-closed and releases its identity-keyed owner. The game unlocks,
audio resumes, and a later request is no longer rejected forever as `UNITY_ADS_BUSY`. A late
callback still cannot reward because the request's `settled` guard has already won, and its
`compareAndSet(adOwner, null)` cannot release ownership held by a newer request.

The five-minute ceiling remains intentionally conservative for unusually long rewarded
creatives. Real-device release testing must still wedge a show and verify that the SDK does not
visually overlap a retry after timeout; this runtime behavior cannot be proven statically.

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
posted timeout before any callback wait. Remaining caveat: F2 (no independent JS timeout).

**G2 (late native callback can't grant after timeout): HOLDS.** `settled.compareAndSet(false,
true)` (Client.java:387) makes the first settle win; `SHOW_TIMEOUT`'s `finish` (release=true,
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

1. **F1 timeout recovery:** on a real device, force a wedged show (e.g. kill the Unity ad
   process, or airplane-mode mid-show). Verify the game unlocks at timeout, a later request is
   not permanently busy, and late callbacks cannot reward, overlap a newer request, or release
   the newer request's owner.
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
