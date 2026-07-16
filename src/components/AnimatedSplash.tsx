import React, { useEffect } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { blockColors, palette } from "../theme/theme";
import { PRODUCT } from "../config/product";
import { useReducedMotion } from "../accessibility/useReducedMotion";

interface Props {
  onFinish: () => void;
}

const { width } = Dimensions.get("window");
const TILE = Math.min(64, width * 0.16);

// The Rowflare mark assembles as a clearing row from three directions.
const TILES = [
  { color: 1, fromX: -180, fromY: 30 },
  { color: 0, fromX: 0, fromY: -180 },
  { color: 3, fromX: 180, fromY: 30 },
];

function LogoTile({
  color,
  fromX,
  fromY,
  delay,
}: {
  color: number;
  fromX: number;
  fromY: number;
  delay: number;
}) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const c = blockColors[color];

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      delay,
      withSpring(1, { damping: 11, stiffness: 130, mass: 0.9 }),
    );
  }, [reducedMotion]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p,
      transform: [
        { translateX: fromX * (1 - p) },
        { translateY: fromY * (1 - p) },
        { scale: 0.4 + p * 0.6 },
        { rotate: `${(1 - p) * 90}deg` },
      ],
    };
  });

  return (
    <Animated.View style={style}>
      <LinearGradient
        colors={[c.from, c.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.tile, { shadowColor: c.glow }]}
      >
        <View style={styles.tileGloss} />
      </LinearGradient>
    </Animated.View>
  );
}

export default function AnimatedSplash({ onFinish }: Props) {
  const reducedMotion = useReducedMotion();
  const titleY = useSharedValue(20);
  const titleOpacity = useSharedValue(0);
  const tagOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      titleOpacity.value = 1;
      titleY.value = 0;
      tagOpacity.value = 1;
      containerOpacity.value = withDelay(
        180,
        withTiming(0, { duration: 120 }, (done) => {
          if (done) runOnJS(onFinish)();
        }),
      );
      return;
    }
    titleOpacity.value = withDelay(560, withTiming(1, { duration: 420 }));
    titleY.value = withDelay(
      560,
      withSpring(0, { damping: 13, stiffness: 120 }),
    );
    tagOpacity.value = withDelay(820, withTiming(1, { duration: 420 }));

    // hold, then fade the whole splash out and hand off to the game
    containerOpacity.value = withDelay(
      1850,
      withTiming(
        0,
        { duration: 420, easing: Easing.in(Easing.quad) },
        (done) => {
          if (done) runOnJS(onFinish)();
        },
      ),
    );
  }, [reducedMotion]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tagOpacity.value }));
  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, containerStyle]}>
      <LinearGradient
        colors={[palette.bg, palette.bgDeep]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.center}>
        <View style={styles.logoGrid}>
          <View style={styles.logoRow}>
            {TILES.map((tile, index) => (
              <LogoTile key={tile.color} {...tile} delay={index * 100} />
            ))}
          </View>
          <View style={styles.flare} />
        </View>

        <Animated.Text style={[styles.title, titleStyle]}>
          {PRODUCT.wordmarkLead}
          <Text style={{ color: palette.accent }}>
            {PRODUCT.wordmarkAccent}
          </Text>
        </Animated.Text>
        <Animated.Text style={[styles.tagline, tagStyle]}>
          Fill • Clear • Score
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoGrid: {
    marginBottom: 32,
    position: "relative",
  },
  logoRow: {
    flexDirection: "row",
  },
  flare: {
    position: "absolute",
    width: 25,
    height: 25,
    left: "50%",
    top: "50%",
    marginLeft: -12.5,
    marginTop: -12.5,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    transform: [{ rotate: "45deg" }],
  },
  tile: {
    width: TILE,
    height: TILE,
    margin: 4,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  tileGloss: {
    width: "100%",
    height: "34%",
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  title: {
    color: palette.text,
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: 2,
    textShadowColor: palette.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  tagline: {
    color: palette.textDim,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 4,
    marginTop: 10,
  },
});
