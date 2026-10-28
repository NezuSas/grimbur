import { Easing } from "react-native";

/**
 * The game's rhythm: every UI animation picks one of these instead of its own number, so the whole app moves alike.
 * Calm mode (Settings, reduceFlash) still skips the decorative ones.
 */
export const MOTION = {
  /** A press, a tick, a small state change. */
  fast: 120,
  /** A card appearing, a value changing, a screen fading. */
  normal: 220,
  /** An entrance that builds the screen, a reward landing. */
  slow: 420,
  /** Between two items of a list that builds itself. */
  stagger: 55,
  /** The spring for things that pop in or bounce back after a press. */
  spring: { friction: 6, tension: 120 },
  ease: Easing.out(Easing.cubic),
} as const;
