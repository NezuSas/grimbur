import React, { useMemo } from "react";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";
import { useWebScreen } from "./webScreen";

/**
 * A phone browser in full screen (or the game opened from the home screen) draws the page to the very edge, and the bottom strip
 * of an Android screen belongs to the system: a thumb landing there swipes the system's bar up instead of pressing the pad's
 * lower arrow. The browser reports no safe area for it, so on a touch screen with no browser bar the bottom inset grows to keep
 * every control clear of that strip. Nothing changes on a computer, in a browser with its bar, or in the app.
 */
const GESTURE_STRIP = 26;

export default function WebGestureInsets({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const screen = useWebScreen();
  const lift = screen.touch && !screen.ios && (screen.fullscreen || screen.standalone);
  const value = useMemo(() => (lift ? { ...insets, bottom: Math.max(insets.bottom, GESTURE_STRIP) } : insets), [lift, insets]);
  return <SafeAreaInsetsContext.Provider value={value}>{children}</SafeAreaInsetsContext.Provider>;
}
