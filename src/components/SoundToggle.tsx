import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { palette } from "../theme/theme";
import {
  isAudioPlaybackSupported,
  isSoundOn,
  subscribeToSoundState,
  toggleSound,
} from "../audio/audio";
import GameIcon from "./GameIcon";

export default function SoundToggle({
  size = 38,
  disabled = false,
}: {
  size?: number;
  disabled?: boolean;
}) {
  const audioSupported = isAudioPlaybackSupported();
  const isDisabled = disabled || !audioSupported;
  const [on, setOn] = useState(audioSupported && isSoundOn());

  useEffect(
    () => subscribeToSoundState((enabled) => setOn(audioSupported && enabled)),
    [audioSupported],
  );

  return (
    <Pressable
      onPress={() => setOn(toggleSound())}
      disabled={isDisabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={
        audioSupported
          ? on
            ? "Mute sound"
            : "Unmute sound"
          : "Sound unavailable in web preview"
      }
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.btn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: isDisabled ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <GameIcon
        name={on ? "sound-on" : "sound-off"}
        size={size * 0.52}
        color={palette.textDim}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.surfaceLight,
  },
});
