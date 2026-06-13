import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { radii } from '../theme/theme';

export interface Burst {
  id: number;
  cells: [number, number][];
  gridX: number;
  gridY: number;
  cell: number;
}

function BurstTile({ x, y, size }: { x: number; y: number; size: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 420 });
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [{ scale: 1 + p.value * 0.6 }],
  }));
  return (
    <Animated.View
      style={[
        styles.tile,
        { left: x, top: y, width: size, height: size, borderRadius: radii.cell },
        style,
      ]}
    />
  );
}

/** A short white flash that scales+fades over each cleared cell. */
export default function ClearBurst({
  burst,
  onDone,
}: {
  burst: Burst;
  onDone: (id: number) => void;
}) {
  const life = useSharedValue(0);
  useEffect(() => {
    life.value = withTiming(1, { duration: 460 }, (done) => {
      if (done) runOnJS(onDone)(burst.id);
    });
  }, []);

  return (
    <>
      {burst.cells.map(([r, c], i) => (
        <BurstTile
          key={i}
          x={burst.gridX + c * burst.cell + 2}
          y={burst.gridY + r * burst.cell + 2}
          size={burst.cell - 4}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  tile: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#fff',
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
});
