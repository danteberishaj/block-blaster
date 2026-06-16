import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
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
  canPlaceAnywhere,
  clearLines,
  cloneBoard,
  createEmptyBoard,
  findHint,
  isGameOver,
  placeShape,
  randomTrayForBoard,
  scoreMove,
  shuffleTrayForBoard,
} from '../game/logic';
import { randomTray, shapeCatalog } from '../game/shapes';
import {
  getBestChain,
  getHighScore,
  hasSeenTutorial,
  markTutorialSeen,
  saveBestChain,
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
import GameIcon from './GameIcon';
import { playClear, playCrossBlast } from '../audio/audio';

const START_HELPERS: HelperCounts = { shuffle: 3, bomb: 3, hint: 3 };

const H_MARGIN = 14;
const GRID_PAD = 6; // must match Grid's internal PAD
const MAX_BOARD_CELL = 48;
const MIN_BOARD_CELL = 32;
const MAX_CONTENT_WIDTH = MAX_BOARD_CELL * BOARD_SIZE + H_MARGIN * 2 + 48;
const dealTrayForBoard = (board: Board) =>
  randomTrayForBoard(board, randomTray, shapeCatalog);
const shuffleDealForBoard = (board: Board) =>
  shuffleTrayForBoard(board, randomTray, shapeCatalog);

export default function GameScreen({ onHome }: { onHome: () => void }) {
  const { width, height } = useWindowDimensions();
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [tray, setTray] = useState<(Shape | null)[]>(() =>
    dealTrayForBoard(createEmptyBoard())
  );
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [bestChain, setBestChain] = useState(0);
  const [runBestChain, setRunBestChain] = useState(0);
  const [isNewBestChain, setIsNewBestChain] = useState(false);
  const [biggestBlast, setBiggestBlast] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [combos, setCombos] = useState<ComboData[]>([]);
  const [comboStreak, setComboStreak] = useState(0);
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
  const bestChainRef = useRef(0);
  const runBestChainRef = useRef(0);
  const biggestBlastRef = useRef(0);
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
  const topPad = (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 44) + 8;
  const boardCellFromWidth = Math.floor(
    (width - H_MARGIN * 2 - GRID_PAD * 2) / BOARD_SIZE
  );
  const boardCellFromHeight = Math.floor((height - topPad - 230) / 10.5);
  const boardCell = Math.max(
    MIN_BOARD_CELL,
    Math.min(MAX_BOARD_CELL, boardCellFromWidth, boardCellFromHeight)
  );
  const trayCell = Math.round(boardCell * 0.5);

  // Load persisted state on mount.
  useEffect(() => {
    getHighScore().then((h) => {
      highScoreRef.current = h;
      setHighScore(h);
    });
    getBestChain().then((c) => {
      bestChainRef.current = c;
      setBestChain(c);
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
      const clearCells = valid
        ? clearLines(placeShape(boardRef.current, shape, row, col)).clearedCells
        : [];
      setPreview({ cells, valid, colorIndex: shape.colorIndex, clearCells });
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
      if (nextTray.every((s) => s === null)) {
        nextTray = dealTrayForBoard(nextBoard);
      }

      // combo streak: grows on consecutive clearing moves, resets otherwise.
      const newCombo = lineCount > 0 ? comboRef.current + 1 : 0;
      comboRef.current = newCombo;
      setComboStreak(newCombo);
      if (newCombo > runBestChainRef.current) {
        runBestChainRef.current = newCombo;
        setRunBestChain(newCombo);
      }

      const gained = scoreMove(placed, lineCount, newCombo);
      const nextScore = scoreRef.current + gained;

      boardRef.current = nextBoard;
      trayRef.current = nextTray;
      scoreRef.current = nextScore;
      setBoard(nextBoard);
      setTray(nextTray);
      setScore(nextScore);

      if (cleared.clearedCells.length > 0) {
        const isCrossBlast = cleared.rows.length > 0 && cleared.cols.length > 0;
        if (gained > biggestBlastRef.current) {
          biggestBlastRef.current = gained;
          setBiggestBlast(gained);
        }
        if (newCombo > bestChainRef.current) {
          bestChainRef.current = newCombo;
          setBestChain(newCombo);
          setIsNewBestChain(true);
          saveBestChain(newCombo);
        }
        if (isCrossBlast) playCrossBlast();
        else playClear();
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
              variant: isCrossBlast ? 'cross' : 'clear',
            },
          ]);
        }

        const labels = ['CLEAR!', 'CLEAR!', 'DOUBLE!', 'TRIPLE!', 'QUAD!', 'PENTA!'];
        const text =
          isCrossBlast
            ? 'CROSS BLAST'
            : newCombo >= 2
            ? `COMBO ×${newCombo}`
            : labels[Math.min(lineCount, 5)] || 'CLEAR!';
        const sub =
          isCrossBlast && newCombo >= 2
            ? `COMBO ×${newCombo}  +${gained}`
            : `+${gained}`;
        const intensity = isCrossBlast
          ? Math.max(4, newCombo, lineCount)
          : Math.max(newCombo, lineCount);
        const centerY = gl ? gl.y + 4 * gl.cell : 320;
        const cid = ++comboIdRef.current;
        setCombos((c) => [
          ...c,
          {
            id: cid,
            text,
            sub,
            intensity,
            centerY,
            variant: isCrossBlast ? 'cross' : newCombo >= 2 ? 'combo' : 'clear',
          },
        ]);
        // a little extra punch for big combos
        if (intensity >= 3) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(
            () => {}
          );
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
    const t = dealTrayForBoard(b);
    boardRef.current = b;
    trayRef.current = t;
    scoreRef.current = 0;
    comboRef.current = 0;
    runBestChainRef.current = 0;
    biggestBlastRef.current = 0;
    setComboStreak(0);
    setRunBestChain(0);
    setBiggestBlast(0);
    setIsNewBestChain(false);
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
    const t = shuffleDealForBoard(boardRef.current);
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
      const cells: [number, number][] = [[r, c]];
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
    const t = shuffleDealForBoard(boardRef.current);
    trayRef.current = t;
    setTray(t);
    comboRef.current = 0;
    setComboStreak(0);
    setGameOver(false);
    setPreview(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [spend]);

  // Floating dragged piece, driven entirely on the UI thread.
  const overlayStyle = useAnimatedStyle(() => {
    const left = dragX.value - (dragW.value * boardCell) / 2;
    const top =
      dragY.value - dragH.value * boardCell - boardCell * LIFT_FACTOR;
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
  const shapeFits = tray.map((shape) =>
    shape ? canPlaceAnywhere(board, shape) : true
  );
  const enabled = !gameOver && !showTutorial && !bombArmed;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={palette.bgGradient}
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
              styles.leftControl,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <GameIcon name="back" size={22} color={palette.textDim} />
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
              <GameIcon name="restart" size={21} color={palette.textDim} />
            </Pressable>
          </View>
        </View>

        <Header
          score={score}
          highScore={highScore}
          isNewBest={isNewBest}
          comboStreak={comboStreak}
        />

        <View style={styles.boardWrap}>
          <Grid
            board={board}
            cellSize={boardCell}
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
        <LinearGradient
          colors={palette.trayGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.tray, { height: trayCell * 5 + spacing.lg }]}
        >
          {tray.map((shape, i) => (
            <View key={i} style={styles.traySlot}>
              {shape && (
                <DraggableShape
                  shape={shape}
                  index={i}
                  trayCell={trayCell}
                  boardCell={boardCell}
                  isDragging={draggingIndex === i}
                  enabled={enabled && shapeFits[i]}
                  playable={shapeFits[i]}
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
        </LinearGradient>
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
            <ShapeView shape={draggingShape} cell={boardCell} />
          </Animated.View>
        )}
      </View>

      <GameOverModal
        visible={gameOver}
        score={score}
        highScore={highScore}
        isNewBest={isNewBest}
        runBestChain={runBestChain}
        bestChain={bestChain}
        isNewBestChain={isNewBestChain}
        biggestBlast={biggestBlast}
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
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: H_MARGIN,
    alignItems: 'center',
  },
  brandBar: {
    width: '100%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  brand: {
    textAlign: 'center',
    color: palette.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  leftControl: {
    position: 'absolute',
    left: 0,
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
  rightCluster: {
    position: 'absolute',
    right: 0,
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
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: radii.card,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: palette.surfaceLight,
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
