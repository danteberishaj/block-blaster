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

/**
 * All cells orthogonally connected to (r,c) that share its color — i.e. the
 * whole contiguous block "shape" you tapped. Empty cell -> [].
 */
export function connectedSameColor(
  board: Board,
  r: number,
  c: number
): [number, number][] {
  const color = board[r][c];
  if (color === null) return [];
  const out: [number, number][] = [];
  const seen = new Set<string>();
  const stack: [number, number][] = [[r, c]];
  while (stack.length) {
    const [cr, cc] = stack.pop()!;
    if (cr < 0 || cr >= BOARD_SIZE || cc < 0 || cc >= BOARD_SIZE) continue;
    const key = `${cr},${cc}`;
    if (seen.has(key)) continue;
    if (board[cr][cc] !== color) continue;
    seen.add(key);
    out.push([cr, cc]);
    stack.push([cr + 1, cc], [cr - 1, cc], [cr, cc + 1], [cr, cc - 1]);
  }
  return out;
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
