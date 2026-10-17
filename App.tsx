import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { AppState, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import * as Font from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { useSettingsStore } from "./src/state/settings/store";
import { useEntitlementsStore } from "./src/state/entitlements/store";
import { initEntitlements } from "./src/services/entitlements";
import { FONT_FILES } from "./src/ui/fonts";

import { useSoundStore, soundLoadProgress, whenAllSoundsLoaded } from "./src/state/sound/store";
import { useSoundManager } from "./src/audio/soundManager";
import StackNavigator from "./src/navigation/StackNavigator";
import { getPreloadImages } from "./src/ui/preloadImages";
import ImageWarmup from "./src/ui/components/ImageWarmup";
import { prefetchLeaderboardThreshold } from "./src/services/highscores";
import { analytics, installGlobalErrorHandler } from "./src/services/analytics";
import ErrorBoundary from "./src/ui/components/ErrorBoundary";
import LoadingScreen from "./src/ui/components/LoadingScreen";
import { EMPTY_STARTUP, StartupParts, startupProgress } from "./src/core/startup/progress";
import { getLocalStats } from "./src/services/localStats";
import { syncCloudNow } from "./src/services/cloudBackup";
import { readDevHarness } from "./src/dev/devHarness";
import { useImmersiveMode } from "./src/shared/immersive";

installGlobalErrorHandler();

// Web dev builds only: ?screen=...&preset=... opens a screen directly (null everywhere else).
const devLaunch = readDevHarness();

/**
 * Longest the splash waits for ALL the sounds before starting the app anyway (the first ones are ready much sooner, and
 * the rest keep loading behind the first screen on a very slow device).
 */
const AUDIO_LOAD_TIMEOUT_MS = 9000;
/** Longest the invisible warm-up may take to draw every picture once before the app starts anyway. */
const WARMUP_TIMEOUT_MS = 10000;
/** Longest the whole preparation (audio, settings, progress, pictures) may take before the app starts anyway. */
const STARTUP_WATCHDOG_MS = 20000;

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [assetsDownloaded, setAssetsDownloaded] = useState(false);
  const warmImages = useMemo(() => getPreloadImages(), []);
  // What the loading bar shows. Only ever grows, so a slow part never makes the bar step back.
  const [parts, setParts] = useState<StartupParts>({ ...EMPTY_STARTUP, download: { done: 0, total: warmImages.length }, decode: { done: 0, total: warmImages.length } });
  const [bar, setBar] = useState(0);
  const patch = useCallback((next: Partial<StartupParts>) => setParts(prev => ({ ...prev, ...next })), []);
  useEffect(() => setBar(prev => Math.max(prev, startupProgress(parts))), [parts]);
  
  // Use the SoundManager globally
  useSoundManager();

  // Android: hide the system navigation bar so the game uses the whole screen.
  useImmersiveMode();

  // Leaving the app saves the cloud copy (a no-op unless the player turned it on).
  useEffect(() => {
    const sub = AppState.addEventListener("change", next => {
      if (next !== "active") void syncCloudNow();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        // Everything the game will show or play loads here, behind the splash, so nothing pops in later: sounds, pictures
        // (downloaded, then decoded by the warm-up), fonts, settings and the saved progress. They run in parallel.
        const audio = (async () => {
          // The first sounds are ready when init resolves; the rest load behind them. Wait for all, with a cap.
          await useSoundStore.getState().init();
          const poll = setInterval(() => patch({ audio: soundLoadProgress() }), 120);
          await Promise.race([whenAllSoundsLoaded(), new Promise<void>(resolve => setTimeout(resolve, AUDIO_LOAD_TIMEOUT_MS))]);
          clearInterval(poll);
          const final = soundLoadProgress();
          patch({ audio: { done: final.total, total: final.total } });
        })().catch(err => console.warn("[App] Audio init failed:", err));
        const basics = (async () => {
          await Promise.resolve(useSettingsStore.persist.rehydrate()).catch(() => {});
          // The owned-unlock flag is local; the store connection (when one exists) is confirmed in the background.
          await Promise.resolve(useEntitlementsStore.persist.rehydrate())
            .then(() => void initEntitlements())
            .catch(() => {});
          // The icon font loads before the first screen too: otherwise arrows, hint badges and buttons appear blank
          // for a moment the first time each one is drawn.
          await Font.loadAsync({ ...Ionicons.font, ...FONT_FILES }).catch(err => console.warn("[App] Icon font failed:", err));
          patch({ basics: true });
        })();
        // The saved progress goes into memory now, so the cover opens already knowing who is playing (no flash of the
        // "first time" cover) and the hero, Forge and collection screens draw real data on their first frame.
        const stats = getLocalStats().then(() => patch({ stats: true })).catch(() => patch({ stats: true }));
        let downloaded = 0;
        const images = Promise.allSettled(
          warmImages.map(image =>
            Asset.fromModule(image as number)
              .downloadAsync()
              .catch(err => console.warn("[App] Failed to pre-load asset:", err))
              .finally(() => {
                downloaded += 1;
                if (downloaded % 4 === 0 || downloaded === warmImages.length) patch({ download: { done: downloaded, total: warmImages.length } });
              }),
          ),
        );
        // One part that never answers (a download with no network, a player that never loads) must not hold the loading
        // screen forever: after this long the app starts with whatever is ready.
        await Promise.race([Promise.all([audio, basics, stats, images]), new Promise<void>(resolve => setTimeout(resolve, STARTUP_WATCHDOG_MS))]);
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

  // The native splash (logo on dark) gives way as soon as the loading screen has its first frame: that one has the same colour and the
  // same logo in the same place, so the change cannot be seen, and from then on the player sees the bar fill instead of a still picture.
  const splashHidden = useRef(false);
  const hideNativeSplash = useCallback(() => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  const onLayoutRootView = hideNativeSplash;

  if (!appIsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0E0B1F" }} onLayout={hideNativeSplash}>
        <LoadingScreen progress={bar} />
        {assetsDownloaded && (
          <ImageWarmup
            images={warmImages}
            timeoutMs={WARMUP_TIMEOUT_MS}
            onProgress={(done, total) => patch({ decode: { done, total } })}
            onDone={() => {
              patch({ decode: { done: warmImages.length, total: warmImages.length } });
              analytics.track("app_open", { cold: true });
              setAppIsReady(true);
            }}
          />
        )}
      </View>
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
