import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import GameScreen from './src/components/GameScreen';
import HomeScreen from './src/components/HomeScreen';
import AnimatedSplash from './src/components/AnimatedSplash';
import { initAudio } from './src/audio/audio';
import { initializeUnityAds } from './src/ads/unityAds';
import { palette } from './src/theme/theme';

// Keep the native splash up until our JS is ready, then hand off to the
// animated splash for a seamless branded intro.
SplashScreen.preventAutoHideAsync().catch(() => {});

type Screen = 'home' | 'game';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [screen, setScreen] = useState<Screen>('home');

  useEffect(() => {
    // Native splash can drop now; the animated splash takes over instantly.
    SplashScreen.hideAsync().catch(() => {});
    // Start the background music + load the line-clear sound.
    initAudio();
    initializeUnityAds();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />

      {screen === 'home' ? (
        <HomeScreen onPlay={() => setScreen('game')} />
      ) : (
        <GameScreen onHome={() => setScreen('home')} />
      )}

      {showSplash && <AnimatedSplash onFinish={() => setShowSplash(false)} />}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
});
