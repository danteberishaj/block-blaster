import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { palette, radii, spacing } from "../theme/theme";
import Block from "./Block";
import GameIcon from "./GameIcon";
import { useReducedMotion } from "../accessibility/useReducedMotion";

const CLAMP = Extrapolation.CLAMP;
const C = 22; // demo cell size

interface Props {
  visible: boolean;
  onDone: () => void;
}

const STEPS = [
  {
    title: "Drag the blocks",
    body: "Drag a shape from the tray onto the board. You get three at a time.",
  },
  {
    title: "Fill lines to clear",
    body: "Complete a full row or column to blast it away and rack up points.",
  },
  {
    title: "Plan ahead",
    body: "If none of your three blocks fit anywhere, it's game over. Leave room!",
  },
  {
    title: "Use your helpers",
    body: "Shuffle for fresh pieces, Break one block, or get a Hint. You start with three of each; after uses run out, each helper can earn one ad-funded +1 use per run.",
  },
] as const;

/** A small empty grid slot. */
function Slot() {
  return (
    <View style={{ width: C, height: C, padding: 1.5 }}>
      <View
        style={{
          flex: 1,
          borderRadius: 5,
          backgroundColor: palette.cellEmpty,
          borderWidth: 1,
          borderColor: palette.cellEmptyBorder,
        }}
      />
    </View>
  );
}

/** A finger that holds a piece from just below it. */
function TouchMark({ width }: { width: number }) {
  return (
    <View style={[styles.touchMark, { left: width / 2 - 7, top: C + 5 }]}>
      <View style={styles.touchTrail} />
      <View style={styles.touchDot} />
    </View>
  );
}

const LOOP = { duration: 2800, easing: Easing.linear };

/**
 * Step 1 — Drag: a finger lifts a 2-piece from the tray and drops it into a
 * 3x3 board, where it locks in. Self-resetting so the loop is seamless.
 */
function DragDemo() {
  const reducedMotion = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    if (!reducedMotion) {
      t.value = withRepeat(withTiming(1, LOOP), -1, false);
    }
  }, [reducedMotion]);

  const startY = 3 * C + 10; // tray, below the grid
  const targetY = C; // middle row

  const group = useAnimatedStyle(() => ({
    // fade out at the row, return to the tray while hidden, then fade back in
    opacity: interpolate(
      t.value,
      [0, 0.44, 0.52, 0.9, 0.98, 1],
      [1, 1, 0, 0, 1, 1],
      CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          t.value,
          [0, 0.5, 0.56, 0.66, 1],
          [startY, targetY, targetY, startY, startY],
          CLAMP,
        ),
      },
    ],
  }));
  const placed = useAnimatedStyle(() => ({
    opacity: interpolate(
      t.value,
      [0.46, 0.56, 0.82, 0.94],
      [0, 1, 1, 0],
      CLAMP,
    ),
  }));

  return (
    <View
      style={{ width: 3 * C, height: startY + C + 26, alignItems: "center" }}
    >
      {[0, 1, 2].map((r) => (
        <View key={r} style={{ flexDirection: "row" }}>
          {[0, 1, 2].map((c) => (
            <Slot key={c} />
          ))}
        </View>
      ))}
      {/* tray hint under the start position */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: startY - 5,
          width: 2 * C,
          height: C + 10,
          borderRadius: 8,
          backgroundColor: palette.surfaceLight,
          opacity: 0.45,
        }}
      />
      {/* the blocks once locked in */}
      <Animated.View
        style={[
          { position: "absolute", left: 0, top: targetY, flexDirection: "row" },
          placed,
        ]}
      >
        <Block colorIndex={1} size={C} />
        <Block colorIndex={1} size={C} />
      </Animated.View>
      {/* floating piece + finger */}
      <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, group]}>
        <View style={{ flexDirection: "row" }}>
          <Block colorIndex={1} size={C} />
          <Block colorIndex={1} size={C} />
        </View>
        <TouchMark width={2 * C} />
      </Animated.View>
    </View>
  );
}

/**
 * Step 2 — Clear: a finger drops the last block into a nearly-full row; the row
 * completes, flashes white, and pops away. Self-resetting loop.
 */
function ClearDemo() {
  const reducedMotion = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    if (!reducedMotion) {
      t.value = withRepeat(withTiming(1, LOOP), -1, false);
    }
  }, [reducedMotion]);

  const rowTop = 42;
  const gapX = 4 * C;
  const aboveY = rowTop - C - 14;
  const colColors = [2, 3, 0, 4];

  const base = useAnimatedStyle(() => ({
    opacity: interpolate(
      t.value,
      [0, 0.66, 0.76, 0.9, 1],
      [1, 1, 0, 0, 1],
      CLAMP,
    ),
  }));
  const completer = useAnimatedStyle(() => ({
    opacity: interpolate(
      t.value,
      [0, 0.4, 0.46, 0.66, 0.76, 1],
      [0, 0, 1, 1, 0, 0],
      CLAMP,
    ),
  }));
  const pop = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          t.value,
          [0, 0.62, 0.71, 0.8, 1],
          [1, 1, 1.18, 1, 1],
          CLAMP,
        ),
      },
    ],
  }));
  const flash = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0.58, 0.68, 0.78], [0, 0.9, 0], CLAMP),
  }));
  const drop = useAnimatedStyle(() => ({
    // drop in, fade out, return above while hidden, then fade back in
    opacity: interpolate(
      t.value,
      [0, 0.4, 0.47, 0.9, 0.97, 1],
      [1, 1, 0, 0, 1, 1],
      CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          t.value,
          [0, 0.4, 0.5, 0.6, 1],
          [aboveY, rowTop, rowTop, aboveY, aboveY],
          CLAMP,
        ),
      },
    ],
  }));

  return (
    <View style={{ width: 5 * C, height: rowTop + C + 30 }}>
      {/* empty slots */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: rowTop,
          flexDirection: "row",
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Slot key={i} />
        ))}
      </View>
      {/* filled row (cols 0-3) + completer (col 4), popping together on clear */}
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            top: rowTop,
            width: 5 * C,
            height: C,
          },
          pop,
        ]}
      >
        <Animated.View
          style={[
            { position: "absolute", left: 0, top: 0, flexDirection: "row" },
            base,
          ]}
        >
          {colColors.map((ci, i) => (
            <Block key={i} colorIndex={ci} size={C} />
          ))}
        </Animated.View>
        <Animated.View
          style={[{ position: "absolute", left: gapX, top: 0 }, completer]}
        >
          <Block colorIndex={1} size={C} />
        </Animated.View>
      </Animated.View>
      {/* white flash on clear */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: 0,
            top: rowTop,
            width: 5 * C,
            height: C,
            borderRadius: 6,
            backgroundColor: "#fff",
          },
          flash,
        ]}
      />
      {/* dropping block + finger */}
      <Animated.View
        style={[{ position: "absolute", left: gapX, top: 0 }, drop]}
      >
        <Block colorIndex={1} size={C} />
        <TouchMark width={C} />
      </Animated.View>
    </View>
  );
}

function BlockedDemo() {
  return (
    <View style={styles.iconDemo}>
      <GameIcon
        name="blocked"
        size={64}
        color={palette.danger}
        strokeWidth={2.5}
      />
    </View>
  );
}

function HelpersDemo() {
  return (
    <View style={styles.helpersDemo}>
      <View style={styles.helperChip}>
        <GameIcon name="shuffle" size={22} color={palette.accent} />
      </View>
      <View style={styles.helperChip}>
        <GameIcon name="break" size={22} color={palette.danger} />
      </View>
      <View style={styles.helperChip}>
        <GameIcon name="hint" size={22} color={palette.gold} />
      </View>
    </View>
  );
}

function DemoAnimation({ step }: { step: number }) {
  return (
    <View style={styles.demoBox}>
      {step === 0 && <DragDemo />}
      {step === 1 && <ClearDemo />}
      {step === 2 && <BlockedDemo />}
      {step === 3 && <HelpersDemo />}
    </View>
  );
}

function Tutorial({ visible, onDone }: Props) {
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    if (!visible) return;

    const currentStep = STEPS[step];
    AccessibilityInfo.announceForAccessibility(
      `Tutorial step ${step + 1} of ${STEPS.length}. ${currentStep.title}. ${currentStep.body}`,
    );
  }, [step, visible]);

  const next = () => {
    if (isLast) {
      setStep(0);
      onDone();
    } else {
      setStep((s) => s + 1);
    }
  };

  const skip = () => {
    setStep(0);
    onDone();
  };

  if (!visible) return null;

  const s = STEPS[step];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={skip}
    >
      <SafeAreaView
        style={styles.backdrop}
        edges={["top", "right", "bottom", "left"]}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          accessibilityViewIsModal
          onAccessibilityEscape={skip}
        >
          <Animated.View
            entering={reducedMotion ? undefined : FadeIn.duration(220)}
            exiting={reducedMotion ? undefined : FadeOut.duration(150)}
            style={styles.card}
          >
            <Pressable
              style={styles.skip}
              onPress={skip}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Skip tutorial"
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>

            <Animated.View
              key={step}
              entering={reducedMotion ? undefined : FadeIn.duration(260)}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <DemoAnimation step={step} />
            </Animated.View>

            <Text style={styles.title} accessibilityRole="header">
              {s.title}
            </Text>
            <Text style={styles.body}>{s.body}</Text>

            <View
              style={styles.dots}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`Tutorial step ${step + 1} of ${STEPS.length}`}
            >
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === step && styles.dotActive]}
                />
              ))}
            </View>

            <Pressable
              onPress={next}
              accessibilityRole="button"
              accessibilityLabel={
                isLast ? "Finish tutorial" : "Next tutorial step"
              }
              style={({ pressed }) => [
                { opacity: pressed ? 0.85 : 1, width: "100%" },
              ]}
            >
              <LinearGradient
                colors={[palette.accent, "#3F5BE0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>
                  {isLast ? "Done" : "Next"}
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(6,8,24,0.88)",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: palette.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.surfaceLight,
  },
  skip: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    padding: 4,
  },
  skipText: {
    color: palette.textDim,
    fontWeight: "700",
    fontSize: 13,
  },
  touchMark: {
    position: "absolute",
    width: 14,
    height: 36,
    alignItems: "center",
  },
  touchTrail: {
    width: 2,
    height: 24,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  touchDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: palette.gold,
    borderWidth: 2,
    borderColor: palette.text,
    marginTop: -2,
  },
  iconDemo: {
    width: 110,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  helpersDemo: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  helperChip: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: palette.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
  },
  demoBox: {
    height: 138,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.sm,
  },
  title: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: spacing.sm,
    textAlign: "center",
  },
  body: {
    color: palette.textDim,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.surfaceLight,
  },
  dotActive: {
    backgroundColor: palette.accent,
    width: 22,
  },
  button: {
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: "center",
    width: "100%",
  },
  buttonText: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "900",
  },
});

export default Tutorial;
