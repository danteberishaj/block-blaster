import React from 'react';
import { View } from 'react-native';
import Block from './Block';

// Color indices into blockColors: pink, blue / purple, green — matches the app icon.
const LAYOUT = [
  [0, 1],
  [4, 2],
];

/** The static 2x2 block logo used on the home screen and headers. */
function LogoMark({ size = 56, gap = 6 }: { size?: number; gap?: number }) {
  return (
    <View>
      {LAYOUT.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row.map((colorIndex, c) => (
            <View key={c} style={{ margin: gap / 2 }}>
              <Block colorIndex={colorIndex} size={size} gap={0} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export default React.memo(LogoMark);
