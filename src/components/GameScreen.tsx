import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { BOARD_SIZE, palette, radii, spacing } from '../theme/theme';
import { Board, Shape } from '../game/types';
import {
  canPlace,
  clearLines,
  cloneBoard,
  connectedSameColor,
  createEmptyBoard,
  findHint,
  isGameOver,
  placeShape,
  scoreMove,
} from '../game/logic';
import { randomTray } from '../game/shapes';
import {
  getHighScore,
  hasSeenTutorial,
  markTutorialSeen,
  saveHighScore,
} from '../storage/storage';

import Grid, { GridLayout, PreviewState } from './Grid';
import DraggableShape, { LIFT_FACTOR } from './DraggableShape';
import ShapeView from './ShapeView';
import Header from './Header';
import GameOverModal from './GameOverModal';
import Tutorial from './Tutorial';
import ClearBurst, { Burst } from './ClearBurst';
import ComboPopup, { ComboData } from './ComboPopup';
import HelperBar, { HelperCounts } from './HelperBar';
import SoundToggle from './SoundToggle';
import { playClear } from '../audio/audio';

const START_HELPERS: HelperCounts = { shuffle: 3, bomb: 3, hint: 3 };

const { width } = Dimensions.get('window');
const H_MARGIN = 14;
const GRID_PAD = 6; // must match Grid's internal PAD
const BOARD_CELL = Math.floor(
  (width - H_MARGIN * 2 - GRID_PAD * 2) / BOARD_SIZE
);
const TRAY_CELL = Math.round(BOARD_CELL * 0.5);

export default function GameScreen({ onHome }: { onHome: () => void }) {
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [tray, setTray] = useState<(Shape | null)[]>(() => randomTray());
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [combos, setCombos] = useState<ComboData[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);

  // Helpers
  const [helpers, setHelpers] = useState<HelperCounts>(START_HELPERS);
  const [bombArmed, setBombArmed] = useState(false);
  const [hintCells, setHintCells] = useState<[number, number][] | null>(null);
  const [hintIndex, setHintIndex] = useState<number | null>(null);

  // Refs mirror state so gesture callbacks stay stable (never recreated mid-drag).
  const boardRef = useRef(board);
  const trayRef = useRef(tray);
  const scoreRef = useRef(score);
  const highScoreRef = useRef(highScore);
  const gridLayoutRef = useRef<GridLayout | null>(null);
  const burstIdRef = useRef(0);
  const comboRef = useRef(0); // consecutive clearing-move streak
  const comboIdRef = useRef(0);
  const helpersRef = useRef(helpers);
  const bombArmedRef = useRef(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shared (UI-thread) drag state.
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragActive = useSharedValue(0);
  const dragW = useSharedValue(1);
  const dragH = useSharedValue(1);
  const gridX = useSharedValue(0);
  const gridY = useSharedValue(0);
  const lastKey = useSharedValue(-9999);

  // Load persisted state on mount.
  useEffect(() => {
    getHighScore().then((h) => {
      highScoreRef.current = h;
      setHighScore(h);
    });
    hasSeenTutorial().then((seen) => setShowTutorial(!seen));
  }, []);

  const onGridMeasured = useCallback(
    (l: GridLayout) => {
      gridLayoutRef.current = l;
      gridX.value = l.x;
      gridY.value = l.y;
    },
    [gridX, gridY]
  );

  const removeBurst = useCallback((id: number) => {
    setBursts((b) => b.filter((x) => x.id !== id));
  }, []);

  const removeCombo = useCallback((id: number) => {
    setCombos((c) => c.filter((x) => x.id !== id));
  }, []);

  // --- gesture callbacks (stable) ---

  const clearHint = useCallback(() => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setHintCells(null);
    setHintIndex(null);
  }, []);

  const handleStart = useCallback(
    (_index: number) => {
      setDraggingIndex(_index);
      clearHint();
      Haptics.selectionAsync().catch(() => {});
    },
    [clearHint]
  );

  const handleMove = useCallback(
    (row: number, col: number, index: number) => {
      const shape = trayRef.current[index];
      if (!shape) return;
      if (row < 0 || col < 0) {
        setPreview(null);
        return;
      }
      const valid = canPlace(boardRef.current, shape, row, col);
      const cells = shape.cells.map(
        ([dr, dc]) => [row + dr, col + dc] as [number, number]
      );
      setPreview({ cells, valid, colorIndex: shape.colorIndex });
    },
    []
  );

  const commitPlacement = useCallback(
    (index: number, row: number, col: number) => {
      const curBoard = boardRef.current;
      const curTray = trayRef.current;
      const shape = curTray[index];
      if (!shape) return;

      if (row < 0 || col < 0) return; // dropped off the board -> silent cancel

      if (!canPlace(curBoard, shape, row, col)) {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        ).catch(() => {});
        return; // invalid drop -> piece returns to tray
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      const placed = shape.cells.length;
      const afterPlace = placeShape(curBoard, shape, row, col);
      const cleared = clearLines(afterPlace);
      const nextBoard = cleared.board;
      const lineCount = cleared.lineCount;

      let nextTray = curTray.slice();
      nextTray[index] = null;
      if (nextTray.every((s) => s === null)) nextTray = randomTray();

      // combo streak: grows on consecutive clearing moves, resets otherwise.
      const newCombo = lineCount > 0 ? comboRef.current + 1 : 0;
      comboRef.current = newCombo;

      const gained = scoreMove(placed, lineCount, newCombo);
      const nextScore = scoreRef.current + gained;

      boardRef.current = nextBoard;
      trayRef.current = nextTray;
      scoreRef.current = nextScore;
      setBoard(nextBoard);
      setTray(nextTray);
      setScore(nextScore);

      if (cleared.clearedCells.length > 0) {
        playClear();
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
        const gl = gridLayoutRef.current;
        if (gl) {
          const id = ++burstIdRef.current;
          setBursts((b) => [
            ...b,
            {
              id,
              cells: cleared.clearedCells,
              gridX: gl.x,
              gridY: gl.y,
              cell: gl.cell,
            },
          ]);
        }

        // Show a combo / multi-clear popup for the juicy moments.
        if (lineCount >= 2 || newCombo >= 2) {
          const labels = ['', '', 'DOUBLE!', 'TRIPLE!', 'QUAD!', 'PENTA!'];
          const text =
            newCombo >= 2
              ? `COMBO ×${newCombo}`
              : labels[Math.min(lineCount, 5)] || 'CLEAR!';
          const intensity = Math.max(newCombo, lineCount);
          const centerY = gl ? gl.y + 4 * gl.cell : 320;
          const cid = ++comboIdRef.current;
          setCombos((c) => [
            ...c,
            { id: cid, text, sub: `+${gained}`, intensity, centerY },
          ]);
          // a little extra punch for big combos
          if (intensity >= 3) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(
              () => {}
            );
          }
        }
      }

      if (nextScore > highScoreRef.current) {
        highScoreRef.current = nextScore;
        setHighScore(nextScore);
        setIsNewBest(true);
        saveHighScore(nextScore);
      }

      if (isGameOver(nextBoard, nextTray)) {
        setTimeout(() => setGameOver(true), 380);
      }
    },
    []
  );

  const handleEnd = useCallback(
    (index: number, row: number, col: number) => {
      commitPlacement(index, row, col);
      setDraggingIndex(null);
      setPreview(null);
    },
    [commitPlacement]
  );

  const restart = useCallback(() => {
    const b = createEmptyBoard();
    const t = randomTray();
    boardRef.current = b;
    trayRef.current = t;
    scoreRef.current = 0;
    comboRef.current = 0;
    setBoard(b);
    setTray(t);
    setScore(0);
    setIsNewBest(false);
    setGameOver(false);
    setPreview(null);
    setDraggingIndex(null);
    setBursts([]);
    setCombos([]);
    helpersRef.current = START_HELPERS;
    setHelpers(START_HELPERS);
    bombArmedRef.current = false;
    setBombArmed(false);
    clearHint();
  }, [clearHint]);

  const finishTutorial = useCallback(() => {
    setShowTutorial(false);
    markTutorialSeen();
  }, []);

  // --- helpers ---

  const spend = useCallback((type: keyof HelperCounts): boolean => {
    if (helpersRef.current[type] <= 0) return false;
    const next = {
      ...helpersRef.current,
      [type]: helpersRef.current[type] - 1,
    };
    helpersRef.current = next;
    setHelpers(next);
    return true;
  }, []);

  const disarmBomb = useCallback(() => {
    if (bombArmedRef.current) {
      bombArmedRef.current = false;
      setBombArmed(false);
    }
  }, []);

  // Shuffle: deal a fresh set of three pieces.
  const onShuffle = useCallback(() => {
    disarmBomb();
    if (!spend('shuffle')) return;
    const t = randomTray();
    trayRef.current = t;
    setTray(t);
    setPreview(null);
    clearHint();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [spend, clearHint, disarmBomb]);

  // Break: arm bomb mode; the next tap on a filled cell removes it.
  const onBomb = useCallback(() => {
    if (helpersRef.current.bomb <= 0) return;
    clearHint();
    setPreview(null);
    const next = !bombArmedRef.current;
    bombArmedRef.current = next;
    setBombArmed(next);
    Haptics.selectionAsync().catch(() => {});
  }, [clearHint]);

  const onCellTap = useCallback(
    (r: number, c: number) => {
      if (!bombArmedRef.current) return;
      if (boardRef.current[r][c] === null) return; // ignore empty taps
      // Break the whole contiguous shape (connected same-color region).
      const cells = connectedSameColor(boardRef.current, r, c);
      if (cells.length === 0) return;
      if (!spend('bomb')) {
        disarmBomb();
        return;
      }
      const nb = cloneBoard(boardRef.current);
      for (const [rr, cc] of cells) nb[rr][cc] = null;
      boardRef.current = nb;
      setBoard(nb);
      disarmBomb();
      const gl = gridLayoutRef.current;
      if (gl) {
        const id = ++burstIdRef.current;
        setBursts((b) => [
          ...b,
          { id, cells, gridX: gl.x, gridY: gl.y, cell: gl.cell },
        ]);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    },
    [spend, disarmBomb]
  );

  // Hint: highlight a placeable piece + where it goes.
  const onHint = useCallback(() => {
    disarmBomb();
    const res = findHint(boardRef.current, trayRef.current);
    if (!res) {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning
      ).catch(() => {});
      return; // nothing fits -> don't spend
    }
    if (!spend('hint')) return;
    const shape = trayRef.current[res.shapeIndex]!;
    const cells = shape.cells.map(
      ([dr, dc]) => [res.row + dr, res.col + dc] as [number, number]
    );
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setHintCells(cells);
    setHintIndex(res.shapeIndex);
    Haptics.selectionAsync().catch(() => {});
    hintTimerRef.current = setTimeout(() => {
      setHintCells(null);
      setHintIndex(null);
    }, 2600);
  }, [spend, disarmBomb]);

  // Revive from game over by spending a shuffle for fresh pieces.
  const onRevive = useCallback(() => {
    if (!spend('shuffle')) return;
    const t = randomTray();
    trayRef.current = t;
    setTray(t);
    comboRef.current = 0;
    setGameOver(false);
    setPreview(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [spend]);

  // Floating dragged piece, driven entirely on the UI thread.
  const overlayStyle = useAnimatedStyle(() => {
    const left = dragX.value - (dragW.value * BOARD_CELL) / 2;
    const top =
      dragY.value - dragH.value * BOARD_CELL - BOARD_CELL * LIFT_FACTOR;
    return {
      opacity: dragActive.value,
      transform: [
        { translateX: left },
        { translateY: top },
        { scale: 1.06 },
      ],
    };
  });

  const draggingShape =
    draggingIndex !== null ? tray[draggingIndex] : null;
  const enabled = !gameOver && !showTutorial && !bombArmed;
  const topPad = (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 44) + 8;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[palette.bg, palette.bgDeep]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.content, { paddingTop: topPad }]}>
        {/* brand bar */}
        <View style={styles.brandBar}>
          <Pressable
            onPress={onHome}
            hitSlop={10}
            style={({ pressed }) => [
              styles.iconBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={styles.iconText}>‹</Text>
          </Pressable>
          <Text style={styles.brand}>
            BLOCK <Text style={{ color: palette.accent }}>BLAST</Text>
          </Text>
          <View style={styles.rightCluster}>
            <SoundToggle />
            <Pressable
              onPress={restart}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.iconText}>↻</Text>
            </Pressable>
          </View>
        </View>

        <Header score={score} highScore={highScore} isNewBest={isNewBest} />

        <View style={styles.boardWrap}>
          <Grid
            board={board}
            cellSize={BOARD_CELL}
            preview={preview}
            hint={hintCells}
            bombArmed={bombArmed}
            onCellTap={onCellTap}
            onLayoutMeasured={onGridMeasured}
          />
        </View>

        {/* helpers */}
        <HelperBar
          counts={helpers}
          bombArmed={bombArmed}
          onShuffle={onShuffle}
          onBomb={onBomb}
          onHint={onHint}
        />

        {/* tray */}
        <View style={styles.tray}>
          {tray.map((shape, i) => (
            <View key={i} style={styles.traySlot}>
              {shape && (
                <DraggableShape
                  shape={shape}
                  index={i}
                  trayCell={TRAY_CELL}
                  boardCell={BOARD_CELL}
                  isDragging={draggingIndex === i}
                  enabled={enabled}
                  highlight={hintIndex === i}
                  dragX={dragX}
                  dragY={dragY}
                  dragActive={dragActive}
                  dragW={dragW}
                  dragH={dragH}
                  gridX={gridX}
                  gridY={gridY}
                  lastKey={lastKey}
                  onStart={handleStart}
                  onMove={handleMove}
                  onEnd={handleEnd}
                />
              )}
            </View>
          ))}
        </View>
      </View>

      {/* clear-line bursts */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {bursts.map((b) => (
          <ClearBurst key={b.id} burst={b} onDone={removeBurst} />
        ))}
      </View>

      {/* combo / multi-clear popups */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {combos.map((c) => (
          <ComboPopup key={c.id} data={c} onDone={removeCombo} />
        ))}
      </View>

      {/* floating dragged piece */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {draggingShape && (
          <Animated.View style={[styles.dragLayer, overlayStyle]}>
            <ShapeView shape={draggingShape} cell={BOARD_CELL} />
          </Animated.View>
        )}
      </View>

      <GameOverModal
        visible={gameOver}
        score={score}
        highScore={highScore}
        isNewBest={isNewBest}
        canRevive={helpers.shuffle > 0}
        onRevive={onRevive}
        onRestart={restart}
        onHome={onHome}
      />

      <Tutorial visible={showTutorial} onDone={finishTutorial} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: {
    flex: 1,
    paddingHorizontal: H_MARGIN,
    alignItems: 'center',
  },
  brandBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  brand: {
    flex: 1,
    textAlign: 'center',
    color: palette.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.surfaceLight,
  },
  iconText: {
    color: palette.textDim,
    fontSize: 22,
    fontWeight: '900',
    marginTop: -2,
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boardWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  tray: {
    flexDirection: 'row',
    width: '100%',
    height: TRAY_CELL * 5 + spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: palette.surface,
    borderRadius: radii.card,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  traySlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
