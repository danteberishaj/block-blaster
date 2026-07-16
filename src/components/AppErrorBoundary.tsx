import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { palette, radii, spacing } from "../theme/theme";

interface State {
  error: Error | null;
}

export default class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[Rowflare] Unhandled render error.", error, info);
  }

  private retry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.root} accessibilityRole="alert">
        <Text style={styles.title}>Rowflare hit a snag</Text>
        <Text style={styles.body}>
          Try loading the interface again. If you had a saved run, it should
          remain on this device.
        </Text>
        <Pressable
          onPress={this.retry}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { opacity: pressed ? 0.78 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.bg,
    padding: spacing.xl,
  },
  title: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  body: {
    color: palette.textDim,
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
    marginTop: spacing.sm,
    maxWidth: 360,
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: palette.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  buttonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900",
  },
});
