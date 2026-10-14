import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

/** How long the bar may stay on screen after the player swipes it in before it hides again. */
const REHIDE_MS = 2500;

/**
 * Immersive mode for Android: hides the system navigation bar (the three buttons or the gesture pill) so the game
 * has the whole screen. The status bar is already hidden by the navigator. A swipe from the edge brings the bar back
 * for a moment, it hides again by itself, and it is hidden again whenever the app returns to the foreground
 * (the system shows it again after a call, a notification shade or the app switcher).
 *
 * iOS has no way to hide the home indicator from JavaScript, so this does nothing there.
 */
export function useImmersiveMode(): void {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const hide = () => {
      NavigationBar.setVisibilityAsync('hidden').catch(() => {
        // An unsupported device just keeps its bar: never a reason to fail.
      });
    };
    hide();

    let timer: ReturnType<typeof setTimeout> | null = null;
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') hide();
    });
    const visibility = NavigationBar.addVisibilityListener(event => {
      if (event.visibility !== 'visible') return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(hide, REHIDE_MS);
    });

    return () => {
      if (timer) clearTimeout(timer);
      appState.remove();
      visibility.remove();
    };
  }, []);
}
