import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '../theme/theme';

export interface ComboData {
  id: number;
  text: string; // main label, e.g. "COMBO ×3" or "TRIPLE!"
  sub: string; // secondary, e.g. "+120"
  intensity: number; // drives color (max of combo / lines)
  centerY: number; // window y to anchor on (board center)
  variant?: 'clear' | 'combo' | 'cross';
}

function colorFor(intensity: number, variant?: ComboData['variant']): string {
  if (variant === 'cross') return palette.success;
  if (intensity >= 6) return palette.danger;
  if (intensity >= 4) return '#C79BFF';
  if (intensity >= 3) return palette.gold;
  return palette.accent;
}

export default function ComboPopup({
  data,
  onDone,
}: {
  data: ComboData;
  onDone: (id: number) => void;
}) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);
  const ty = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.15, { damping: 8, stiffness: 220 }),
      withTiming(1, { duration: 120 })
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 130 }),
      withDelay(520, withTiming(0, { duration: 420 }, (f) => {
        if (f) runOnJS(onDone)(data.id);
      }))
    );
    ty.value = withDelay(
      360,
      withTiming(-48, { duration: 620, easing: Easing.out(Easing.quad) })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }, { scale: scale.value }],
  }));

  const color = colorFor(data.intensity, data.variant);

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { top: data.centerY - 40 }]}
    >
      <Animated.View style={[styles.inner, style]}>
        <Text style={[styles.text, { color, textShadowColor: color }]}>
          {data.text}
        </Text>
        {!!data.sub && <Text style={styles.sub}>{data.sub}</Text>}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  inner: { alignItems: 'center' },
  text: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  sub: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
