import type { LanguagePreference } from '../../i18n/translate';

export type ControlPosition = 'left' | 'right';
/** Where the attack button lives: on its own on the opposite side of the board, or in the middle of the pad. */
export type AttackButtonPlacement = 'side' | 'center';

export interface SettingsState {
  soundEnabled: boolean;
  /** Haptic feedback on taps, hits and pickups. */
  hapticsEnabled: boolean;
  /** Softens the full-screen flashes (kills, vortex teleports). */
  reduceFlash: boolean;
  controlPosition: ControlPosition;
  attackButton: AttackButtonPlacement;
  /** Swipe on the board to move one step (the pad keeps working). */
  swipeMove: boolean;
  language: LanguagePreference;
  /** True once the player has finished or skipped the tutorial. */
  tutorialSeen: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setReduceFlash: (enabled: boolean) => void;
  setControlPosition: (position: ControlPosition) => void;
  setAttackButton: (placement: AttackButtonPlacement) => void;
  setSwipeMove: (enabled: boolean) => void;
  setLanguage: (language: LanguagePreference) => void;
  setTutorialSeen: (seen: boolean) => void;
}
