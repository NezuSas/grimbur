import type { LanguagePreference } from '../../i18n/translate';

export type ControlPosition = 'left' | 'right';
/** Where the attack button lives: on its own on the opposite side of the board, or in the middle of the pad. */
/** Size of the on-screen controls. */
export type ControlSize = 'small' | 'medium' | 'large';
export type AttackButtonPlacement = 'side' | 'center';
/** The movement pad: always in the same place, or one that appears under the thumb. */
export type MovePadStyle = 'fixed' | 'floating';

export interface SettingsState {
  soundEnabled: boolean;
  /** Music and effects levels in percent (0, 25, 50, 75 or 100); the on/off switch above still mutes everything. */
  musicVolume: number;
  sfxVolume: number;
  /** Haptic feedback on taps, hits and pickups. */
  hapticsEnabled: boolean;
  /** Softens the full-screen flashes (kills, vortex teleports). */
  reduceFlash: boolean;
  controlPosition: ControlPosition;
  attackButton: AttackButtonPlacement;
  movePad: MovePadStyle;
  controlSize: ControlSize;
  /** Swipe on the board to move one step (the pad keeps working). */
  swipeMove: boolean;
  /** Shoot by dragging from the hero toward a side and letting go (the attack button keeps working). */
  dragAim: boolean;
  language: LanguagePreference;
  /** True once the player has finished or skipped the tutorial. */
  tutorialSeen: boolean;
  /** Achievements unlocked when the player last opened the achievements screen (drives the red dot on the cover). */
  achievementsSeen: number;
  /** One-time in-game hints the player has already read (ability, undo, items). */
  hintsSeen: string[];
  /** Epoch ms of the last store-rating request (0 = never asked). */
  reviewAskedAt: number;
  /** The hero chosen last, so the hero screen opens on it. */
  lastHero: number;
  setSoundEnabled: (enabled: boolean) => void;
  setMusicVolume: (level: number) => void;
  setSfxVolume: (level: number) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setReduceFlash: (enabled: boolean) => void;
  setControlPosition: (position: ControlPosition) => void;
  setControlSize: (size: ControlSize) => void;
  setAttackButton: (placement: AttackButtonPlacement) => void;
  setMovePad: (style: MovePadStyle) => void;
  setSwipeMove: (enabled: boolean) => void;
  setDragAim: (enabled: boolean) => void;
  setLanguage: (language: LanguagePreference) => void;
  setTutorialSeen: (seen: boolean) => void;
  setAchievementsSeen: (count: number) => void;
  markHintSeen: (id: string) => void;
  markReviewAsked: (at: number) => void;
  setLastHero: (heroIndex: number) => void;
}
