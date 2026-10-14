import "react-native-gesture-handler";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import * as Font from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { useSettingsStore } from "./src/state/settings/store";
import { useEntitlementsStore } from "./src/state/entitlements/store";
import { initEntitlements } from "./src/services/entitlements";
import { FONT_FILES } from "./src/ui/fonts";

import { useSoundStore } from "./src/state/sound/store";
import { useSoundManager } from "./src/audio/soundManager";
import StackNavigator from "./src/navigation/StackNavigator";
import { getPreloadImages } from "./src/ui/preloadImages";
import ImageWarmup from "./src/ui/components/ImageWarmup";
import { prefetchLeaderboardThreshold } from "./src/services/highscores";
import { installGlobalErrorHandler } from "./src/services/analytics";
import ErrorBoundary from "./src/ui/components/ErrorBoundary";
import LoadingScreen from "./src/ui/components/LoadingScreen";
import { readDevHarness } from "./src/dev/devHarness";

installGlobalErrorHandler();

// Web dev builds only: ?screen=...&preset=... opens a screen directly (null everywhere else).
const devLaunch = readDevHarness();

/** Longest the splash waits for the audio engine before starting the app anyway. */
const AUDIO_INIT_TIMEOUT_MS = 2500;

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [assetsDownloaded, setAssetsDownloaded] = useState(false);
  const warmImages = useMemo(() => getPreloadImages(), []);
  
  // Use the SoundManager globally
  useSoundManager();

  useEffect(() => {
    async function prepare() {
      try {
        // Audio and illustrations load in parallel. Audio is capped: on a device where the audio engine never
        // becomes ready the splash must not hang, and the sound manager copes with a late start.
        const audio = Promise.race([
          useSoundStore.getState().init(),
          new Promise<void>(resolve => setTimeout(resolve, AUDIO_INIT_TIMEOUT_MS)),
        ]).catch(err => console.warn("[App] Audio init failed:", err));
        const settings = Promise.resolve(useSettingsStore.persist.rehydrate()).catch(() => {});
        // The owned-unlock flag is local; the store connection (when one exists) is confirmed in the background.
        const entitlements = Promise.resolve(useEntitlementsStore.persist.rehydrate())
          .then(() => void initEntitlements())
          .catch(() => {});
        const images = Promise.allSettled(
          warmImages.map(image =>
            Asset.fromModule(image as number).downloadAsync().catch(err => console.warn("[App] Failed to pre-load asset:", err)),
          ),
        );
        // The icon font loads before the first screen too: otherwise arrows, hint badges and buttons appear blank
        // for a moment the first time each one is drawn.
        const fonts = Font.loadAsync({ ...Ionicons.font, ...FONT_FILES }).catch(err => console.warn("[App] Icon font failed:", err));
        await Promise.all([audio, settings, entitlements, images, fonts]);
        setAssetsDownloaded(true); // ImageWarmup then decodes the illustrations off-screen

        // 4. Pre-fetch Leaderboard threshold for instant Game Over checks
        void prefetchLeaderboardThreshold(); // best effort, never blocks the splash
      } catch (e) {
        console.warn("[App] Critical preparation error:", e);
        setAssetsDownloaded(true); // still run the warm-up (it has its own timeout) and start the app
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately!
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return (
      <>
        <LoadingScreen />
        {assetsDownloaded && <ImageWarmup images={warmImages} onDone={() => setAppIsReady(true)} />}
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "black" }} onLayout={onLayoutRootView}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NavigationContainer theme={DarkTheme} initialState={devLaunch?.initialState}>
            <ErrorBoundary>
              <StackNavigator />
            </ErrorBoundary>
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </View>
  );
}
