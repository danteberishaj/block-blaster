import assert from "node:assert/strict";
import test from "node:test";
import {
  createRewardedAdsCore,
  type RewardedAdsEnv,
  type RewardedAdsNativeModule,
} from "../src/ads/rewardedAdsCore";

interface MockNativeModule extends RewardedAdsNativeModule {
  configurePrivacyCalls: Array<[boolean, boolean, boolean]>;
  initializeCalls: Array<[string, boolean]>;
  showCalls: Array<[string, string]>;
}

interface MockOptions {
  privacyResult?: boolean | (() => Promise<boolean>);
  initializeResult?: boolean | (() => Promise<boolean>);
  showResult?: boolean | (() => Promise<boolean>);
}

function createMockNativeModule(options: MockOptions = {}): MockNativeModule {
  const module: MockNativeModule = {
    configurePrivacyCalls: [],
    initializeCalls: [],
    showCalls: [],
    async configurePrivacyAsync(userConsent, userOptOut, nonBehavioral) {
      module.configurePrivacyCalls.push([userConsent, userOptOut, nonBehavioral]);
      const r = options.privacyResult;
      if (typeof r === "function") return r();
      return r === undefined ? true : r;
    },
    async initializeAsync(appKey, testMode) {
      module.initializeCalls.push([appKey, testMode]);
      const r = options.initializeResult;
      if (typeof r === "function") return r();
      return r === undefined ? true : r;
    },
    async showRewardedAsync(adUnitId, rewardKey) {
      module.showCalls.push([adUnitId, rewardKey]);
      const r = options.showResult;
      if (typeof r === "function") return r();
      return r === undefined ? true : r;
    },
  };
  return module;
}

function baseEnv(overrides: Partial<RewardedAdsEnv> = {}): RewardedAdsEnv {
  return {
    platformOS: "android",
    nativeModule: createMockNativeModule(),
    appKey: "appkey-123",
    rewardedAdUnitId: "adunit-abc",
    isDev: false,
    ...overrides,
  };
}

test("non-android platform → unavailable, no native call made", async () => {
  const nativeModule = createMockNativeModule();
  const core = createRewardedAdsCore(baseEnv({ platformOS: "ios", nativeModule }));

  const result = await core.showRewardedHelperAd("shuffle");
  assert.deepEqual(result, {
    status: "unavailable",
    message: "Rewarded ads are available in the Android app.",
  });
  assert.equal(nativeModule.configurePrivacyCalls.length, 0);
  assert.equal(nativeModule.initializeCalls.length, 0);
  assert.equal(nativeModule.showCalls.length, 0);
  assert.equal(core.canShowRewardedHelperAds(), false);
});

test("null native module → unavailable", async () => {
  const core = createRewardedAdsCore(baseEnv({ nativeModule: null }));

  const result = await core.showRewardedHelperAd("bomb");
  assert.deepEqual(result, {
    status: "unavailable",
    message: "Rewarded ads need an Android development or release build.",
  });
  assert.equal(core.canShowRewardedHelperAds(), false);
});

test("missing appKey → unavailable and canShow false", async () => {
  const nativeModule = createMockNativeModule();
  const core = createRewardedAdsCore(baseEnv({ nativeModule, appKey: undefined }));

  const result = await core.showRewardedHelperAd("hint");
  assert.deepEqual(result, {
    status: "unavailable",
    message: "Rewarded ads are not configured yet.",
  });
  assert.equal(core.canShowRewardedHelperAds(), false);
  assert.equal(nativeModule.configurePrivacyCalls.length, 0);
});

test("blank/whitespace-only appKey → unavailable and canShow false", async () => {
  const core = createRewardedAdsCore(baseEnv({ appKey: "   " }));
  const result = await core.showRewardedHelperAd("hint");
  assert.equal(result.status, "unavailable");
  assert.equal(core.canShowRewardedHelperAds(), false);
});

test("blank/whitespace-only adUnitId → unavailable and canShow false", async () => {
  const core = createRewardedAdsCore(baseEnv({ rewardedAdUnitId: "  \t " }));
  const result = await core.showRewardedHelperAd("hint");
  assert.deepEqual(result, {
    status: "unavailable",
    message: "Rewarded ads are not configured yet.",
  });
  assert.equal(core.canShowRewardedHelperAds(), false);
});

test("init calls initializeAsync WITHOUT any preceding configurePrivacyAsync", async () => {
  const nativeModule = createMockNativeModule({ showResult: true });
  const core = createRewardedAdsCore(baseEnv({ nativeModule }));

  const result = await core.showRewardedHelperAd("shuffle");
  assert.deepEqual(result, { status: "rewarded" });

  // Rowflare makes no privacy declarations by default: init must go straight to
  // initializeAsync with no configurePrivacyAsync call ahead of it.
  assert.equal(nativeModule.configurePrivacyCalls.length, 0);
  assert.equal(nativeModule.initializeCalls.length, 1);
  assert.deepEqual(nativeModule.initializeCalls[0], ["appkey-123", false]);
});

test("initializeAsync rejecting → error, promise reset, later success works and memoizes", async () => {
  let initAttempts = 0;
  const nativeModule = createMockNativeModule({
    initializeResult: () => {
      initAttempts += 1;
      if (initAttempts === 1) return Promise.reject(new Error("boom"));
      return Promise.resolve(true);
    },
  });
  const core = createRewardedAdsCore(baseEnv({ nativeModule }));

  const first = await core.showRewardedHelperAd("bomb");
  assert.deepEqual(first, {
    status: "error",
    message: "The ad service is unavailable right now. Please try again.",
  });

  // Second call: init succeeds → rewarded.
  const second = await core.showRewardedHelperAd("bomb");
  assert.deepEqual(second, { status: "rewarded" });

  // Third call: memoized, no additional initialize.
  const third = await core.showRewardedHelperAd("bomb");
  assert.deepEqual(third, { status: "rewarded" });

  // initializeAsync called exactly twice: the rejected attempt + one success.
  assert.equal(nativeModule.initializeCalls.length, 2);
});

test("initializeAsync resolving false → error, promise reset for retry", async () => {
  const nativeModule = createMockNativeModule({ initializeResult: false });
  const core = createRewardedAdsCore(baseEnv({ nativeModule }));

  const first = await core.showRewardedHelperAd("hint");
  assert.equal(first.status, "error");
  const second = await core.showRewardedHelperAd("hint");
  assert.equal(second.status, "error");
  // Init retried (promise reset to null on false); still no privacy call.
  assert.equal(nativeModule.initializeCalls.length, 2);
  assert.equal(nativeModule.configurePrivacyCalls.length, 0);
});

test("showRewardedAsync resolving true → rewarded (exactly one show call)", async () => {
  const nativeModule = createMockNativeModule({ showResult: true });
  const core = createRewardedAdsCore(baseEnv({ nativeModule }));

  const result = await core.showRewardedHelperAd("shuffle");
  assert.deepEqual(result, { status: "rewarded" });
  assert.equal(nativeModule.showCalls.length, 1);
  assert.deepEqual(nativeModule.showCalls[0], [
    "adunit-abc",
    "helper_shuffle",
  ]);
});

test("showRewardedAsync resolving false → skipped", async () => {
  const nativeModule = createMockNativeModule({ showResult: false });
  const core = createRewardedAdsCore(baseEnv({ nativeModule }));

  const result = await core.showRewardedHelperAd("bomb");
  assert.deepEqual(result, {
    status: "skipped",
    message: "Finish the ad to earn +1 helper use.",
  });
  assert.equal(nativeModule.showCalls.length, 1);
});

test("showRewardedAsync rejecting → error", async () => {
  const nativeModule = createMockNativeModule({
    showResult: () => Promise.reject(new Error("no fill")),
  });
  const core = createRewardedAdsCore(baseEnv({ nativeModule }));

  const result = await core.showRewardedHelperAd("hint");
  assert.deepEqual(result, {
    status: "error",
    message: "No ad is available right now. Please try again soon.",
  });
  assert.equal(nativeModule.showCalls.length, 1);
});

test("no privacy declaration by default; isDev forwarded as initialize testMode", async () => {
  const nativeModule = createMockNativeModule({ showResult: true });
  const core = createRewardedAdsCore(baseEnv({ nativeModule, isDev: true }));

  await core.showRewardedHelperAd("shuffle");
  // Default posture makes no privacy declarations (a future CMP may opt in).
  assert.equal(nativeModule.configurePrivacyCalls.length, 0);
  // isDev is forwarded as the initialize testMode flag.
  assert.deepEqual(nativeModule.initializeCalls[0], ["appkey-123", true]);
});

test("canShowRewardedHelperAds true only when fully configured on android", () => {
  assert.equal(createRewardedAdsCore(baseEnv()).canShowRewardedHelperAds(), true);
});
