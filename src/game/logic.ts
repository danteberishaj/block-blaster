import { BOARD_SIZE } from '../theme/theme';
import { Board, Shape } from './types';

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

/** Can `shape` be placed with its top-left at (row, col)? */
export function canPlace(
  board: Board,
  shape: Shape,
  row: number,
  col: number
): boolean {
  for (const [dr, dc] of shape.cells) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
    if (board[r][c] !== null) return false;
  }
  return true;
}

/** Place the shape (assumes canPlace already true). Returns a new board. */
export function placeShape(
  board: Board,
  shape: Shape,
  row: number,
  col: number
): Board {
  const next = cloneBoard(board);
  for (const [dr, dc] of shape.cells) {
    next[row + dr][col + dc] = shape.colorIndex;
  }
  return next;
}

export interface ClearResult {
  board: Board;
  rows: number[]; // cleared row indices
  cols: number[]; // cleared col indices
  clearedCells: [number, number][]; // every cell that got cleared
  lineCount: number;
}

/** Detect and clear any full rows/columns. Returns the new board + what cleared. */
export function clearLines(board: Board): ClearResult {
  const fullRows: number[] = [];
  const fullCols: number[] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    if (board[r].every((c) => c !== null)) fullRows.push(r);
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    let full = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[r][c] === null) {
        full = false;
        break;
      }
    }
    if (full) fullCols.push(c);
  }

  const next = cloneBoard(board);
  const clearedSet = new Set<string>();
  const clearedCells: [number, number][] = [];

  for (const r of fullRows) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      next[r][c] = null;
      const key = `${r},${c}`;
      if (!clearedSet.has(key)) {
        clearedSet.add(key);
        clearedCells.push([r, c]);
      }
    }
  }
  for (const c of fullCols) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      next[r][c] = null;
      const key = `${r},${c}`;
      if (!clearedSet.has(key)) {
        clearedSet.add(key);
        clearedCells.push([r, c]);
      }
    }
  }

  return {
    board: next,
    rows: fullRows,
    cols: fullCols,
    clearedCells,
    lineCount: fullRows.length + fullCols.length,
  };
}

/** Is there anywhere on the board this shape can legally go? */
export function canPlaceAnywhere(board: Board, shape: Shape): boolean {
  for (let r = 0; r <= BOARD_SIZE - shape.height; r++) {
    for (let c = 0; c <= BOARD_SIZE - shape.width; c++) {
      if (canPlace(board, shape, r, c)) return true;
    }
  }
  return false;
}

/** First legal top-left position for a shape, scanning top-left to bottom-right. */
export function findPlacement(
  board: Board,
  shape: Shape
): { row: number; col: number } | null {
  for (let r = 0; r <= BOARD_SIZE - shape.height; r++) {
    for (let c = 0; c <= BOARD_SIZE - shape.width; c++) {
      if (canPlace(board, shape, r, c)) return { row: r, col: c };
    }
  }
  return null;
}

/** A hint: which tray shape can be placed, and where. Prefers shapes that clear lines. */
export function findHint(
  board: Board,
  tray: (Shape | null)[]
): { shapeIndex: number; row: number; col: number } | null {
  let fallback: { shapeIndex: number; row: number; col: number } | null = null;
  for (let i = 0; i < tray.length; i++) {
    const shape = tray[i];
    if (!shape) continue;
    for (let r = 0; r <= BOARD_SIZE - shape.height; r++) {
      for (let c = 0; c <= BOARD_SIZE - shape.width; c++) {
        if (!canPlace(board, shape, r, c)) continue;
        // Prefer a placement that immediately clears a line.
        const after = clearLines(placeShape(board, shape, r, c));
        if (after.lineCount > 0) return { shapeIndex: i, row: r, col: c };
        if (!fallback) fallback = { shapeIndex: i, row: r, col: c };
      }
    }
  }
  return fallback;
}

export interface ShapeOpportunity {
  placements: number;
  maxImmediateLineClear: number;
}

export interface TrayOpportunity {
  playableCount: number;
  totalPlacements: number;
  clearCapableCount: number;
  maxImmediateLineClear: number;
  dead: boolean;
}

export function analyzeShapeOpportunity(
  board: Board,
  shape: Shape
): ShapeOpportunity {
  let placements = 0;
  let maxImmediateLineClear = 0;

  for (let r = 0; r <= BOARD_SIZE - shape.height; r++) {
    for (let c = 0; c <= BOARD_SIZE - shape.width; c++) {
      if (!canPlace(board, shape, r, c)) continue;
      placements += 1;

      const clear = clearLines(placeShape(board, shape, r, c)).lineCount;
      maxImmediateLineClear = Math.max(maxImmediateLineClear, clear);
    }
  }

  return { placements, maxImmediateLineClear };
}

export function analyzeTrayOpportunity(
  board: Board,
  tray: Shape[]
): TrayOpportunity {
  const shapeStats = tray.map((shape) => analyzeShapeOpportunity(board, shape));
  const playableCount = shapeStats.filter((stats) => stats.placements > 0).length;
  const totalPlacements = shapeStats.reduce(
    (sum, stats) => sum + stats.placements,
    0
  );
  const clearCapableCount = shapeStats.filter(
    (stats) => stats.maxImmediateLineClear > 0
  ).length;
  const maxImmediateLineClear = shapeStats.reduce(
    (max, stats) => Math.max(max, stats.maxImmediateLineClear),
    0
  );

  return {
    playableCount,
    totalPlacements,
    clearCapableCount,
    maxImmediateLineClear,
    dead: playableCount === 0,
  };
}

function chooseRepairShape(board: Board, candidates: Shape[]): Shape | null {
  const playable = candidates
    .map((shape) => ({ shape, stats: analyzeShapeOpportunity(board, shape) }))
    .filter(({ stats }) => stats.placements > 0)
    .sort((a, b) => {
      if (a.stats.maxImmediateLineClear !== b.stats.maxImmediateLineClear) {
        return a.stats.maxImmediateLineClear - b.stats.maxImmediateLineClear;
      }
      if (a.stats.placements !== b.stats.placements) {
        return a.stats.placements - b.stats.placements;
      }
      return b.shape.cells.length - a.shape.cells.length;
    });

  return playable[0]?.shape ?? null;
}

/** Deal raw random trays unless the first deal is immediately dead. */
export function randomTrayForBoard(
  board: Board,
  makeTray: () => Shape[],
  makeCandidateShapes: () => Shape[]
): Shape[] {
  const tray = makeTray();
  if (!analyzeTrayOpportunity(board, tray).dead) return tray;

  const repair = chooseRepairShape(board, makeCandidateShapes());
  return repair ? [repair, tray[1], tray[2]] : tray;
}

/** Game over when none of the remaining tray shapes fit anywhere. */
export function isGameOver(board: Board, tray: (Shape | null)[]): boolean {
  const remaining = tray.filter((s): s is Shape => s !== null);
  if (remaining.length === 0) return false; // tray will refill
  return remaining.every((s) => !canPlaceAnywhere(board, s));
}

/**
 * Scoring:
 *  - 1 point per placed cell.
 *  - Clearing lines pays `lineCount * 10 * lineCount` (so simultaneous clears
 *    escalate: 1→10, 2→40, 3→90, 4→160).
 *  - That clear bonus is multiplied by the current combo streak (consecutive
 *    moves that each cleared at least one line): x1, x2, x3, ...
 *
 * `comboStreak` is the streak value *for this move* (1 on the first clearing
 * move, 2 on the second consecutive one, and so on).
 */
export function scoreMove(
  placedCells: number,
  lineCount: number,
  comboStreak: number
): number {
  let score = placedCells;
  if (lineCount > 0) {
    const lineBase = lineCount * 10 * lineCount;
    score += lineBase * Math.max(1, comboStreak);
  }
  return score;
}
