import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, radii, spacing } from '../theme/theme';

interface Props {
  visible: boolean;
  score: number;
  highScore: number;
  isNewBest: boolean;
  canRevive: boolean;
  onRevive: () => void;
  onRestart: () => void;
  onHome: () => void;
}

function GameOverModal({
  visible,
  score,
  highScore,
  isNewBest,
  canRevive,
  onRevive,
  onRestart,
  onHome,
}: Props) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 12, stiffness: 140 });
      opacity.value = withTiming(1, { duration: 220 });
    } else {
      scale.value = 0.8;
      opacity.value = 0;
    }
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, cardStyle]}>
          <Text style={styles.title}>Game Over</Text>

          {isNewBest && (
            <View style={styles.bestBadge}>
              <Text style={styles.bestBadgeText}>🎉 NEW HIGH SCORE!</Text>
            </View>
          )}

          <View style={styles.scoreRow}>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>SCORE</Text>
              <Text style={styles.scoreValue}>{score}</Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>BEST</Text>
              <Text style={[styles.scoreValue, { color: palette.gold }]}>
                {highScore}
              </Text>
            </View>
          </View>

          {canRevive && (
            <Pressable
              onPress={onRevive}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, width: '100%' }]}
            >
              <LinearGradient
                colors={[palette.success, '#23B981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.button, { marginBottom: spacing.sm }]}
              >
                <Text style={styles.buttonText}>🔀  Shuffle & Continue</Text>
              </LinearGradient>
            </Pressable>
          )}

          <Pressable
            onPress={onRestart}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, width: '100%' }]}
          >
            <LinearGradient
              colors={[palette.accent, '#3F5BE0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Play Again</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={onHome}
            style={({ pressed }) => [styles.homeButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.homeText}>Home</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6,8,24,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: palette.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.surfaceLight,
  },
  title: {
    color: palette.text,
    fontSize: 34,
    fontWeight: '900',
    marginBottom: spacing.md,
  },
  bestBadge: {
    backgroundColor: 'rgba(255,210,90,0.16)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  bestBadgeText: {
    color: palette.gold,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  scoreBox: {
    backgroundColor: palette.bg,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    minWidth: 120,
  },
  scoreLabel: {
    color: palette.textDim,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  scoreValue: {
    color: palette.text,
    fontSize: 32,
    fontWeight: '900',
    marginTop: 2,
  },
  button: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  homeButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  homeText: {
    color: palette.textDim,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default React.memo(GameOverModal);
