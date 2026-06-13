import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { blockColors, radii } from '../theme/theme';

interface Props {
  colorIndex: number;
  size: number;
  /** Inset between the cell edge and the block (the grid "gap"). */
  gap?: number;
}

/** A single glossy, gradient-filled block tile. */
function Block({ colorIndex, size, gap = 2 }: Props) {
  const color = blockColors[colorIndex] ?? blockColors[0];
  const inner = size - gap * 2;
  return (
    <View style={{ width: size, height: size, padding: gap }}>
      <LinearGradient
        colors={[color.from, color.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.block,
          {
            width: inner,
            height: inner,
            borderRadius: radii.cell,
            shadowColor: color.glow,
          },
        ]}
      >
        {/* glossy top highlight */}
        <View
          style={[
            styles.gloss,
            {
              height: inner * 0.32,
              borderTopLeftRadius: radii.cell,
              borderTopRightRadius: radii.cell,
            },
          ]}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 5,
    elevation: 4,
    overflow: 'hidden',
  },
  gloss: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
});

export default React.memo(Block);
