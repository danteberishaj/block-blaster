import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BOARD_SIZE, palette, radii } from '../theme/theme';
import { Board } from '../game/types';
import Block from './Block';

export interface GridLayout {
  x: number; // window x of the inner grid (cells area)
  y: number; // window y of the inner grid
  cell: number;
}

export interface PreviewState {
  cells: [number, number][];
  valid: boolean;
  colorIndex: number;
}

interface Props {
  board: Board;
  cellSize: number;
  preview: PreviewState | null;
  hint: [number, number][] | null;
  bombArmed: boolean;
  onCellTap: (row: number, col: number) => void;
  /** Called once measured in the window so drag math can map coords -> cells. */
  onLayoutMeasured: (layout: GridLayout) => void;
}

const PAD = 6; // inner padding around the cell area
const BORDER = 2; // constant border (color changes when bomb is armed)

function Grid({
  board,
  cellSize,
  preview,
  hint,
  bombArmed,
  onCellTap,
  onLayoutMeasured,
}: Props) {
  const ref = useRef<View>(null);

  const previewKey = new Set(
    (preview?.cells ?? []).map(([r, c]) => `${r},${c}`)
  );
  const hintKey = new Set((hint ?? []).map(([r, c]) => `${r},${c}`));

  const measure = () => {
    ref.current?.measureInWindow((x, y, _w, _h) => {
      // cell area starts after the border + padding
      onLayoutMeasured({
        x: x + BORDER + PAD,
        y: y + BORDER + PAD,
        cell: cellSize,
      });
    });
  };

  // Tap-to-break: tolerant of small finger movement so it fires reliably.
  const tap = Gesture.Tap()
    .runOnJS(true)
    .maxDistance(cellSize)
    .maxDuration(600)
    .onEnd((e, success) => {
      if (!success) return;
      const c = Math.floor(e.x / cellSize);
      const r = Math.floor(e.y / cellSize);
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) onCellTap(r, c);
    });

  const inner = (
    <View>
      {Array.from({ length: BOARD_SIZE }).map((_, r) => (
        <View key={r} style={styles.row}>
          {Array.from({ length: BOARD_SIZE }).map((__, c) => {
            const value = board[r][c];
            const isPreview = previewKey.has(`${r},${c}`);
            const isHint = hintKey.has(`${r},${c}`);
            return (
              <View key={c} style={{ width: cellSize, height: cellSize }}>
                {/* empty slot */}
                <View
                  style={[
                    styles.slot,
                    {
                      borderRadius: radii.cell,
                      backgroundColor:
                        isPreview && !preview!.valid
                          ? palette.previewInvalid
                          : isHint
                          ? 'rgba(255,210,90,0.22)'
                          : palette.cellEmpty,
                      borderColor: isHint
                        ? palette.gold
                        : palette.cellEmptyBorder,
                      borderWidth: isHint ? 2 : 1,
                    },
                  ]}
                />
                {/* filled block */}
                {value !== null && (
                  <View style={StyleSheet.absoluteFill}>
                    <Block colorIndex={value} size={cellSize} />
                  </View>
                )}
                {/* valid placement ghost (colored, semi-transparent) */}
                {isPreview && preview!.valid && value === null && (
                  <View style={[StyleSheet.absoluteFill, styles.ghost]}>
                    <Block colorIndex={preview!.colorIndex} size={cellSize} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );

  return (
    <View
      ref={ref}
      onLayout={measure}
      style={[
        styles.board,
        {
          padding: PAD,
          borderRadius: radii.card,
          width: cellSize * BOARD_SIZE + PAD * 2 + BORDER * 2,
          borderColor: bombArmed ? palette.danger : 'transparent',
          borderWidth: BORDER,
        },
      ]}
    >
      {bombArmed ? (
        <GestureDetector gesture={tap}>{inner}</GestureDetector>
      ) : (
        inner
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: palette.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  row: { flexDirection: 'row' },
  slot: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
  },
  ghost: {
    opacity: 0.5,
  },
});

export default React.memo(Grid);
