import assert from "node:assert/strict";
import test from "node:test";
import {
  createRewardedHelperUsage,
  createStartingHelpers,
} from "../src/game/helpers";
import { createEmptyBoard } from "../src/game/logic";
import {
  parseSavedRunState,
  RUN_STATE_VERSION,
  type SavedRunState,
} from "../src/game/runState";
import type { Board, Shape } from "../src/game/types";

const single: Shape = {
  id: "saved-single",
  cells: [[0, 0]],
  colorIndex: 0,
  width: 1,
  height: 1,
};

function validState(): SavedRunState {
  return {
    version: RUN_STATE_VERSION,
    board: createEmptyBoard(),
    tray: [single, null, null],
    score: 42,
    comboStreak: 2,
    runBestChain: 3,
    biggestBlast: 24,
    helpers: createStartingHelpers(),
    rewardUsage: createRewardedHelperUsage(),
    gameOver: false,
    savedAt: 1_700_000_000_000,
  };
}

test("a coherent current-version run is accepted", () => {
  const state = validState();
  assert.deepEqual(parseSavedRunState(state), state);
});

test("wrong versions, malformed boards, and invalid helper values are rejected", () => {
  const state = validState();
  assert.equal(parseSavedRunState({ ...state, version: 99 }), null);
  assert.equal(parseSavedRunState({ ...state, board: [[null]] }), null);
  assert.equal(
    parseSavedRunState({
      ...state,
      helpers: { ...state.helpers, bomb: 4 },
    }),
    null,
  );
  assert.equal(
    parseSavedRunState({
      ...state,
      rewardUsage: { ...state.rewardUsage, shuffle: 2 },
    }),
    null,
  );
});

test("invalid tray shapes and unsafe numeric values are rejected", () => {
  const state = validState();
  assert.equal(
    parseSavedRunState({
      ...state,
      tray: [{ ...single, colorIndex: 999 }, null, null],
    }),
    null,
  );
  assert.equal(parseSavedRunState({ ...state, score: Number.NaN }), null);
  assert.equal(parseSavedRunState({ ...state, savedAt: -1 }), null);
});

test("duplicate shape cells and an empty tray are rejected", () => {
  const state = validState();
  assert.equal(
    parseSavedRunState({
      ...state,
      tray: [
        {
          ...single,
          cells: [
            [0, 0],
            [0, 0],
          ],
        },
        null,
        null,
      ],
    }),
    null,
  );
  assert.equal(
    parseSavedRunState({ ...state, tray: [null, null, null] }),
    null,
  );
});

test("combo streak cannot exceed the best chain for the run", () => {
  const state = validState();
  assert.equal(
    parseSavedRunState({ ...state, comboStreak: 4, runBestChain: 3 }),
    null,
  );
});

test("game-over state is derived from the board and tray", () => {
  const playable = validState();
  assert.equal(
    parseSavedRunState({ ...playable, gameOver: true })?.gameOver,
    false,
  );

  const fullBoard = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => 0),
  ) as Board;
  assert.equal(
    parseSavedRunState({ ...playable, board: fullBoard, gameOver: false })
      ?.gameOver,
    true,
  );
});
