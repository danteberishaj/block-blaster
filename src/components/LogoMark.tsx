import React from "react";
import { StyleSheet, View } from "react-native";
import Block from "./Block";

/** A three-tile clearing row with a central flare, matching the app icon. */
function LogoMark({ size = 56, gap = 6 }: { size?: number; gap?: number }) {
  const tileSize = size * 0.72;

  return (
    <View style={styles.row} accessibilityElementsHidden>
      {[1, 0, 3].map((colorIndex) => (
        <View key={colorIndex} style={{ marginHorizontal: gap / 2 }}>
          <Block colorIndex={colorIndex} size={tileSize} gap={0} />
        </View>
      ))}
      <View
        style={[
          styles.flare,
          {
            width: tileSize * 0.3,
            height: tileSize * 0.3,
            marginLeft: -(tileSize * 0.15),
            marginTop: -(tileSize * 0.15),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  flare: {
    position: "absolute",
    left: "50%",
    top: "50%",
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
    borderRadius: 3,
  },
});

export default React.memo(LogoMark);
