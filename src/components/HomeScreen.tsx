import React, { useEffect, useState } from 'react';
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
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { blockColors, palette, radii, spacing } from '../theme/theme';
import { getHighScore } from '../storage/storage';
import LogoMark from './LogoMark';
import Tutorial from './Tutorial';

const { width, height } = Dimensions.get('window');

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
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.quad) }), -1, true)
    );
  }, []);
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
      style={[{ position: 'absolute', left, top, opacity: 0.12 }, style]}
    >
      <LinearGradient
        colors={[c.from, c.to]}
        style={{ width: size, height: size, borderRadius: size * 0.2 }}
      />
    </Animated.View>
  );
}

export default function HomeScreen({ onPlay }: Props) {
  const [highScore, setHighScore] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    getHighScore().then(setHighScore);
  }, []);

  // Breathing pulse on the Play button.
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.045, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, []);
  const playStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  // Gentle logo bob.
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, []);
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 + bob.value * 12 }],
  }));

  const topPad =
    (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 44) + 8;

  const play = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPlay();
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[palette.bg, palette.bgDeep]}
        style={StyleSheet.absoluteFill}
      />

      {/* ambient drifting blocks */}
      <FloatingBlock colorIndex={1} left={width * 0.1} top={height * 0.12} size={70} delay={0} />
      <FloatingBlock colorIndex={0} left={width * 0.78} top={height * 0.16} size={54} delay={800} />
      <FloatingBlock colorIndex={2} left={width * 0.82} top={height * 0.68} size={64} delay={1600} />
      <FloatingBlock colorIndex={4} left={width * 0.08} top={height * 0.72} size={48} delay={400} />

      <View style={[styles.content, { paddingTop: topPad }]}>
        <View style={styles.hero}>
          <Animated.View entering={FadeIn.duration(500)} style={logoStyle}>
            <LogoMark size={50} gap={8} />
          </Animated.View>

          <Animated.Text entering={FadeInDown.delay(150).duration(500)} style={styles.title}>
            BLOCK <Text style={{ color: palette.accent }}>BLAST</Text>
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(280).duration(500)} style={styles.tagline}>
            FILL · CLEAR · COMBO
          </Animated.Text>

          {highScore > 0 && (
            <Animated.View entering={FadeIn.delay(420)} style={styles.bestPill}>
              <Text style={styles.crown}>👑</Text>
              <Text style={styles.bestText}>BEST {highScore}</Text>
            </Animated.View>
          )}
        </View>

        <Animated.View
          entering={FadeInDown.delay(380).duration(500)}
          style={styles.actions}
        >
          <Animated.View style={[{ width: '100%' }, playStyle]}>
            <Pressable onPress={play} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
              <LinearGradient
                colors={['#6E8BFF', '#3F5BE0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.playButton}
              >
                <Text style={styles.playText}>▶  PLAY</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Pressable
            onPress={() => setShowTutorial(true)}
            style={({ pressed }) => [styles.howButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.howText}>How to Play</Text>
          </Pressable>
        </Animated.View>
      </View>

      <Tutorial visible={showTutorial} onDone={() => setShowTutorial(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    paddingBottom: spacing.xl * 1.6,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: palette.text,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: spacing.xl,
    textShadowColor: palette.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },
  tagline: {
    color: palette.textDim,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: spacing.sm,
  },
  bestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: palette.surfaceLight,
  },
  crown: { fontSize: 14 },
  bestText: {
    color: palette.gold,
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  playButton: {
    width: '100%',
    paddingVertical: 20,
    borderRadius: radii.pill,
    alignItems: 'center',
    shadowColor: palette.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  playText: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  howButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  howText: {
    color: palette.textDim,
    fontSize: 15,
    fontWeight: '700',
  },
});
