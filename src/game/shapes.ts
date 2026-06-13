import { blockColors } from '../theme/theme';
import { Shape } from './types';

// Raw shape templates as [row, col] offsets. Kept small/medium so the
// 8x8 board stays playable and tactical.
const TEMPLATES: [number, number][][] = [
  // Singles & lines
  [[0, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  // Vertical lines
  [[0, 0], [1, 0]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  // Squares
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
  // L / J corners (small)
  [[0, 0], [1, 0], [1, 1]],
  [[0, 1], [1, 1], [1, 0]],
  [[0, 0], [0, 1], [1, 0]],
  [[0, 0], [0, 1], [1, 1]],
  // L / J (tall)
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 1], [1, 1], [2, 1], [2, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  // T pieces
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[0, 1], [1, 0], [1, 1], [1, 2]],
  // S / Z
  [[0, 1], [0, 2], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 1], [1, 2]],
];

let counter = 0;

function normalize(cells: [number, number][]): {
  cells: [number, number][];
  width: number;
  height: number;
} {
  const minR = Math.min(...cells.map((c) => c[0]));
  const minC = Math.min(...cells.map((c) => c[1]));
  const shifted = cells.map(
    ([r, c]) => [r - minR, c - minC] as [number, number]
  );
  const height = Math.max(...shifted.map((c) => c[0])) + 1;
  const width = Math.max(...shifted.map((c) => c[1])) + 1;
  return { cells: shifted, width, height };
}

/** Build a concrete Shape from a template index with a given color. */
export function makeShape(templateIndex: number, colorIndex: number): Shape {
  const { cells, width, height } = normalize(TEMPLATES[templateIndex]);
  counter += 1;
  return {
    id: `s${counter}`,
    cells,
    colorIndex,
    width,
    height,
  };
}

/** A random shape with a random color. */
export function randomShape(): Shape {
  const t = Math.floor(Math.random() * TEMPLATES.length);
  const colorIndex = Math.floor(Math.random() * blockColors.length);
  return makeShape(t, colorIndex);
}

/** A fresh tray of 3 random shapes. */
export function randomTray(): Shape[] {
  return [randomShape(), randomShape(), randomShape()];
}

export const TEMPLATE_COUNT = TEMPLATES.length;
