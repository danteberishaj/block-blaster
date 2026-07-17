import React, { useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BOARD_SIZE, palette, radii } from "../theme/theme";
import { canPlace } from "../game/logic";
import type { Board, CellValue, Shape } from "../game/types";
import Block from "./Block";

export interface GridLayout {
  x: number;
  y: number;
  cell: number;
}

export interface PreviewState {
  cells: [number, number][];
  valid: boolean;
  colorIndex: number;
  clearCells: [number, number][];
}

interface Props {
  board: Board;
  cellSize: number;
  preview: PreviewState | null;
  hint: [number, number][] | null;
  bombArmed: boolean;
  selectedShape: Shape | null;
  onCellTap: (row: number, col: number) => void;
  onSelectedPlacement: (row: number, col: number) => void;
  onLayoutMeasured: (layout: GridLayout) => void;
}

const PAD = 6;
const BORDER = 2;

function formatColumns(columns: number[]): string {
  if (columns.length === 1) return `${columns[0]}`;
  if (columns.length === 2) return `${columns[0]} and ${columns[1]}`;
  return `${columns.slice(0, -1).join(", ")}, and ${columns[columns.length - 1]}`;
}

function describeRow(row: CellValue[], rowIndex: number): string {
  const occupiedColumns: number[] = [];
  const emptyColumns: number[] = [];

  row.forEach((value, col) => {
    (value === null ? emptyColumns : occupiedColumns).push(col + 1);
  });

  if (occupiedColumns.length === 0) {
    return `Row ${rowIndex + 1}, all ${row.length} cells empty.`;
  }
  if (emptyColumns.length === 0) {
    return `Row ${rowIndex + 1}, all ${row.length} cells occupied.`;
  }

  return `Row ${rowIndex + 1}, occupied columns ${formatColumns(occupiedColumns)}; empty columns ${formatColumns(emptyColumns)}.`;
}

interface GridCellVisualProps {
  cellSize: number;
  value: CellValue;
  isPreviewValid: boolean;
  isPreviewInvalid: boolean;
  previewColorIndex: number | null;
  isClearPreview: boolean;
  isHint: boolean;
  validAnchor: boolean;
}

function GridCellVisual({
  cellSize,
  value,
  isPreviewValid,
  isPreviewInvalid,
  previewColorIndex,
  isClearPreview,
  isHint,
  validAnchor,
}: GridCellVisualProps) {
  return (
    <>
      <View
        style={[
          styles.slot,
          {
            borderRadius: radii.cell,
            backgroundColor: isPreviewInvalid
              ? palette.previewInvalid
              : isHint
                ? "rgba(255,210,90,0.22)"
                : validAnchor
                  ? "rgba(91,124,255,0.2)"
                  : palette.cellEmpty,
            borderColor: isHint
              ? palette.gold
              : validAnchor
                ? palette.accent
                : palette.cellEmptyBorder,
            borderWidth: isHint || validAnchor ? 2 : 1,
          },
        ]}
      />

      {value !== null && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Block colorIndex={value} size={cellSize} />
          {isClearPreview && (
            <View style={[StyleSheet.absoluteFill, styles.clearRing]} />
          )}
        </View>
      )}

      {isPreviewValid && value === null && previewColorIndex !== null && (
        <View
          style={[StyleSheet.absoluteFill, styles.ghost]}
          pointerEvents="none"
        >
          <Block colorIndex={previewColorIndex} size={cellSize} />
        </View>
      )}
    </>
  );
}

function Grid({
  board,
  cellSize,
  preview,
  hint,
  bombArmed,
  selectedShape,
  onCellTap,
  onSelectedPlacement,
  onLayoutMeasured,
}: Props) {
  const ref = useRef<View>(null);
  const placementMode = selectedShape !== null;
  const rowSummariesEnabled = !bombArmed && !placementMode;
  const occupiedCount = board.reduce<number>(
    (count, row) => count + row.filter((value) => value !== null).length,
    0,
  );
  const boardSummary = `Board, ${BOARD_SIZE} rows by ${BOARD_SIZE} columns, ${occupiedCount} occupied and ${BOARD_SIZE * BOARD_SIZE - occupiedCount} empty.`;

  const previewKey = new Set(
    (preview?.cells ?? []).map(([row, col]) => `${row},${col}`),
  );
  const hintKey = new Set((hint ?? []).map(([row, col]) => `${row},${col}`));
  const clearKey = new Set(
    (preview?.clearCells ?? []).map(([row, col]) => `${row},${col}`),
  );

  const measure = () => {
    ref.current?.measureInWindow((x, y) => {
      onLayoutMeasured({
        x: x + BORDER + PAD,
        y: y + BORDER + PAD,
        cell: cellSize,
      });
    });
  };

  return (
    <View
      ref={ref}
      onLayout={measure}
      accessible={false}
      style={[
        styles.board,
        {
          padding: PAD,
          borderRadius: radii.card,
          width: cellSize * BOARD_SIZE + PAD * 2 + BORDER * 2,
          borderColor: bombArmed
            ? palette.danger
            : placementMode
              ? palette.accent
              : "transparent",
          borderWidth: BORDER,
        },
      ]}
    >
      <LinearGradient
        colors={palette.boardGradient}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.innerGlow} />

      {Array.from({ length: BOARD_SIZE }).map((_, row) => (
        <View
          key={row}
          accessible={rowSummariesEnabled}
          accessibilityRole={row === 0 ? "summary" : "text"}
          accessibilityLabel={`${row === 0 ? `${boardSummary} ` : ""}${describeRow(board[row], row)}`}
          accessibilityHint={
            row === 0 && rowSummariesEnabled
              ? "Swipe right to inspect each remaining board row"
              : undefined
          }
          style={styles.row}
        >
          {Array.from({ length: BOARD_SIZE }).map((__, col) => {
            const value = board[row][col];
            const key = `${row},${col}`;
            const isPreview = previewKey.has(key);
            const isClearPreview = clearKey.has(key);
            const isHint = hintKey.has(key);
            const validAnchor = selectedShape
              ? canPlace(board, selectedShape, row, col)
              : false;
            const interactive = bombArmed ? value !== null : validAnchor;
            const cellState = value === null ? "empty" : "filled";
            const actionDescription = bombArmed
              ? "break this block"
              : "valid placement";
            const cellStyle = { width: cellSize, height: cellSize };
            const cellContents = (
              <GridCellVisual
                cellSize={cellSize}
                value={value}
                isPreviewValid={isPreview && preview?.valid === true}
                isPreviewInvalid={isPreview && preview?.valid === false}
                previewColorIndex={preview?.colorIndex ?? null}
                isClearPreview={isClearPreview}
                isHint={isHint}
                validAnchor={validAnchor}
              />
            );

            if (!interactive) {
              return (
                <View key={col} style={cellStyle}>
                  {cellContents}
                </View>
              );
            }

            return (
              <Pressable
                key={col}
                accessibilityRole="button"
                accessibilityLabel={`Row ${row + 1}, column ${col + 1}, ${cellState}, ${actionDescription}`}
                onPress={() => {
                  if (bombArmed) onCellTap(row, col);
                  else if (selectedShape) onSelectedPlacement(row, col);
                }}
                style={cellStyle}
              >
                {cellContents}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: palette.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
  },
  innerGlow: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 8,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  row: { flexDirection: "row" },
  slot: {
    position: "absolute",
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
  },
  ghost: { opacity: 0.5 },
  clearRing: {
    margin: 3,
    borderRadius: radii.cell,
    borderWidth: 1.5,
    borderColor: palette.success,
    opacity: 0.74,
  },
});

export default React.memo(Grid);
