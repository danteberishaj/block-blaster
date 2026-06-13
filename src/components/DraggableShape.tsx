import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { BOARD_SIZE } from '../theme/theme';
import { Shape } from '../game/types';
import ShapeView from './ShapeView';

// How far above the fingertip the dragged piece floats so it stays visible.
export const LIFT_FACTOR = 1.0;

// How far (in cells) the piece can hang off the board edge and still snap on.
const SNAP_TOLERANCE = 1.1;

interface Props {
  shape: Shape;
  index: number;
  trayCell: number;
  boardCell: number;
  isDragging: boolean;
  enabled: boolean;
  highlight: boolean;
  // shared drag state (owned by GameScreen)
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  dragActive: SharedValue<number>;
  dragW: SharedValue<number>;
  dragH: SharedValue<number>;
  gridX: SharedValue<number>;
  gridY: SharedValue<number>;
  lastKey: SharedValue<number>;
  // JS callbacks
  onStart: (index: number) => void;
  onMove: (row: number, col: number, index: number) => void;
  onEnd: (index: number, row: number, col: number) => void;
}

function DraggableShape(props: Props) {
  const {
    shape,
    index,
    trayCell,
    boardCell,
    isDragging,
    enabled,
    highlight,
    dragX,
    dragY,
    dragActive,
    dragW,
    dragH,
    gridX,
    gridY,
    lastKey,
    onStart,
    onMove,
    onEnd,
  } = props;

  const w = shape.width;
  const h = shape.height;
  const lift = boardCell * LIFT_FACTOR;

  // Map a finger position to the nearest fully-on-board top-left cell.
  // Returns row/col = -1 when the piece is too far off the board (a cancel).
  const computeCell = (x: number, y: number) => {
    'worklet';
    const pieceLeft = x - (w * boardCell) / 2;
    const pieceTop = y - h * boardCell - lift;
    const rawCol = (pieceLeft - gridX.value) / boardCell;
    const rawRow = (pieceTop - gridY.value) / boardCell;
    const maxCol = BOARD_SIZE - w;
    const maxRow = BOARD_SIZE - h;
    const onBoard =
      rawCol >= -SNAP_TOLERANCE &&
      rawCol <= maxCol + SNAP_TOLERANCE &&
      rawRow >= -SNAP_TOLERANCE &&
      rawRow <= maxRow + SNAP_TOLERANCE;
    if (!onBoard) return { row: -1, col: -1 };
    const col = Math.max(0, Math.min(maxCol, Math.round(rawCol)));
    const row = Math.max(0, Math.min(maxRow, Math.round(rawRow)));
    return { row, col };
  };

  const pan = Gesture.Pan()
    .enabled(enabled)
    .minDistance(0)
    .onStart((e) => {
      'worklet';
      dragX.value = e.absoluteX;
      dragY.value = e.absoluteY;
      dragW.value = w;
      dragH.value = h;
      dragActive.value = 1;
      lastKey.value = -9999;
      runOnJS(onStart)(index);
    })
    .onUpdate((e) => {
      'worklet';
      dragX.value = e.absoluteX;
      dragY.value = e.absoluteY;
      const { row, col } = computeCell(e.absoluteX, e.absoluteY);
      const key = row < 0 ? -1 : row * 100 + col;
      if (key !== lastKey.value) {
        lastKey.value = key;
        runOnJS(onMove)(row, col, index);
      }
    })
    .onEnd((e) => {
      'worklet';
      const { row, col } = computeCell(e.absoluteX, e.absoluteY);
      dragActive.value = 0;
      runOnJS(onEnd)(index, row, col);
    })
    .onFinalize(() => {
      'worklet';
      dragActive.value = 0;
    });

  // Pulse when this piece is the hint.
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (highlight) {
      pulse.value = withRepeat(
        withTiming(1.12, { duration: 460 }),
        -1,
        true
      );
    } else {
      pulse.value = withTiming(1, { duration: 160 });
    }
  }, [highlight]);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          {
            opacity: isDragging ? 0 : 1,
            alignItems: 'center',
            justifyContent: 'center',
          },
          pulseStyle,
        ]}
      >
        <ShapeView shape={shape} cell={trayCell} />
      </Animated.View>
    </GestureDetector>
  );
}

export default React.memo(DraggableShape);
