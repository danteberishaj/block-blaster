import React from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { palette, radii } from "../theme/theme";

interface Props {
  score: number;
  highScore: number;
  isNewBest: boolean;
  comboStreak: number;
}

function Header({ score, highScore, isNewBest, comboStreak }: Props) {
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= 1.45;
  const scoreGap = Math.max(0, highScore - score);
  const showCombo = comboStreak >= 2;
  const scoreLabel =
    isNewBest || (highScore > 0 && score >= highScore)
      ? "NEW BEST!"
      : highScore > 0
        ? `${scoreGap} TO BEST`
        : "SCORE";

  const bestCard = (
    <View style={[styles.sideCard, styles.bestCard]}>
      <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit>
        BEST
      </Text>
      <Text
        style={styles.bestValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
      >
        {highScore}
      </Text>
    </View>
  );

  const scoreCard = (
    <View style={[styles.scoreWrap, stacked && styles.scoreWrapStacked]}>
      <Text
        style={styles.scoreValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
      >
        {score}
      </Text>
      <Text style={styles.scoreLabel} numberOfLines={1} adjustsFontSizeToFit>
        {scoreLabel}
      </Text>
    </View>
  );

  const comboCard = (
    <View
      style={[
        styles.sideCard,
        styles.comboSlot,
        showCombo ? styles.comboCard : styles.ghost,
      ]}
    >
      {showCombo && (
        <>
          <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit>
            CHAIN
          </Text>
          <Text
            style={styles.comboValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            x{comboStreak}
          </Text>
        </>
      )}
    </View>
  );

  if (stacked) {
    return (
      <View style={[styles.wrap, styles.wrapStacked]}>
        {scoreCard}
        <View style={styles.secondaryRow}>
          {bestCard}
          {comboCard}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {bestCard}
      {scoreCard}
      {comboCard}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 78,
    flexDirection: "row",
    gap: 8,
  },
  wrapStacked: {
    flexDirection: "column",
    minHeight: 112,
    gap: 4,
  },
  secondaryRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  sideCard: {
    flex: 1,
    minWidth: 0,
    maxWidth: 120,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(27,33,80,0.84)",
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  bestCard: {
    borderColor: palette.surfaceLight,
  },
  comboSlot: {
    justifyContent: "center",
  },
  comboCard: {
    borderColor: "rgba(255,210,90,0.58)",
    backgroundColor: "rgba(255,210,90,0.12)",
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  label: {
    color: palette.textDim,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    flexShrink: 1,
  },
  bestValue: {
    color: palette.gold,
    fontSize: 22,
    fontWeight: "900",
    flexShrink: 1,
  },
  comboValue: {
    color: palette.gold,
    fontSize: 22,
    fontWeight: "900",
    flexShrink: 1,
  },
  scoreWrap: {
    flex: 1.2,
    minWidth: 0,
    alignItems: "center",
  },
  scoreWrapStacked: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
    width: "100%",
  },
  scoreValue: {
    color: palette.text,
    fontSize: 46,
    fontWeight: "900",
    textShadowColor: palette.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
    maxWidth: "100%",
  },
  scoreLabel: {
    color: palette.textDim,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: -4,
    maxWidth: "100%",
  },
});

export default React.memo(Header);
