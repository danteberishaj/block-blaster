import assert from "node:assert/strict";
import test from "node:test";
import {
  createStorageCore,
  type StorageKV,
} from "../src/storage/storageCore";
import {
  createRewardedHelperUsage,
  createStartingHelpers,
} from "../src/game/helpers";
import { createEmptyBoard } from "../src/game/logic";
import {
  RUN_STATE_VERSION,
  type SavedRunState,
} from "../src/game/runState";
import type { Shape } from "../src/game/types";

const HIGH_SCORE_KEY = "@rowflare/high_score";
const LEGACY_HIGH_SCORE_KEY = "@block_blaster/high_score";
const SOUND_KEY = "@rowflare/sound_on";
const RUN_KEY = "@rowflare/run_v1";

const single: Shape = {
  id: "saved-single",
  cells: [[0, 0]],
  colorIndex: 0,
  width: 1,
  height: 1,
};

function validRun(): SavedRunState {
  return {
    version: RUN_STATE_VERSION,
    board: createEmptyBoard(),
    tray: [single, null, null],
    score: 42,
    comboStreak: 2,
    runBestChain: 3,
    biggestBlast: 4,
    helpers: createStartingHelpers(),
    rewardUsage: createRewardedHelperUsage(),
    gameOver: false,
    savedAt: 1000,
  };
}

interface FakeKV extends StorageKV {
  store: Map<string, string>;
  removed: string[];
}

function createFakeKV(initial: Record<string, string> = {}): FakeKV {
  const store = new Map<string, string>(Object.entries(initial));
  const removed: string[] = [];
  return {
    store,
    removed,
    async getItem(key: string) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    async setItem(key: string, value: string) {
      store.set(key, value);
    },
    async removeItem(key: string) {
      removed.push(key);
      store.delete(key);
    },
  };
}

// A KV whose getItem always throws (used to prove getters fail closed).
function createThrowingKV(): StorageKV {
  return {
    async getItem() {
      throw new Error("kv down");
    },
    async setItem() {
      throw new Error("kv down");
    },
    async removeItem() {
      throw new Error("kv down");
    },
  };
}

test("getSavedRun: corrupt JSON → null and does not crash", async () => {
  const kv = createFakeKV({ [RUN_KEY]: "{ not valid json" });
  const core = createStorageCore(kv);
  const result = await core.getSavedRun();
  assert.equal(result, null);
});

test("getSavedRun: valid JSON but invalid payload → null and removeItem called for run key", async () => {
  const kv = createFakeKV({ [RUN_KEY]: JSON.stringify({ version: 999 }) });
  const core = createStorageCore(kv);
  const result = await core.getSavedRun();
  assert.equal(result, null);
  assert.ok(kv.removed.includes(RUN_KEY), "run key should be removed");
});

test("saveHighScore only writes when higher than stored", async () => {
  const kv = createFakeKV();
  const core = createStorageCore(kv);

  await core.saveHighScore(100);
  assert.equal(kv.store.get(HIGH_SCORE_KEY), "100");

  await core.saveHighScore(50); // lower, ignored
  assert.equal(kv.store.get(HIGH_SCORE_KEY), "100");

  await core.saveHighScore(150); // higher, written
  assert.equal(kv.store.get(HIGH_SCORE_KEY), "150");
});

test("concurrent saveHighScore calls serialize through the queue", async () => {
  const kv = createFakeKV();
  const core = createStorageCore(kv);

  // Fire several without awaiting; the write queue must serialize them so the
  // stored value ends at the maximum regardless of interleaving.
  core.saveHighScore(10);
  core.saveHighScore(300);
  core.saveHighScore(200);
  core.saveHighScore(120);

  assert.equal(await core.getHighScore(), 300);
});

test("legacy-key migration: value only under legacy key is returned and copied", async () => {
  const kv = createFakeKV({ [LEGACY_HIGH_SCORE_KEY]: "777" });
  const core = createStorageCore(kv);

  assert.equal(await core.getHighScore(), 777);
  assert.equal(
    kv.store.get(HIGH_SCORE_KEY),
    "777",
    "value should be copied to the new key",
  );
});

test("getSoundOn defaults to true when unset and respects '0'", async () => {
  const unsetCore = createStorageCore(createFakeKV());
  assert.equal(await unsetCore.getSoundOn(), true);

  const offCore = createStorageCore(createFakeKV({ [SOUND_KEY]: "0" }));
  assert.equal(await offCore.getSoundOn(), false);

  const onCore = createStorageCore(createFakeKV({ [SOUND_KEY]: "1" }));
  assert.equal(await onCore.getSoundOn(), true);
});

test("throwing KV: every getter returns its safe default", async () => {
  const core = createStorageCore(createThrowingKV());
  assert.equal(await core.getHighScore(), 0);
  assert.equal(await core.getBestChain(), 0);
  assert.equal(await core.hasSeenTutorial(), false);
  assert.equal(await core.hasSeenIntro(), false);
  assert.equal(await core.getSoundOn(), true);
  assert.equal(await core.getSavedRun(), null);
  assert.equal(await core.hasSavedRun(), false);
});

test("saveRun then clearSavedRun ordering through the queue → getSavedRun null", async () => {
  const kv = createFakeKV();
  const core = createStorageCore(kv);

  core.saveRun(validRun());
  core.clearSavedRun();

  assert.equal(await core.getSavedRun(), null);
  assert.equal(kv.store.has(RUN_KEY), false);
});

test("saveRun then getSavedRun returns the parsed run", async () => {
  const kv = createFakeKV();
  const core = createStorageCore(kv);

  await core.saveRun(validRun());
  const loaded = await core.getSavedRun();
  assert.ok(loaded);
  assert.equal(loaded?.score, 42);
});
