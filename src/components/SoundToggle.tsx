import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { palette } from '../theme/theme';
import { isSoundOn, toggleSound } from '../audio/audio';

export default function SoundToggle({ size = 38 }: { size?: number }) {
  const [on, setOn] = useState(isSoundOn());

  return (
    <Pressable
      onPress={() => setOn(toggleSound())}
      hitSlop={10}
      accessibilityLabel={on ? 'Mute sound' : 'Unmute sound'}
      style={({ pressed }) => [
        styles.btn,
        { width: size, height: size, borderRadius: size / 2, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={styles.icon}>{on ? '🔊' : '🔇'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.surfaceLight,
  },
  icon: { fontSize: 16 },
});
