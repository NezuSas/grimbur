import "react-native-gesture-handler";
import React, { useEffect, useState, useCallback } from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator, Image } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';

import { useSoundStore } from "./src/state/sound/store";
import { useSoundManager } from "./src/audio/soundManager";
import StackNavigator from "./src/navigation/StackNavigator";
import characters from "./src/data/characters";
import { prefetchLeaderboardThreshold } from "./src/services/highscores";
import { installGlobalErrorHandler } from "./src/services/analytics";
import ErrorBoundary from "./src/ui/components/ErrorBoundary";

installGlobalErrorHandler();

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  
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

        // 3. Pre-load Images (Resilient sequential download)
        const images = [
          require("./src/assets/sprites/backgrounds/Loading.png"),
          require("./src/assets/sprites/backgrounds/Cover_Background.png"),
          require("./src/assets/sprites/enemies/Guardian_Enemy.png"),
          require("./src/assets/sprites/tiles/Danger_Vortex.png"),
          require("./src/assets/sprites/items/Icon_Gem.png"),
          require("./src/assets/sprites/tiles/Tile_Revealed.png"),
          require("./src/assets/sprites/tiles/Tile_Hidden.png"),
          ...characters.map(c => c.scoreImage),
          ...characters.map(c => c.attackImage),
          ...characters.map(c => c.playerImage),
          ...characters.map(c => c.winImage),
          ...characters.map(c => c.loseImage),
        ];

        for (const image of images) {
          try {
            await Asset.fromModule(image).downloadAsync();
          } catch (err) {
            console.warn(`[App] Failed to pre-load asset:`, image, err);
          }
        }

        // 4. Pre-fetch Leaderboard threshold for instant Game Over checks
        await prefetchLeaderboardThreshold();
      } catch (e) {
        console.warn("[App] Critical preparation error:", e);
      } finally {
        setAppIsReady(true);
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
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <Image 
          source={require("./src/assets/sprites/backgrounds/Loading.png")} 
          style={{ width: '100%', height: '100%', position: 'absolute', bottom: 0 }} 
          resizeMode="contain" 
        />
        <View style={{ position: 'absolute', bottom: 50 }}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      </View>
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
