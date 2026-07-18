import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { blockColors, palette, radii, spacing } from "../theme/theme";
import {
  getHighScore,
  hasSavedRun,
  markTutorialSeen,
} from "../storage/storage";
import LogoMark from "./LogoMark";
import Tutorial from "./Tutorial";
import SoundToggle from "./SoundToggle";
import GameIcon from "./GameIcon";
import { PRODUCT } from "../config/product";
import { useReducedMotion } from "../accessibility/useReducedMotion";
import PrivacySupportModal from "./PrivacySupportModal";

const MAX_CONTENT_WIDTH = 460;

interface Props {
  onPlay: () => void;
}

/** A faint, slowly drifting block in the background for ambiance. */
function FloatingBlock({
  colorIndex,
  left,
  top,
  size,
  delay,
}: {
  colorIndex: number;
  left: number;
  top: number;
  size: number;
  delay: number;
}) {
  const reducedMotion = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) {
      t.value = 0.5;
      return;
    }
    t.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      ),
    );
  }, [reducedMotion]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -14 + t.value * 28 },
      { rotate: `${-8 + t.value * 16}deg` },
    ],
  }));
  const c = blockColors[colorIndex];
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left, top, opacity: 0.12 }, style]}
    >
      <LinearGradient
        colors={[c.from, c.to]}
        style={{ width: size, height: size, borderRadius: size * 0.2 }}
      />
    </Animated.View>
  );
}

export default function HomeScreen({ onPlay }: Props) {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [highScore, setHighScore] = useState(0);
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showPrivacySupport, setShowPrivacySupport] = useState(false);

  useEffect(() => {
    Promise.all([getHighScore(), hasSavedRun()]).then(([score, hasRun]) => {
      setHighScore(score);
      setResumeAvailable(hasRun);
    });
  }, []);

  // Breathing pulse on the Play button.
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.045, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [reducedMotion]);
  const playStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  // Gentle logo bob.
  const bob = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) {
      bob.value = 0.5;
      return;
    }
    bob.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [reducedMotion]);
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 + bob.value * 12 }],
  }));

  const topPad = insets.top + spacing.sm;
  const bottomPad = Math.max(insets.bottom + spacing.lg, spacing.xl * 1.6);
  const modalOpen = showTutorial || showPrivacySupport;

  const play = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPlay();
  };

  const finishTutorial = () => {
    setShowTutorial(false);
    void markTutorialSeen();
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={palette.bgGradient}
        style={StyleSheet.absoluteFill}
      />

      {/* ambient drifting blocks */}
      <FloatingBlock
        colorIndex={1}
        left={width * 0.1}
        top={height * 0.12}
        size={70}
        delay={0}
      />
      <FloatingBlock
        colorIndex={0}
        left={width * 0.78}
        top={height * 0.16}
        size={54}
        delay={800}
      />
      <FloatingBlock
        colorIndex={2}
        left={width * 0.82}
        top={height * 0.68}
        size={64}
        delay={1600}
      />
      <FloatingBlock
        colorIndex={4}
        left={width * 0.08}
        top={height * 0.72}
        size={48}
        delay={400}
      />

      <View
        style={[styles.soundCorner, { top: topPad }]}
        aria-hidden={modalOpen}
        accessibilityElementsHidden={modalOpen}
        importantForAccessibility={modalOpen ? "no-hide-descendants" : "auto"}
      >
        <SoundToggle />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPad, paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        aria-hidden={modalOpen}
        accessibilityElementsHidden={modalOpen}
        importantForAccessibility={modalOpen ? "no-hide-descendants" : "auto"}
      >
        <View
          style={[
            styles.content,
            { width: Math.min(MAX_CONTENT_WIDTH, width - spacing.xl * 2) },
          ]}
        >
          <View style={styles.hero}>
            <Animated.View
              entering={reducedMotion ? undefined : FadeIn.duration(500)}
              style={logoStyle}
            >
              <LogoMark size={50} gap={8} />
            </Animated.View>

            <Animated.Text
              entering={
                reducedMotion ? undefined : FadeInDown.delay(150).duration(500)
              }
              style={[styles.title, width < 360 && styles.titleCompact]}
            >
              {PRODUCT.wordmarkLead}
              {fontScale >= 1.45 ? "\n" : null}
              <Text style={{ color: palette.accent }}>
                {PRODUCT.wordmarkAccent}
              </Text>
            </Animated.Text>
            <Animated.Text
              entering={
                reducedMotion ? undefined : FadeInDown.delay(280).duration(500)
              }
              style={styles.tagline}
            >
              FILL · CLEAR · COMBO
            </Animated.Text>

            {highScore > 0 && (
              <Animated.View
                entering={reducedMotion ? undefined : FadeIn.delay(420)}
                style={styles.bestPill}
              >
                <Text style={styles.bestText}>BEST {highScore}</Text>
              </Animated.View>
            )}
          </View>

          <Animated.View
            entering={
              reducedMotion ? undefined : FadeInDown.delay(380).duration(500)
            }
            style={styles.actions}
          >
            <Animated.View style={[styles.playShell, playStyle]}>
              <Pressable
                onPress={play}
                accessibilityRole="button"
                accessibilityLabel={
                  resumeAvailable ? "Resume saved run" : "Start a new run"
                }
                style={({ pressed }) => [
                  styles.playPressable,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <LinearGradient
                  colors={palette.primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.playButton}
                >
                  <GameIcon name="play" size={24} color={palette.text} />
                  <Text style={styles.playText}>
                    {resumeAvailable ? "RESUME" : "PLAY"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Pressable
              onPress={() => setShowTutorial(true)}
              accessibilityRole="button"
              accessibilityLabel="How to play"
              style={({ pressed }) => [
                styles.howButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.howText}>How to Play</Text>
            </Pressable>

            <Pressable
              onPress={() => setShowPrivacySupport(true)}
              accessibilityRole="button"
              accessibilityLabel="Privacy and support"
              style={({ pressed }) => [
                styles.privacyButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.privacyText}>Privacy & Support</Text>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>

      <Tutorial visible={showTutorial} onDone={finishTutorial} />
      <PrivacySupportModal
        visible={showPrivacySupport}
        onClose={() => setShowPrivacySupport(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  soundCorner: {
    position: "absolute",
    right: spacing.lg,
    zIndex: 10,
  },
  scroll: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  content: {
    flexGrow: 1,
    maxWidth: MAX_CONTENT_WIDTH,
    justifyContent: "space-between",
  },
  hero: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: palette.text,
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: spacing.xl,
    maxWidth: "100%",
    textAlign: "center",
    textShadowColor: palette.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },
  titleCompact: {
    fontSize: 38,
    letterSpacing: 1.5,
  },
  tagline: {
    color: palette.textDim,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 4,
    marginTop: spacing.sm,
  },
  bestPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: palette.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: palette.surfaceLight,
  },
  bestText: {
    color: palette.gold,
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 1,
  },
  actions: {
    alignSelf: "stretch",
    alignItems: "center",
    gap: spacing.md,
  },
  playShell: {
    alignSelf: "stretch",
  },
  playPressable: {
    alignSelf: "stretch",
  },
  playButton: {
    alignSelf: "stretch",
    paddingVertical: 20,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    shadowColor: palette.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  playText: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 2,
  },
  howButton: {
    minHeight: 48,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  howText: {
    color: palette.textDim,
    fontSize: 15,
    fontWeight: "700",
  },
  privacyButton: {
    minHeight: 48,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  privacyText: {
    color: palette.textDim,
    fontSize: 13,
    fontWeight: "700",
  },
});
