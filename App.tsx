import "react-native-gesture-handler";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';

import { useSoundStore } from "./src/state/sound/store";
import { useSoundManager } from "./src/audio/soundManager";
import StackNavigator from "./src/navigation/StackNavigator";
import { getPreloadImages } from "./src/ui/preloadImages";
import ImageWarmup from "./src/ui/components/ImageWarmup";
import { prefetchLeaderboardThreshold } from "./src/services/highscores";
import { installGlobalErrorHandler } from "./src/services/analytics";
import ErrorBoundary from "./src/ui/components/ErrorBoundary";
import LoadingScreen from "./src/ui/components/LoadingScreen";

installGlobalErrorHandler();

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
        // 1. Initialise State
        await useSoundStore.getState().init();

        // 2. Pre-load Fonts (if any custom ones are added later, or Ionicons)
        await Font.loadAsync({
          // Add any specific fonts here
        });

        // 3. Download every illustration in parallel; ImageWarmup then decodes them off-screen.
        await Promise.allSettled(
          getPreloadImages().map(image =>
            Asset.fromModule(image as number).downloadAsync().catch(err => console.warn("[App] Failed to pre-load asset:", err)),
          ),
        );
        setAssetsDownloaded(true);

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
          <NavigationContainer theme={DarkTheme}>
            <ErrorBoundary>
              <StackNavigator />
            </ErrorBoundary>
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </View>
  );
}
