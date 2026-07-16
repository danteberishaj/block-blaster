import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { BOARD_SIZE, palette, radii } from "../theme/theme";
import { useReducedMotion } from "../accessibility/useReducedMotion";

export interface Burst {
  id: number;
  cells: [number, number][];
  gridX: number;
  gridY: number;
  cell: number;
  variant?: "clear" | "cross";
}

function BurstTile({
  x,
  y,
  size,
  variant,
}: {
  x: number;
  y: number;
  size: number;
  variant?: Burst["variant"];
}) {
  const reducedMotion = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, {
      duration: reducedMotion ? 200 : variant === "cross" ? 520 : 420,
    });
  }, [reducedMotion]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [
      {
        scale: reducedMotion
          ? 1
          : 1 + p.value * (variant === "cross" ? 0.85 : 0.6),
      },
    ],
  }));
  return (
    <Animated.View
      style={[
        styles.tile,
        variant === "cross" && styles.crossTile,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: radii.cell,
        },
        style,
      ]}
    />
  );
}

function CrossShock({ burst }: { burst: Burst }) {
  const reducedMotion = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: reducedMotion ? 200 : 520 });
  }, [reducedMotion]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.7 * (1 - p.value),
    transform: [{ scale: reducedMotion ? 1 : 0.96 + p.value * 0.12 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.crossShock,
        {
          left: burst.gridX,
          top: burst.gridY,
          width: burst.cell * BOARD_SIZE,
          height: burst.cell * BOARD_SIZE,
          borderRadius: radii.card,
        },
        style,
      ]}
    />
  );
}

/** A short white flash that scales+fades over each cleared cell. */
export default function ClearBurst({
  burst,
  onDone,
}: {
  burst: Burst;
  onDone: (id: number) => void;
}) {
  const reducedMotion = useReducedMotion();
  const life = useSharedValue(0);
  useEffect(() => {
    life.value = withTiming(
      1,
      { duration: reducedMotion ? 220 : 460 },
      (done) => {
        if (done) runOnJS(onDone)(burst.id);
      },
    );
  }, [reducedMotion]);

  return (
    <>
      {burst.variant === "cross" && <CrossShock burst={burst} />}
      {burst.cells.map(([r, c], i) => (
        <BurstTile
          key={i}
          x={burst.gridX + c * burst.cell + 2}
          y={burst.gridY + r * burst.cell + 2}
          size={burst.cell - 4}
          variant={burst.variant}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  tile: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.9)",
    shadowColor: "#fff",
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  crossTile: {
    backgroundColor: "rgba(72,229,160,0.88)",
    shadowColor: palette.success,
  },
  crossShock: {
    position: "absolute",
    borderWidth: 2,
    borderColor: palette.success,
    backgroundColor: "rgba(72,229,160,0.08)",
  },
});
