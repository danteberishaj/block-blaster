import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { AppState, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import GameScreen from "./src/components/GameScreen";
import HomeScreen from "./src/components/HomeScreen";
import AnimatedSplash from "./src/components/AnimatedSplash";
import AppErrorBoundary from "./src/components/AppErrorBoundary";
import { initAudio, setAppAudioActive } from "./src/audio/audio";
import { hasSeenIntro, markIntroSeen } from "./src/storage/storage";
import { palette } from "./src/theme/theme";

// Keep the native splash up until our JS is ready, then hand off to the
// animated splash for a seamless branded intro.
SplashScreen.preventAutoHideAsync().catch(() => {});

type Screen = "home" | "game";

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean | null>(null);
  const [screen, setScreen] = useState<Screen>("home");

  useEffect(() => {
    let mounted = true;
    Promise.all([hasSeenIntro(), initAudio()]).then(([introSeen]) => {
      if (!mounted) return;
      setShowSplash(!introSeen);
      SplashScreen.hideAsync().catch((error) => {
        console.error("[Rowflare] Failed to hide the native splash.", error);
      });
    });

    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        setAppAudioActive(state === "active");
      },
    );

    return () => {
      mounted = false;
      appStateSubscription.remove();
    };
  }, []);

  const finishSplash = () => {
    setShowSplash(false);
    void markIntroSeen();
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppErrorBoundary>
          <StatusBar style="light" />

          {showSplash === false &&
            (screen === "home" ? (
              <HomeScreen onPlay={() => setScreen("game")} />
            ) : (
              <GameScreen onHome={() => setScreen("home")} />
            ))}

          {showSplash === true && <AnimatedSplash onFinish={finishSplash} />}
        </AppErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
});
