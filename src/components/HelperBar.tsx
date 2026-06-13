import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, radii, spacing } from '../theme/theme';

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

function HelperButton({
  icon,
  label,
  count,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  count: number;
  active?: boolean;
  onPress: () => void;
}) {
  const disabled = count <= 0;
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
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.badge, disabled && styles.badgeEmpty]}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    </Pressable>
  );
}

function HelperBar({ counts, bombArmed, onShuffle, onBomb, onHint }: Props) {
  return (
    <View style={styles.wrap}>
      <HelperButton icon="🔀" label="Shuffle" count={counts.shuffle} onPress={onShuffle} />
      <HelperButton
        icon="💣"
        label={bombArmed ? 'Tap a block' : 'Break'}
        count={counts.bomb}
        active={bombArmed}
        onPress={onBomb}
      />
      <HelperButton icon="💡" label="Hint" count={counts.hint} onPress={onHint} />
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
    backgroundColor: palette.surface,
    borderRadius: radii.pill,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: palette.surfaceLight,
  },
  btnActive: {
    borderColor: palette.danger,
    backgroundColor: 'rgba(255,92,122,0.18)',
  },
  icon: { fontSize: 16 },
  label: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '800',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmpty: {
    backgroundColor: palette.surfaceLight,
  },
  badgeText: {
    color: palette.text,
    fontSize: 11,
    fontWeight: '900',
  },
});

export default React.memo(HelperBar);
