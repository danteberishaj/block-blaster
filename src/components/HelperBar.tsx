import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { palette, radii, spacing } from "../theme/theme";
import {
  canEarnRewardedHelperUse,
  type HelperCounts,
  type HelperType,
  type RewardedHelperUsage,
} from "../game/helpers";
import GameIcon from "./GameIcon";

export type { HelperCounts, HelperType } from "../game/helpers";

interface Props {
  counts: HelperCounts;
  disabled: boolean;
  bombArmed: boolean;
  onShuffle: () => void;
  onBomb: () => void;
  onHint: () => void;
  rewarding: HelperType | null;
  rewardedAdsAvailable: boolean;
  rewardUsage: RewardedHelperUsage;
  compact: boolean;
  onWatchAd: (type: HelperType) => void;
}

type HelperTone = "blue" | "red" | "gold";
type HelperIcon = "shuffle" | "break" | "hint";

const MAX_HELPER_FONT_SIZE_MULTIPLIER = 1.2;
const MIN_HELPER_FONT_SCALE = 0.8;

function HelperButton({
  iconName,
  label,
  count,
  tone,
  active,
  interactionDisabled,
  onPress,
  type,
  rewarding,
  rewardedAdsAvailable,
  rewardUsage,
  compact,
  onWatchAd,
}: {
  iconName: HelperIcon;
  label: string;
  count: number;
  tone: HelperTone;
  active?: boolean;
  interactionDisabled: boolean;
  onPress: () => void;
  type: HelperType;
  rewarding: HelperType | null;
  rewardedAdsAvailable: boolean;
  rewardUsage: RewardedHelperUsage;
  compact: boolean;
  onWatchAd: (type: HelperType) => void;
}) {
  const exhausted = count <= 0;
  const rewardCapReached =
    exhausted && !canEarnRewardedHelperUse(rewardUsage, type);
  const rewardAvailable =
    exhausted && rewardedAdsAvailable && !rewardCapReached;
  const loading = rewarding === type;
  const disabled =
    interactionDisabled ||
    rewarding !== null ||
    (exhausted && (!rewardedAdsAvailable || rewardCapReached));
  const toneStyle =
    tone === "blue"
      ? styles.blueDisc
      : tone === "red"
        ? styles.redDisc
        : styles.goldDisc;
  const toneColor =
    tone === "blue"
      ? palette.accent
      : tone === "red"
        ? palette.danger
        : palette.gold;
  const icon = (
    <View
      style={[styles.iconDisc, compact && styles.iconDiscCompact, toneStyle]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={toneColor} />
      ) : (
        <GameIcon
          name={iconName}
          size={compact ? 14 : 16}
          color={toneColor}
          strokeWidth={3}
        />
      )}
    </View>
  );

  return (
    <Pressable
      onPress={exhausted ? () => onWatchAd(type) : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={
        rewardAvailable
          ? `Watch an ad for one ${label} use`
          : rewardCapReached
            ? `${label}, rewarded use already claimed this run`
            : exhausted
              ? `${label}, no uses remaining. Rewarded ad unavailable`
              : `${label}, ${count} uses remaining`
      }
      accessibilityHint={
        rewardAvailable
          ? `Plays a rewarded ad and grants one ${label} use`
          : undefined
      }
      accessibilityState={{ disabled, selected: active, busy: loading }}
      style={({ pressed }) => [
        styles.btn,
        compact && styles.btnCompact,
        active && styles.btnActive,
        rewardAvailable && styles.btnReward,
        disabled && !loading && styles.btnDisabled,
        { opacity: pressed ? 0.78 : 1 },
      ]}
    >
      {rewardAvailable ? (
        <View style={styles.rewardContent}>
          <View
            style={[
              styles.rewardIdentity,
              compact && styles.rewardIdentityCompact,
            ]}
          >
            {icon}
            <Text
              style={[styles.label, compact && styles.labelCompact]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={MIN_HELPER_FONT_SCALE}
              maxFontSizeMultiplier={MAX_HELPER_FONT_SIZE_MULTIPLIER}
            >
              {label}
            </Text>
          </View>
          <Text
            style={styles.rewardAction}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={MIN_HELPER_FONT_SCALE}
            maxFontSizeMultiplier={MAX_HELPER_FONT_SIZE_MULTIPLIER}
          >
            {loading ? "Loading…" : "Watch Ad · +1"}
          </Text>
        </View>
      ) : (
        <>
          {icon}
          <Text
            style={[styles.label, compact && styles.labelCompact]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={MIN_HELPER_FONT_SCALE}
            maxFontSizeMultiplier={MAX_HELPER_FONT_SIZE_MULTIPLIER}
          >
            {loading ? "Loading…" : label}
          </Text>
          <Text
            style={[styles.count, compact && styles.countCompact]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={MIN_HELPER_FONT_SCALE}
            maxFontSizeMultiplier={MAX_HELPER_FONT_SIZE_MULTIPLIER}
          >
            {rewardCapReached ? "Used" : `x${count}`}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function HelperBar({
  counts,
  disabled,
  bombArmed,
  onShuffle,
  onBomb,
  onHint,
  rewarding,
  rewardedAdsAvailable,
  rewardUsage,
  compact,
  onWatchAd,
}: Props) {
  return (
    <View style={styles.wrap}>
      <HelperButton
        type="shuffle"
        iconName="shuffle"
        label="Shuffle"
        count={counts.shuffle}
        interactionDisabled={disabled}
        tone="blue"
        onPress={onShuffle}
        rewarding={rewarding}
        rewardedAdsAvailable={rewardedAdsAvailable}
        rewardUsage={rewardUsage}
        compact={compact}
        onWatchAd={onWatchAd}
      />
      <HelperButton
        type="bomb"
        iconName="break"
        label="Break"
        count={counts.bomb}
        interactionDisabled={disabled}
        tone="red"
        active={bombArmed}
        onPress={onBomb}
        rewarding={rewarding}
        rewardedAdsAvailable={rewardedAdsAvailable}
        rewardUsage={rewardUsage}
        compact={compact}
        onWatchAd={onWatchAd}
      />
      <HelperButton
        type="hint"
        iconName="hint"
        label="Hint"
        count={counts.hint}
        interactionDisabled={disabled}
        tone="gold"
        onPress={onHint}
        rewarding={rewarding}
        rewardedAdsAvailable={rewardedAdsAvailable}
        rewardUsage={rewardUsage}
        compact={compact}
        onWatchAd={onWatchAd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  btn: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(27,33,80,0.82)",
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: palette.surfaceLight,
    overflow: "hidden",
  },
  btnActive: {
    borderColor: palette.danger,
    backgroundColor: "rgba(255,92,122,0.18)",
  },
  btnCompact: {
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  btnReward: {
    backgroundColor: "rgba(38,46,99,0.9)",
    borderColor: "rgba(72,229,160,0.48)",
    paddingVertical: 5,
  },
  btnDisabled: {
    opacity: 0.48,
  },
  iconDisc: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDiscCompact: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  blueDisc: {
    backgroundColor: "rgba(91,124,255,0.24)",
  },
  redDisc: {
    backgroundColor: "rgba(255,92,122,0.22)",
  },
  goldDisc: {
    backgroundColor: "rgba(255,210,90,0.22)",
  },
  label: {
    minWidth: 0,
    flexShrink: 1,
    color: palette.text,
    fontSize: 12.5,
    fontWeight: "800",
  },
  labelCompact: {
    fontSize: 11.5,
  },
  count: {
    minWidth: 0,
    flexShrink: 1,
    color: palette.textDim,
    fontSize: 11,
    fontWeight: "900",
  },
  countCompact: {
    fontSize: 11,
  },
  rewardContent: {
    width: "100%",
    minWidth: 0,
    alignItems: "center",
  },
  rewardIdentity: {
    width: "100%",
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  rewardIdentityCompact: {
    gap: 2,
  },
  rewardAction: {
    width: "100%",
    color: palette.success,
    fontSize: 11.5,
    fontWeight: "900",
    marginTop: -2,
    textAlign: "center",
  },
});

export default React.memo(HelperBar);
