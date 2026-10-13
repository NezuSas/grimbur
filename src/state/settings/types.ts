import type { LanguagePreference } from '../../i18n/translate';

export type ControlPosition = 'left' | 'right';

export interface SettingsState {
  soundEnabled: boolean;
  /** Haptic feedback on taps, hits and pickups. */
  hapticsEnabled: boolean;
  /** Softens the full-screen flashes (kills, vortex teleports). */
  reduceFlash: boolean;
  controlPosition: ControlPosition;
  language: LanguagePreference;
  /** True once the player has finished or skipped the tutorial. */
  tutorialSeen: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setReduceFlash: (enabled: boolean) => void;
  setControlPosition: (position: ControlPosition) => void;
  setLanguage: (language: LanguagePreference) => void;
  setTutorialSeen: (seen: boolean) => void;
}
