import React from 'react';
import { View } from 'react-native';
import { Shape } from '../game/types';
import Block from './Block';

interface Props {
  shape: Shape;
  cell: number;
}

/** Renders a shape's filled cells in its bounding box. */
function ShapeView({ shape, cell }: Props) {
  const filled = new Set(shape.cells.map(([r, c]) => `${r},${c}`));
  return (
    <View style={{ width: shape.width * cell, height: shape.height * cell }}>
      {Array.from({ length: shape.height }).map((_, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {Array.from({ length: shape.width }).map((__, c) => (
            <View key={c} style={{ width: cell, height: cell }}>
              {filled.has(`${r},${c}`) && (
                <Block colorIndex={shape.colorIndex} size={cell} />
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export default React.memo(ShapeView);
