import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, radii } from '../theme/theme';

interface Props {
  score: number;
  highScore: number;
  isNewBest: boolean;
  comboStreak: number;
}

function Header({ score, highScore, isNewBest, comboStreak }: Props) {
  const scoreGap = Math.max(0, highScore - score);
  const showCombo = comboStreak >= 2;
  const scoreLabel =
    isNewBest || (highScore > 0 && score >= highScore)
      ? 'NEW BEST!'
      : highScore > 0
      ? `${scoreGap} TO BEST`
      : 'SCORE';

  return (
    <View style={styles.wrap}>
      <View style={[styles.sideCard, styles.bestCard]}>
        <Text style={styles.label}>BEST</Text>
        <Text style={styles.bestValue}>{highScore}</Text>
      </View>

      <View style={styles.scoreWrap}>
        <Text style={styles.scoreValue}>{score}</Text>
        <Text style={styles.scoreLabel}>{scoreLabel}</Text>
      </View>

      <View
        style={[
          styles.sideCard,
          styles.comboSlot,
          showCombo ? styles.comboCard : styles.ghost,
        ]}
      >
        {showCombo && (
          <>
            <Text style={styles.label}>CHAIN</Text>
            <Text style={styles.comboValue}>x{comboStreak}</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 78,
    position: 'relative',
  },
  sideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(27,33,80,0.84)',
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    height: 44,
    minWidth: 92,
    borderWidth: 1,
  },
  bestCard: {
    position: 'absolute',
    left: 0,
    top: 16,
    borderColor: palette.surfaceLight,
  },
  comboSlot: {
    position: 'absolute',
    right: 0,
    top: 16,
    justifyContent: 'center',
  },
  comboCard: {
    borderColor: 'rgba(255,210,90,0.58)',
    backgroundColor: 'rgba(255,210,90,0.12)',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  label: {
    color: palette.textDim,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  bestValue: {
    color: palette.gold,
    fontSize: 22,
    fontWeight: '900',
  },
  comboValue: {
    color: palette.gold,
    fontSize: 22,
    fontWeight: '900',
  },
  scoreWrap: {
    alignItems: 'center',
  },
  scoreValue: {
    color: palette.text,
    fontSize: 46,
    fontWeight: '900',
    textShadowColor: palette.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  scoreLabel: {
    color: palette.textDim,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: -4,
  },
});

export default React.memo(Header);
