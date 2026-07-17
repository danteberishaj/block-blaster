import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BOARD_SIZE, palette, radii, spacing } from "../theme/theme";
import { Board, Shape } from "../game/types";
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
} from "../game/logic";
import { randomTray, shapeCatalog } from "../game/shapes";
import {
  canEarnRewardedHelperUse,
  createRewardedHelperUsage,
  createStartingHelpers,
  recordRewardedHelperUse,
  type HelperCounts,
  type HelperType,
  type RewardedHelperUsage,
} from "../game/helpers";
import {
  getBestChain,
  getHighScore,
  getSavedRun,
  hasSeenTutorial,
  markTutorialSeen,
  saveBestChain,
  saveHighScore,
  saveRun,
} from "../storage/storage";
import { RUN_STATE_VERSION, type SavedRunState } from "../game/runState";

import Grid, { GridLayout, PreviewState } from "./Grid";
import DraggableShape, { LIFT_FACTOR } from "./DraggableShape";
import ShapeView from "./ShapeView";
import Header from "./Header";
import GameOverModal from "./GameOverModal";
import Tutorial from "./Tutorial";
import ClearBurst, { Burst } from "./ClearBurst";
import ComboPopup, { ComboData } from "./ComboPopup";
import HelperBar from "./HelperBar";
import SoundToggle from "./SoundToggle";
import GameIcon from "./GameIcon";
import {
  pauseAudioForAd,
  playClear,
  playCrossBlast,
  resumeAudioAfterAd,
} from "../audio/audio";
import {
  canShowRewardedHelperAds,
  showRewardedHelperAd,
} from "../ads/rewardedAds";
import { PRODUCT } from "../config/product";

const H_MARGIN = 14;
const GRID_PAD = 6; // must match Grid's internal PAD
const TOP_CONTROL_SIZE = 48;
const MAX_BOARD_CELL = 48;
const MIN_BOARD_CELL = 28;
const MAX_CONTENT_WIDTH = MAX_BOARD_CELL * BOARD_SIZE + H_MARGIN * 2 + 48;
const dealTrayForBoard = (board: Board) =>
  randomTrayForBoard(board, randomTray, shapeCatalog);
const shuffleDealForBoard = (board: Board) =>
  shuffleTrayForBoard(board, randomTray, shapeCatalog);

function cellListsEqual(
  left: [number, number][],
  right: [number, number][],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      ([row, col], index) =>
        row === right[index][0] && col === right[index][1],
    )
  );
}

function previewsEqual(
  current: PreviewState | null,
  next: PreviewState,
): boolean {
  return (
    current !== null &&
    current.valid === next.valid &&
    current.colorIndex === next.colorIndex &&
    cellListsEqual(current.cells, next.cells) &&
    cellListsEqual(current.clearCells, next.clearCells)
  );
}

export default function GameScreen({ onHome }: { onHome: () => void }) {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [tray, setTray] = useState<(Shape | null)[]>(() =>
    dealTrayForBoard(createEmptyBoard()),
  );
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [bestChain, setBestChain] = useState(0);
  const [runBestChain, setRunBestChain] = useState(0);
  const [isNewBestChain, setIsNewBestChain] = useState(false);
  const [biggestBlast, setBiggestBlast] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverModalVisible, setGameOverModalVisible] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [combos, setCombos] = useState<ComboData[]>([]);
  const [comboStreak, setComboStreak] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [runHydrated, setRunHydrated] = useState(false);

  // Helpers
  const [helpers, setHelpers] = useState<HelperCounts>(createStartingHelpers);
  const [rewardUsage, setRewardUsage] = useState<RewardedHelperUsage>(
    createRewardedHelperUsage,
  );
  const [bombArmed, setBombArmed] = useState(false);
  const [hintCells, setHintCells] = useState<[number, number][] | null>(null);
  const [hintIndex, setHintIndex] = useState<number | null>(null);
  const [rewardingHelper, setRewardingHelper] = useState<HelperType | null>(
    null,
  );

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
  const rewardUsageRef = useRef(rewardUsage);
  const bombArmedRef = useRef(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameOverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewardingHelperRef = useRef<HelperType | null>(null);
  const selectedIndexRef = useRef<number | null>(null);
  const runSnapshotRef = useRef<SavedRunState | null>(null);
  const mountedRef = useRef(true);

  // Shared (UI-thread) drag state.
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragActive = useSharedValue(0);
  const dragW = useSharedValue(1);
  const dragH = useSharedValue(1);
  const gridX = useSharedValue(0);
  const gridY = useSharedValue(0);
  const lastKey = useSharedValue(-9999);
  const compactLayout = width < 360 || height < 650;
  const compactLargeText = compactLayout && fontScale >= 1.45;
  const compactHelpers = width < 420 || compactLargeText;
  const rewardedAdsAvailable = canShowRewardedHelperAds();
  const topPad = insets.top + spacing.sm;
  const bottomPad = Math.max(insets.bottom, spacing.sm);
  // Header stacks at 1.45x. Reserve that extra chrome height and only relax
  // the board floor in this constrained accessibility-text layout.
  const largeTextHeightBudget = compactLargeText
    ? Math.ceil(24 * fontScale) + (TOP_CONTROL_SIZE - 36)
    : 0;
  const minimumBoardCell = compactLargeText
    ? Math.max(20, MIN_BOARD_CELL - Math.ceil((fontScale - 1) * 7))
    : MIN_BOARD_CELL;
  const boardCellFromWidth = Math.floor(
    (width - H_MARGIN * 2 - GRID_PAD * 2) / BOARD_SIZE,
  );
  const boardCellFromHeight = Math.floor(
    (height - topPad - bottomPad - 230 - largeTextHeightBudget) / 10.5,
  );
  const boardCell = Math.max(
    minimumBoardCell,
    Math.min(MAX_BOARD_CELL, boardCellFromWidth, boardCellFromHeight),
  );
  const trayCell = Math.round(boardCell * 0.5);
  runSnapshotRef.current = runHydrated
    ? {
        version: RUN_STATE_VERSION,
        board,
        tray,
        score,
        comboStreak,
        runBestChain,
        biggestBlast,
        helpers,
        rewardUsage,
        gameOver,
        savedAt: Date.now(),
      }
    : null;

  // Hydrate records and the active run before enabling interaction.
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getHighScore(),
      getBestChain(),
      hasSeenTutorial(),
      getSavedRun(),
    ]).then(([storedHighScore, storedBestChain, tutorialSeen, savedRun]) => {
      if (cancelled) return;

      const nextHighScore = Math.max(storedHighScore, savedRun?.score ?? 0);
      const nextBestChain = Math.max(
        storedBestChain,
        savedRun?.runBestChain ?? 0,
      );
      highScoreRef.current = nextHighScore;
      bestChainRef.current = nextBestChain;
      setHighScore(nextHighScore);
      setBestChain(nextBestChain);

      if (savedRun) {
        boardRef.current = savedRun.board;
        trayRef.current = savedRun.tray;
        scoreRef.current = savedRun.score;
        comboRef.current = savedRun.comboStreak;
        runBestChainRef.current = savedRun.runBestChain;
        biggestBlastRef.current = savedRun.biggestBlast;
        helpersRef.current = savedRun.helpers;
        rewardUsageRef.current = savedRun.rewardUsage;

        setBoard(savedRun.board);
        setTray(savedRun.tray);
        setScore(savedRun.score);
        setComboStreak(savedRun.comboStreak);
        setRunBestChain(savedRun.runBestChain);
        setBiggestBlast(savedRun.biggestBlast);
        setHelpers(savedRun.helpers);
        setRewardUsage(savedRun.rewardUsage);
        setGameOver(savedRun.gameOver);
        setGameOverModalVisible(savedRun.gameOver);
      }

      setShowTutorial(!tutorialSeen && !savedRun);
      setRunHydrated(true);
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      if (gameOverTimerRef.current) clearTimeout(gameOverTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!runHydrated) return;

    void saveRun({
      version: RUN_STATE_VERSION,
      board,
      tray,
      score,
      comboStreak,
      runBestChain,
      biggestBlast,
      helpers,
      rewardUsage,
      gameOver,
      savedAt: Date.now(),
    });
  }, [
    runHydrated,
    board,
    tray,
    score,
    comboStreak,
    runBestChain,
    biggestBlast,
    helpers,
    rewardUsage,
    gameOver,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      const snapshot = runSnapshotRef.current;
      if (state !== "active" && snapshot) {
        void saveRun({ ...snapshot, savedAt: Date.now() });
      }
    });

    return () => subscription.remove();
  }, []);

  const goHome = useCallback(() => {
    const snapshot = runSnapshotRef.current;
    if (snapshot) {
      void saveRun({ ...snapshot, savedAt: Date.now() });
    }
    onHome();
  }, [onHome]);

  const onGridMeasured = useCallback(
    (l: GridLayout) => {
      gridLayoutRef.current = l;
      gridX.value = l.x;
      gridY.value = l.y;
    },
    [gridX, gridY],
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

  const clearSelection = useCallback(() => {
    selectedIndexRef.current = null;
    setSelectedIndex(null);
  }, []);

  const disarmBomb = useCallback((announceCancellation = true) => {
    if (!bombArmedRef.current) return;

    bombArmedRef.current = false;
    setBombArmed(false);
    if (announceCancellation) {
      AccessibilityInfo.announceForAccessibility("Break cancelled.");
    }
  }, []);

  const handleStart = useCallback(
    (_index: number) => {
      clearSelection();
      setDraggingIndex(_index);
      clearHint();
      Haptics.selectionAsync().catch(() => {});
    },
    [clearHint, clearSelection],
  );

  const handleMove = useCallback((row: number, col: number, index: number) => {
    const shape = trayRef.current[index];
    if (!shape) return;
    if (row < 0 || col < 0) {
      setPreview(null);
      return;
    }
    const valid = canPlace(boardRef.current, shape, row, col);
    const cells = shape.cells.map(
      ([dr, dc]) => [row + dr, col + dc] as [number, number],
    );
    const clearCells = valid
      ? clearLines(placeShape(boardRef.current, shape, row, col)).clearedCells
      : [];
    const nextPreview = {
      cells,
      valid,
      colorIndex: shape.colorIndex,
      clearCells,
    };
    setPreview((current) =>
      previewsEqual(current, nextPreview) ? current : nextPreview,
    );
  }, []);

  const commitPlacement = useCallback(
    (index: number, row: number, col: number) => {
      const curBoard = boardRef.current;
      const curTray = trayRef.current;
      const shape = curTray[index];
      if (!shape) return;

      if (row < 0 || col < 0) return; // dropped off the board -> silent cancel

      if (!canPlace(curBoard, shape, row, col)) {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        ).catch(() => {});
        return; // invalid drop -> piece returns to tray
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      clearSelection();

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
          Haptics.NotificationFeedbackType.Success,
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
              variant: isCrossBlast ? "cross" : "clear",
            },
          ]);
        }

        const labels = [
          "CLEAR!",
          "CLEAR!",
          "DOUBLE!",
          "TRIPLE!",
          "QUAD!",
          "PENTA!",
        ];
        const text = isCrossBlast
          ? "CROSS BLAST"
          : newCombo >= 2
            ? `COMBO ×${newCombo}`
            : labels[Math.min(lineCount, 5)] || "CLEAR!";
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
            variant: isCrossBlast ? "cross" : newCombo >= 2 ? "combo" : "clear",
          },
        ]);
        // a little extra punch for big combos
        if (intensity >= 3) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(
            () => {},
          );
        }
      }

      const beatPreviousBest = nextScore > highScoreRef.current;
      if (beatPreviousBest) {
        highScoreRef.current = nextScore;
        setHighScore(nextScore);
        setIsNewBest(true);
        saveHighScore(nextScore);
      }

      const clearSummary =
        lineCount > 0
          ? `${lineCount} ${lineCount === 1 ? "line" : "lines"} cleared. `
          : "Shape placed. ";
      const comboSummary = newCombo >= 2 ? ` Chain ${newCombo}.` : "";
      const bestSummary = beatPreviousBest ? " New best score." : "";
      AccessibilityInfo.announceForAccessibility(
        `${clearSummary}${gained} points. Score ${nextScore}.${comboSummary}${bestSummary}`,
      );

      if (isGameOver(nextBoard, nextTray)) {
        setGameOver(true);
        setGameOverModalVisible(false);
        if (gameOverTimerRef.current) clearTimeout(gameOverTimerRef.current);
        gameOverTimerRef.current = setTimeout(() => {
          gameOverTimerRef.current = null;
          if (mountedRef.current) setGameOverModalVisible(true);
        }, 380);
      }
    },
    [clearSelection],
  );

  const handleEnd = useCallback(
    (index: number, row: number, col: number) => {
      commitPlacement(index, row, col);
      setDraggingIndex(null);
      setPreview(null);
    },
    [commitPlacement],
  );

  const handleCancel = useCallback((index: number) => {
    setDraggingIndex((current) => (current === index ? null : current));
    setPreview(null);
  }, []);

  const onSelectedPlacement = useCallback(
    (row: number, col: number) => {
      const index = selectedIndexRef.current;
      const shape = index === null ? null : trayRef.current[index];
      if (index === null || !shape) {
        clearSelection();
        return;
      }

      if (!canPlace(boardRef.current, shape, row, col)) {
        AccessibilityInfo.announceForAccessibility(
          "That shape does not fit there.",
        );
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        ).catch(() => {});
        return;
      }

      commitPlacement(index, row, col);
      setPreview(null);
    },
    [clearSelection, commitPlacement],
  );

  const restart = useCallback(() => {
    if (gameOverTimerRef.current) {
      clearTimeout(gameOverTimerRef.current);
      gameOverTimerRef.current = null;
    }
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
    setGameOverModalVisible(false);
    setPreview(null);
    setDraggingIndex(null);
    clearSelection();
    setBursts([]);
    setCombos([]);
    const startingHelpers = createStartingHelpers();
    const startingRewardUsage = createRewardedHelperUsage();
    helpersRef.current = startingHelpers;
    rewardUsageRef.current = startingRewardUsage;
    setHelpers(startingHelpers);
    setRewardUsage(startingRewardUsage);
    disarmBomb();
    clearHint();
  }, [clearHint, clearSelection, disarmBomb]);

  const finishTutorial = useCallback(() => {
    setShowTutorial(false);
    markTutorialSeen();
  }, []);

  const requestRestart = useCallback(() => {
    if (scoreRef.current <= 0 || gameOver) {
      restart();
      return;
    }

    Alert.alert(
      "Start a new run?",
      "This clears the current board, score, helpers, and earned ad uses.",
      [
        { text: "Keep Playing", style: "cancel" },
        { text: "Start Over", style: "destructive", onPress: restart },
      ],
    );
  }, [gameOver, restart]);

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

  const selectShape = useCallback(
    (index: number) => {
      const shape = trayRef.current[index];
      if (!shape || !canPlaceAnywhere(boardRef.current, shape)) return;

      disarmBomb();
      clearHint();
      setPreview(null);

      if (selectedIndexRef.current === index) {
        clearSelection();
        AccessibilityInfo.announceForAccessibility("Shape deselected.");
        return;
      }

      selectedIndexRef.current = index;
      setSelectedIndex(index);
      AccessibilityInfo.announceForAccessibility(
        "Shape selected. Tap a highlighted board cell to place it.",
      );
      Haptics.selectionAsync().catch(() => {});
    },
    [clearHint, clearSelection, disarmBomb],
  );

  const grantHelperUse = useCallback((type: HelperType): boolean => {
    if (!mountedRef.current || helpersRef.current[type] > 0) return false;

    const next = {
      ...helpersRef.current,
      [type]: 1,
    };
    helpersRef.current = next;
    setHelpers(next);
    return true;
  }, []);

  const requestRewardedHelper = useCallback(
    async (type: HelperType): Promise<boolean> => {
      if (helpersRef.current[type] > 0) return true;
      if (!canEarnRewardedHelperUse(rewardUsageRef.current, type)) {
        Alert.alert(
          "Reward already used",
          "Each helper can earn one ad-funded use per run.",
        );
        return false;
      }
      if (rewardingHelperRef.current !== null) return false;

      disarmBomb();
      clearSelection();
      clearHint();
      setPreview(null);
      rewardingHelperRef.current = type;
      setRewardingHelper(type);
      pauseAudioForAd();

      try {
        const result = await showRewardedHelperAd(type);
        if (!mountedRef.current) return false;

        if (result.status === "rewarded") {
          const granted = grantHelperUse(type);
          if (granted) {
            const nextUsage = recordRewardedHelperUse(
              rewardUsageRef.current,
              type,
            );
            rewardUsageRef.current = nextUsage;
            setRewardUsage(nextUsage);
            const helperName =
              type === "bomb" ? "Break" : type[0].toUpperCase() + type.slice(1);
            AccessibilityInfo.announceForAccessibility(
              `One ${helperName} use earned.`,
            );
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            ).catch(() => {});
          }
          return granted;
        }

        Alert.alert(
          result.status === "skipped" ? "Ad not completed" : "Ad unavailable",
          result.message,
        );
        return false;
      } finally {
        resumeAudioAfterAd();
        rewardingHelperRef.current = null;
        if (mountedRef.current) setRewardingHelper(null);
      }
    },
    [clearHint, clearSelection, disarmBomb, grantHelperUse],
  );

  const onWatchHelperAd = useCallback(
    (type: HelperType) => {
      void requestRewardedHelper(type);
    },
    [requestRewardedHelper],
  );

  // Shuffle: deal a fresh set of three pieces.
  const onShuffle = useCallback(() => {
    disarmBomb();
    clearSelection();
    if (!spend("shuffle")) return;
    const t = shuffleDealForBoard(boardRef.current);
    trayRef.current = t;
    setTray(t);
    setPreview(null);
    clearHint();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [spend, clearHint, clearSelection, disarmBomb]);

  // Break: arm bomb mode; the next tap on a filled cell removes it.
  const onBomb = useCallback(() => {
    if (helpersRef.current.bomb <= 0) return;
    clearSelection();
    clearHint();
    setPreview(null);
    if (bombArmedRef.current) {
      disarmBomb();
    } else {
      bombArmedRef.current = true;
      setBombArmed(true);
      AccessibilityInfo.announceForAccessibility(
        "Break armed. Tap a filled block.",
      );
    }
    Haptics.selectionAsync().catch(() => {});
  }, [clearHint, clearSelection, disarmBomb]);

  const onCellTap = useCallback(
    (r: number, c: number) => {
      if (!bombArmedRef.current) return;
      if (boardRef.current[r][c] === null) return; // ignore empty taps
      const cells: [number, number][] = [[r, c]];
      if (!spend("bomb")) {
        disarmBomb();
        return;
      }
      const nb = cloneBoard(boardRef.current);
      for (const [rr, cc] of cells) nb[rr][cc] = null;
      boardRef.current = nb;
      setBoard(nb);
      disarmBomb(false);
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
    [spend, disarmBomb],
  );

  // Hint: highlight a placeable piece + where it goes.
  const onHint = useCallback(() => {
    disarmBomb();
    clearSelection();
    const res = findHint(boardRef.current, trayRef.current);
    if (!res) {
      AccessibilityInfo.announceForAccessibility(
        "No available shape has a valid placement.",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
        () => {},
      );
      return; // nothing fits -> don't spend
    }
    if (!spend("hint")) return;
    const shape = trayRef.current[res.shapeIndex]!;
    const cells = shape.cells.map(
      ([dr, dc]) => [res.row + dr, res.col + dc] as [number, number],
    );
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setHintCells(cells);
    setHintIndex(res.shapeIndex);
    selectedIndexRef.current = res.shapeIndex;
    setSelectedIndex(res.shapeIndex);
    AccessibilityInfo.announceForAccessibility(
      `Hint: shape ${res.shapeIndex + 1} selected. Suggested placement starts at row ${res.row + 1}, column ${res.col + 1}.`,
    );
    Haptics.selectionAsync().catch(() => {});
    hintTimerRef.current = setTimeout(() => {
      setHintCells(null);
      setHintIndex(null);
    }, 2600);
  }, [spend, clearSelection, disarmBomb]);

  // Revive with a remaining Shuffle, or earn one first through a rewarded ad.
  const onRevive = useCallback(async () => {
    if (helpersRef.current.shuffle <= 0) {
      const earned = await requestRewardedHelper("shuffle");
      if (!earned) return;
    }
    if (!spend("shuffle")) return;
    if (gameOverTimerRef.current) {
      clearTimeout(gameOverTimerRef.current);
      gameOverTimerRef.current = null;
    }
    const t = shuffleDealForBoard(boardRef.current);
    trayRef.current = t;
    setTray(t);
    comboRef.current = 0;
    setComboStreak(0);
    setGameOver(false);
    setGameOverModalVisible(false);
    setPreview(null);
    clearSelection();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [clearSelection, requestRewardedHelper, spend]);

  // Floating dragged piece, driven entirely on the UI thread.
  const overlayStyle = useAnimatedStyle(() => {
    const left = dragX.value - (dragW.value * boardCell) / 2;
    const top = dragY.value - dragH.value * boardCell - boardCell * LIFT_FACTOR;
    return {
      opacity: dragActive.value,
      transform: [{ translateX: left }, { translateY: top }, { scale: 1.06 }],
    };
  });

  const draggingShape = draggingIndex !== null ? tray[draggingIndex] : null;
  const shapeFits = tray.map((shape) =>
    shape ? canPlaceAnywhere(board, shape) : true,
  );
  const adBusy = rewardingHelper !== null;
  const interactionLocked = adBusy || !runHydrated || gameOver;
  const enabled =
    runHydrated && !gameOver && !showTutorial && !bombArmed && !adBusy;
  const modalOpen = showTutorial || gameOverModalVisible;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={palette.bgGradient}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.content,
          { paddingTop: topPad, paddingBottom: bottomPad },
        ]}
        aria-hidden={modalOpen}
        accessibilityElementsHidden={modalOpen}
        importantForAccessibility={modalOpen ? "no-hide-descendants" : "auto"}
      >
        {/* brand bar */}
        <View
          style={[styles.brandBar, compactLayout && styles.brandBarCompact]}
        >
          <Pressable
            onPress={goHome}
            disabled={interactionLocked}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back to home"
            accessibilityState={{ disabled: interactionLocked }}
            style={({ pressed }) => [
              styles.iconBtn,
              styles.leftControl,
              { opacity: interactionLocked ? 0.45 : pressed ? 0.7 : 1 },
            ]}
          >
            <GameIcon name="back" size={22} color={palette.textDim} />
          </Pressable>
          <Text
            maxFontSizeMultiplier={compactLargeText ? 1 : undefined}
            style={[styles.brand, compactLayout && styles.brandCompact]}
          >
            {PRODUCT.wordmarkLead}
            <Text
              maxFontSizeMultiplier={compactLargeText ? 1 : undefined}
              style={{ color: palette.accent }}
            >
              {PRODUCT.wordmarkAccent}
            </Text>
          </Text>
          <View style={styles.rightCluster}>
            <SoundToggle
              size={TOP_CONTROL_SIZE}
              disabled={interactionLocked}
            />
            <Pressable
              onPress={requestRestart}
              disabled={interactionLocked}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Restart game"
              accessibilityState={{ disabled: interactionLocked }}
              style={({ pressed }) => [
                styles.iconBtn,
                { opacity: interactionLocked ? 0.45 : pressed ? 0.7 : 1 },
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
            selectedShape={selectedIndex === null ? null : tray[selectedIndex]}
            onCellTap={onCellTap}
            onSelectedPlacement={onSelectedPlacement}
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
          rewarding={rewardingHelper}
          rewardedAdsAvailable={rewardedAdsAvailable}
          rewardUsage={rewardUsage}
          compact={compactHelpers}
          disabled={interactionLocked || showTutorial}
          onWatchAd={onWatchHelperAd}
        />

        <Text
          style={[
            styles.modeInstruction,
            compactLargeText && styles.modeInstructionCompactLarge,
          ]}
          accessibilityLiveRegion="polite"
          maxFontSizeMultiplier={compactLargeText ? 1 : undefined}
          numberOfLines={compactLargeText ? 1 : undefined}
          adjustsFontSizeToFit={compactLargeText}
          minimumFontScale={compactLargeText ? 0.85 : undefined}
        >
          {bombArmed
            ? "Break armed — tap a filled block."
            : selectedIndex !== null
              ? "Shape selected — tap a highlighted cell."
              : compactLayout
                ? "Tap a shape or drag it onto the board."
                : "Tap a shape to select it, or drag it onto the board."}
        </Text>

        {/* tray */}
        <LinearGradient
          colors={palette.trayGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.tray,
            compactLayout && styles.trayCompact,
            { height: trayCell * 5 + spacing.lg },
          ]}
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
                  selected={selectedIndex === i}
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
                  onCancel={handleCancel}
                  onSelect={selectShape}
                />
              )}
            </View>
          ))}
        </LinearGradient>

        {!runHydrated && (
          <View style={styles.restoreOverlay} accessibilityLiveRegion="polite">
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.restoreText}>Restoring run…</Text>
          </View>
        )}
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
        visible={runHydrated && gameOver && gameOverModalVisible}
        score={score}
        highScore={highScore}
        isNewBest={isNewBest}
        runBestChain={runBestChain}
        bestChain={bestChain}
        isNewBestChain={isNewBestChain}
        biggestBlast={biggestBlast}
        shuffleUses={helpers.shuffle}
        rewardedAdsAvailable={
          rewardedAdsAvailable &&
          canEarnRewardedHelperUse(rewardUsage, "shuffle")
        }
        reviveLoading={rewardingHelper === "shuffle"}
        reviveDisabled={rewardingHelper !== null}
        onRevive={onRevive}
        onRestart={restart}
        onHome={goHome}
      />

      <Tutorial visible={showTutorial} onDone={finishTutorial} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
    paddingHorizontal: H_MARGIN,
    alignItems: "center",
  },
  brandBar: {
    width: "100%",
    height: TOP_CONTROL_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    position: "relative",
  },
  brandBarCompact: {
    height: TOP_CONTROL_SIZE,
    marginBottom: spacing.xs,
    paddingRight: 40,
  },
  brand: {
    textAlign: "center",
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
  brandCompact: {
    fontSize: 15,
    letterSpacing: 0.5,
  },
  leftControl: {
    position: "absolute",
    left: 0,
  },
  iconBtn: {
    width: TOP_CONTROL_SIZE,
    height: TOP_CONTROL_SIZE,
    borderRadius: TOP_CONTROL_SIZE / 2,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.surfaceLight,
  },
  rightCluster: {
    position: "absolute",
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  boardWrap: {
    flex: 1,
    justifyContent: "center",
  },
  tray: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: radii.card,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: palette.surfaceLight,
  },
  trayCompact: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  modeInstruction: {
    minHeight: 20,
    marginTop: 2,
    marginBottom: 4,
    color: palette.textDim,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  modeInstructionCompactLarge: {
    marginTop: 0,
    marginBottom: 2,
  },
  traySlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dragLayer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  restoreOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(8,10,31,0.72)",
  },
  restoreText: {
    color: palette.textDim,
    fontSize: 14,
    fontWeight: "700",
  },
});
