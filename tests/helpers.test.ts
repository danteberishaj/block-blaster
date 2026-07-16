import assert from "node:assert/strict";
import test from "node:test";
import {
  canEarnRewardedHelperUse,
  createRewardedHelperUsage,
  createStartingHelpers,
  recordRewardedHelperUse,
} from "../src/game/helpers";

test("each run begins with three uses per helper and no ad rewards used", () => {
  assert.deepEqual(createStartingHelpers(), {
    shuffle: 3,
    bomb: 3,
    hint: 3,
  });
  assert.deepEqual(createRewardedHelperUsage(), {
    shuffle: 0,
    bomb: 0,
    hint: 0,
  });
});

test("rewarded helper use is immutable and capped at one per helper per run", () => {
  const initial = createRewardedHelperUsage();
  const rewarded = recordRewardedHelperUse(initial, "hint");
  const capped = recordRewardedHelperUse(rewarded, "hint");

  assert.equal(initial.hint, 0);
  assert.equal(rewarded.hint, 1);
  assert.equal(capped.hint, 1);
  assert.equal(canEarnRewardedHelperUse(rewarded, "hint"), false);
  assert.equal(canEarnRewardedHelperUse(rewarded, "bomb"), true);
});
