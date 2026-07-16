import { BOARD_SIZE, blockColors } from "../theme/theme";
import type { Board, Shape } from "./types";
import type { HelperCounts, RewardedHelperUsage } from "./helpers";
import { isGameOver } from "./logic";

export const RUN_STATE_VERSION = 1;

export interface SavedRunState {
  version: typeof RUN_STATE_VERSION;
  board: Board;
  tray: (Shape | null)[];
  score: number;
  comboStreak: number;
  runBestChain: number;
  biggestBlast: number;
  helpers: HelperCounts;
  rewardUsage: RewardedHelperUsage;
  gameOver: boolean;
  savedAt: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isBoard(value: unknown): value is Board {
  return (
    Array.isArray(value) &&
    value.length === BOARD_SIZE &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === BOARD_SIZE &&
        row.every(
          (cell) =>
            cell === null ||
            (Number.isInteger(cell) &&
              Number(cell) >= 0 &&
              Number(cell) < blockColors.length),
        ),
    )
  );
}

function isShape(value: unknown): value is Shape {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    value.id.length === 0 ||
    value.id.length > 80
  ) {
    return false;
  }
  if (
    !Number.isInteger(value.colorIndex) ||
    Number(value.colorIndex) < 0 ||
    Number(value.colorIndex) >= blockColors.length ||
    !Number.isInteger(value.width) ||
    Number(value.width) < 1 ||
    Number(value.width) > BOARD_SIZE ||
    !Number.isInteger(value.height) ||
    Number(value.height) < 1 ||
    Number(value.height) > BOARD_SIZE ||
    !Array.isArray(value.cells) ||
    value.cells.length < 1 ||
    value.cells.length > BOARD_SIZE * BOARD_SIZE
  ) {
    return false;
  }

  const validCells = value.cells.every(
    (cell) =>
      Array.isArray(cell) &&
      cell.length === 2 &&
      Number.isInteger(cell[0]) &&
      Number.isInteger(cell[1]) &&
      cell[0] >= 0 &&
      cell[0] < Number(value.height) &&
      cell[1] >= 0 &&
      cell[1] < Number(value.width),
  );
  if (!validCells) return false;

  const coordinates = value.cells as [number, number][];
  const uniqueCells = new Set(coordinates.map(([row, col]) => `${row},${col}`));
  if (uniqueCells.size !== coordinates.length) return false;

  const rows = coordinates.map(([row]) => row);
  const cols = coordinates.map(([, col]) => col);
  return (
    Math.min(...rows) === 0 &&
    Math.min(...cols) === 0 &&
    Math.max(...rows) + 1 === Number(value.height) &&
    Math.max(...cols) + 1 === Number(value.width)
  );
}

function isHelperCounts(value: unknown): value is HelperCounts {
  if (!isRecord(value)) return false;
  return ["shuffle", "bomb", "hint"].every(
    (key) => isNonNegativeInteger(value[key]) && Number(value[key]) <= 3,
  );
}

function isRewardUsage(value: unknown): value is RewardedHelperUsage {
  if (!isRecord(value)) return false;
  return ["shuffle", "bomb", "hint"].every(
    (key) => isNonNegativeInteger(value[key]) && Number(value[key]) <= 1,
  );
}

export function parseSavedRunState(value: unknown): SavedRunState | null {
  if (!isRecord(value) || value.version !== RUN_STATE_VERSION) return null;
  if (!isBoard(value.board)) return null;
  if (
    !Array.isArray(value.tray) ||
    value.tray.length !== 3 ||
    !value.tray.every((shape) => shape === null || isShape(shape)) ||
    value.tray.every((shape) => shape === null)
  ) {
    return null;
  }
  if (
    !isNonNegativeInteger(value.score) ||
    !isNonNegativeInteger(value.comboStreak) ||
    !isNonNegativeInteger(value.runBestChain) ||
    Number(value.comboStreak) > Number(value.runBestChain) ||
    !isNonNegativeInteger(value.biggestBlast) ||
    !isHelperCounts(value.helpers) ||
    !isRewardUsage(value.rewardUsage) ||
    typeof value.gameOver !== "boolean" ||
    !isNonNegativeInteger(value.savedAt)
  ) {
    return null;
  }

  const parsed = value as unknown as SavedRunState;
  return {
    ...parsed,
    gameOver: isGameOver(parsed.board, parsed.tray),
  };
}
