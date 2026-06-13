import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, radii, spacing } from '../theme/theme';
import { makeShape } from '../game/shapes';
import ShapeView from './ShapeView';

interface Props {
  visible: boolean;
  onDone: () => void;
}

const STEPS = [
  {
    emoji: '👆',
    title: 'Drag the blocks',
    body: 'Drag a shape from the tray onto the board. You get three at a time.',
  },
  {
    emoji: '✨',
    title: 'Fill lines to clear',
    body: 'Complete a full row or column to blast it away and rack up points.',
  },
  {
    emoji: '🧠',
    title: 'Plan ahead',
    body: "If none of your three blocks fit anywhere, it's game over. Leave room!",
  },
  {
    emoji: '🧰',
    title: 'Use your helpers',
    body: 'Shuffle for fresh pieces, Break to smash a single block, or get a Hint — three of each per game.',
  },
];

/** A little looping demo: a block slides into a row and the row clears. */
function DemoAnimation({ step }: { step: number }) {
  const t = useSharedValue(0);

  // drive a 0..1 loop
  React.useEffect(() => {
    t.value = 0;
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400 }),
        withTiming(1, { duration: 400 })
      ),
      -1,
      false
    );
  }, [step]);

  const cell = 22;

  const dragStyle = useAnimatedStyle(() => {
    // slide the piece from the right into the empty slot
    const x = (1 - Math.min(t.value * 1.6, 1)) * (cell * 3);
    const settle = t.value > 0.62 ? 0 : 1;
    return {
      transform: [{ translateX: x }],
      opacity: settle ? 1 : 0,
    };
  });

  const clearStyle = useAnimatedStyle(() => {
    const cleared = step === 1 && t.value > 0.7;
    return { opacity: cleared ? 0.15 : 1 };
  });

  if (step >= 2) {
    // non-animated illustrative steps
    return (
      <View style={styles.demoBox}>
        <Text style={{ fontSize: step === 2 ? 44 : 32, letterSpacing: 6 }}>
          {step === 2 ? '🚫' : '🔀💣💡'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.demoBox}>
      <Animated.View style={[{ flexDirection: 'row' }, clearStyle]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              width: cell,
              height: cell,
              padding: 2,
            }}
          >
            <View
              style={{
                flex: 1,
                borderRadius: 5,
                backgroundColor:
                  i < 4 ? palette.cellEmpty : 'transparent',
                borderWidth: 1,
                borderColor: palette.cellEmptyBorder,
              }}
            />
          </View>
        ))}
      </Animated.View>
      {/* the dragging single block that fills the last slot */}
      <Animated.View
        style={[
          { position: 'absolute', right: 0, top: 0 },
          dragStyle,
        ]}
      >
        <ShapeView shape={makeShape(0, 1)} cell={cell} />
      </Animated.View>
    </View>
  );
}

function Tutorial({ visible, onDone }: Props) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) {
      setStep(0);
      onDone();
    } else {
      setStep((s) => s + 1);
    }
  };

  const skip = () => {
    setStep(0);
    onDone();
  };

  if (!visible) return null;

  const s = STEPS[step];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(150)}
          style={styles.card}
        >
          <Pressable style={styles.skip} onPress={skip} hitSlop={10}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>

          <Text style={styles.emoji}>{s.emoji}</Text>

          <Animated.View key={step} entering={FadeIn.duration(260)}>
            <DemoAnimation step={step} />
          </Animated.View>

          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.body}>{s.body}</Text>

          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === step && styles.dotActive,
                ]}
              />
            ))}
          </View>

          <Pressable onPress={next} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, width: '100%' }]}>
            <LinearGradient
              colors={[palette.accent, '#3F5BE0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {isLast ? "Let's play!" : 'Next'}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6,8,24,0.88)',
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
    paddingTop: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.surfaceLight,
  },
  skip: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: 4,
  },
  skipText: {
    color: palette.textDim,
    fontWeight: '700',
    fontSize: 13,
  },
  emoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  demoBox: {
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  title: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  body: {
    color: palette.textDim,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.surfaceLight,
  },
  dotActive: {
    backgroundColor: palette.accent,
    width: 22,
  },
  button: {
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '900',
  },
});

export default Tutorial;
