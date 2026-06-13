import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, radii, spacing } from '../theme/theme';

interface Props {
  score: number;
  highScore: number;
  isNewBest: boolean;
}

function Header({ score, highScore, isNewBest }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.card, styles.bestCard]}>
        <Text style={styles.label}>BEST</Text>
        <View style={styles.row}>
          <Text style={styles.crown}>👑</Text>
          <Text style={styles.bestValue}>{highScore}</Text>
        </View>
      </View>

      <View style={styles.scoreWrap}>
        <Text style={styles.scoreValue}>{score}</Text>
        <Text style={styles.scoreLabel}>
          {isNewBest ? 'NEW BEST!' : 'SCORE'}
        </Text>
      </View>

      {/* spacer to balance the best card so score stays centered */}
      <View style={[styles.card, styles.ghost]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 92,
  },
  bestCard: {
    borderWidth: 1,
    borderColor: palette.surfaceLight,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  label: {
    color: palette.textDim,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  crown: { fontSize: 13 },
  bestValue: {
    color: palette.gold,
    fontSize: 18,
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
