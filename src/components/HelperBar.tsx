import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, radii, spacing } from '../theme/theme';
import GameIcon from './GameIcon';

export interface HelperCounts {
  shuffle: number;
  bomb: number;
  hint: number;
}

interface Props {
  counts: HelperCounts;
  bombArmed: boolean;
  onShuffle: () => void;
  onBomb: () => void;
  onHint: () => void;
}

type HelperTone = 'blue' | 'red' | 'gold';
type HelperIcon = 'shuffle' | 'break' | 'hint';

function HelperButton({
  iconName,
  label,
  count,
  tone,
  active,
  onPress,
}: {
  iconName: HelperIcon;
  label: string;
  count: number;
  tone: HelperTone;
  active?: boolean;
  onPress: () => void;
}) {
  const disabled = count <= 0;
  const toneStyle =
    tone === 'blue'
      ? styles.blueDisc
      : tone === 'red'
      ? styles.redDisc
      : styles.goldDisc;
  const toneColor =
    tone === 'blue' ? palette.accent : tone === 'red' ? palette.danger : palette.gold;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        active && styles.btnActive,
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}
    >
      <View style={[styles.iconDisc, toneStyle]}>
        <GameIcon
          name={iconName}
          size={16}
          color={toneColor}
          strokeWidth={3}
        />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.count, disabled && styles.countEmpty]}>x{count}</Text>
    </Pressable>
  );
}

function HelperBar({ counts, bombArmed, onShuffle, onBomb, onHint }: Props) {
  return (
    <View style={styles.wrap}>
      <HelperButton
        iconName="shuffle"
        label="Shuffle"
        count={counts.shuffle}
        tone="blue"
        onPress={onShuffle}
      />
      <HelperButton
        iconName="break"
        label="Break"
        count={counts.bomb}
        tone="red"
        active={bombArmed}
        onPress={onBomb}
      />
      <HelperButton
        iconName="hint"
        label="Hint"
        count={counts.hint}
        tone="gold"
        onPress={onHint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(27,33,80,0.82)',
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: palette.surfaceLight,
  },
  btnActive: {
    borderColor: palette.danger,
    backgroundColor: 'rgba(255,92,122,0.18)',
  },
  iconDisc: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueDisc: {
    backgroundColor: 'rgba(91,124,255,0.24)',
  },
  redDisc: {
    backgroundColor: 'rgba(255,92,122,0.22)',
  },
  goldDisc: {
    backgroundColor: 'rgba(255,210,90,0.22)',
  },
  label: {
    color: palette.text,
    fontSize: 12.5,
    fontWeight: '800',
  },
  count: {
    color: palette.textDim,
    fontSize: 11,
    fontWeight: '900',
  },
  countEmpty: {
    color: palette.textMuted,
  },
});

export default React.memo(HelperBar);
