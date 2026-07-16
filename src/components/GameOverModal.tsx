import React, { useEffect } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { palette, radii, spacing } from "../theme/theme";
import GameIcon from "./GameIcon";
import { useReducedMotion } from "../accessibility/useReducedMotion";

interface Props {
  visible: boolean;
  score: number;
  highScore: number;
  isNewBest: boolean;
  runBestChain: number;
  bestChain: number;
  isNewBestChain: boolean;
  biggestBlast: number;
  shuffleUses: number;
  rewardedAdsAvailable: boolean;
  reviveLoading: boolean;
  reviveDisabled: boolean;
  onRevive: () => void;
  onRestart: () => void;
  onHome: () => void;
}

function GameOverModal({
  visible,
  score,
  highScore,
  isNewBest,
  runBestChain,
  bestChain,
  isNewBestChain,
  biggestBlast,
  shuffleUses,
  rewardedAdsAvailable,
  reviveLoading,
  reviveDisabled,
  onRevive,
  onRestart,
  onHome,
}: Props) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const reviveWithAd = shuffleUses <= 0;
  const canRevive = shuffleUses > 0 || rewardedAdsAvailable;

  useEffect(() => {
    if (visible) {
      scale.value = reducedMotion
        ? 1
        : withSpring(1, { damping: 12, stiffness: 140 });
      opacity.value = withTiming(1, { duration: reducedMotion ? 1 : 220 });
    } else {
      scale.value = 0.8;
      opacity.value = 0;
    }
  }, [visible, reducedMotion]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!reviveLoading) onHome();
      }}
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
        >
          <Animated.View style={[styles.card, cardStyle]}>
            <Text style={styles.title} accessibilityRole="header">
              Game Over
            </Text>

            {isNewBest && (
              <View style={styles.bestBadge}>
                <GameIcon name="best" size={16} color={palette.gold} />
                <Text style={styles.bestBadgeText}>NEW BEST</Text>
              </View>
            )}

            <View style={styles.scoreRow}>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreLabel}>SCORE</Text>
                <Text
                  style={styles.scoreValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.55}
                >
                  {score}
                </Text>
              </View>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreLabel}>BEST</Text>
                <Text
                  style={[styles.scoreValue, { color: palette.gold }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.55}
                >
                  {highScore}
                </Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.scoreLabel}>RUN CHAIN</Text>
                <Text
                  style={[
                    styles.statValue,
                    isNewBestChain && { color: palette.gold },
                  ]}
                >
                  x{runBestChain}
                </Text>
                <Text
                  style={[
                    styles.statMeta,
                    isNewBestChain && { color: palette.gold },
                  ]}
                >
                  BEST x{bestChain}
                </Text>
              </View>
              {biggestBlast > 0 && (
                <View style={styles.statBox}>
                  <Text style={styles.scoreLabel}>BIGGEST BLAST</Text>
                  <Text style={styles.statValue}>+{biggestBlast}</Text>
                </View>
              )}
            </View>

            {canRevive && (
              <Pressable
                onPress={onRevive}
                disabled={reviveDisabled}
                accessibilityRole="button"
                accessibilityLabel={
                  reviveWithAd
                    ? "Watch an ad and continue with a fresh tray"
                    : `Use one Shuffle and continue. ${shuffleUses} remaining`
                }
                accessibilityState={{
                  disabled: reviveDisabled,
                  busy: reviveLoading,
                }}
                style={({ pressed }) => [
                  styles.fullWidth,
                  { opacity: reviveDisabled ? 0.5 : pressed ? 0.85 : 1 },
                ]}
              >
                <LinearGradient
                  colors={[palette.success, "#23B981"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.button, { marginBottom: spacing.sm }]}
                >
                  <GameIcon
                    name={reviveWithAd ? "play" : "shuffle"}
                    size={20}
                    color={palette.bgDeep}
                  />
                  <Text style={[styles.buttonText, styles.reviveButtonText]}>
                    {reviveLoading
                      ? "Loading Ad…"
                      : reviveWithAd
                        ? "Watch Ad & Continue"
                        : "Shuffle & Continue"}
                  </Text>
                </LinearGradient>
              </Pressable>
            )}

            <Pressable
              onPress={onRestart}
              disabled={reviveLoading}
              accessibilityRole="button"
              accessibilityState={{ disabled: reviveLoading }}
              style={({ pressed }) => [
                styles.fullWidth,
                { opacity: reviveLoading ? 0.5 : pressed ? 0.85 : 1 },
              ]}
            >
              <LinearGradient
                colors={[palette.accent, "#3F5BE0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Play Again</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={onHome}
              disabled={reviveLoading}
              accessibilityRole="button"
              accessibilityState={{ disabled: reviveLoading }}
              style={({ pressed }) => [
                styles.homeButton,
                { opacity: reviveLoading ? 0.5 : pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.homeText}>Home</Text>
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
    backgroundColor: "rgba(6,8,24,0.82)",
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
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.surfaceLight,
  },
  title: {
    color: palette.text,
    fontSize: 34,
    fontWeight: "900",
    marginBottom: spacing.md,
  },
  bestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,210,90,0.16)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  bestBadgeText: {
    color: palette.gold,
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  scoreRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
    width: "100%",
  },
  scoreBox: {
    flex: 1,
    minWidth: 0,
    backgroundColor: palette.bg,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  scoreLabel: {
    color: palette.textDim,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  scoreValue: {
    color: palette.text,
    fontSize: 32,
    fontWeight: "900",
    marginTop: 2,
  },
  statRow: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(8,10,31,0.42)",
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.surfaceLight,
  },
  statValue: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2,
  },
  statMeta: {
    color: palette.textDim,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: 0.4,
  },
  button: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  fullWidth: {
    width: "100%",
  },
  buttonText: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center",
    flexShrink: 1,
  },
  reviveButtonText: {
    color: palette.bgDeep,
  },
  homeButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  homeText: {
    color: palette.textDim,
    fontSize: 15,
    fontWeight: "700",
  },
});

export default React.memo(GameOverModal);
