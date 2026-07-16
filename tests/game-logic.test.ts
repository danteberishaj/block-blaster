import assert from "node:assert/strict";
import test from "node:test";
import {
  canPlace,
  clearLines,
  createEmptyBoard,
  findHint,
  isGameOver,
  placeShape,
  randomTrayForBoard,
  scoreMove,
  shuffleTrayForBoard,
} from "../src/game/logic";
import type { Board, Shape } from "../src/game/types";

function shape(
  id: string,
  cells: [number, number][],
  width: number,
  height: number,
): Shape {
  return { id, cells, width, height, colorIndex: 0 };
}

const single = shape("single", [[0, 0]], 1, 1);
const horizontalTwo = shape(
  "horizontal-two",
  [
    [0, 0],
    [0, 1],
  ],
  2,
  1,
);

test("placement respects bounds, collisions, and board immutability", () => {
  const board = createEmptyBoard();
  assert.equal(canPlace(board, horizontalTwo, 0, 6), true);
  assert.equal(canPlace(board, horizontalTwo, 0, 7), false);

  const placed = placeShape(board, horizontalTwo, 0, 6);
  assert.equal(board[0][6], null);
  assert.equal(placed[0][6], 0);
  assert.equal(placed[0][7], 0);
  assert.equal(canPlace(placed, single, 0, 7), false);
});

test("cross clears count two lines and deduplicate their shared cell", () => {
  const board = createEmptyBoard();
  for (let col = 0; col < 8; col += 1) board[3][col] = 1;
  for (let row = 0; row < 8; row += 1) board[row][4] = 2;

  const result = clearLines(board);
  assert.deepEqual(result.rows, [3]);
  assert.deepEqual(result.cols, [4]);
  assert.equal(result.lineCount, 2);
  assert.equal(result.clearedCells.length, 15);
  assert.equal(
    result.board[3].every((cell) => cell === null),
    true,
  );
  assert.equal(
    result.board.every((row) => row[4] === null),
    true,
  );
});

test("scoring escalates simultaneous clears and consecutive clear moves", () => {
  assert.equal(scoreMove(4, 0, 0), 4);
  assert.equal(scoreMove(4, 1, 1), 14);
  assert.equal(scoreMove(4, 1, 2), 24);
  assert.equal(scoreMove(5, 2, 3), 125);
});

test("game over only occurs when every remaining tray shape is blocked", () => {
  const board: Board = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => 0),
  );
  board[0][0] = null;

  assert.equal(isGameOver(board, [horizontalTwo, null, null]), true);
  assert.equal(isGameOver(board, [horizontalTwo, single, null]), false);
  assert.equal(isGameOver(board, [null, null, null]), false);
});

test("hints prefer a move that immediately clears a line", () => {
  const board = createEmptyBoard();
  for (let col = 0; col < 7; col += 1) board[7][col] = 1;

  assert.deepEqual(findHint(board, [horizontalTwo, single, null]), {
    shapeIndex: 1,
    row: 7,
    col: 7,
  });
});

test("tray repair prevents an immediately dead deal when a repair exists", () => {
  const board: Board = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => 0),
  );
  board[0][0] = null;

  const repaired = randomTrayForBoard(
    board,
    () => [horizontalTwo, horizontalTwo, horizontalTwo],
    () => [single],
  );
  assert.equal(
    repaired.some((candidate) => candidate.id === single.id),
    true,
  );
  assert.equal(isGameOver(board, repaired), false);
});

test("shuffle repair aims for two useful pieces", () => {
  const board: Board = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => 0),
  );
  board[0][0] = null;

  const repaired = shuffleTrayForBoard(
    board,
    () => [horizontalTwo, horizontalTwo, horizontalTwo],
    () => [single],
    2,
  );
  assert.equal(
    repaired.filter((candidate) => candidate.id === single.id).length,
    2,
  );
});
