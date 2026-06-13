// A cell is either empty (null) or holds a color index into blockColors.
export type CellValue = number | null;
export type Board = CellValue[][];

// A shape is a set of filled cell offsets plus the color it paints.
export interface Shape {
  id: string;
  cells: [number, number][]; // [row, col] offsets, normalized to start at 0,0
  colorIndex: number;
  width: number; // bounding-box width in cells
  height: number; // bounding-box height in cells
}
