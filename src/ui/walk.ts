/**
 * One tile walked: the slide and its painted steps (BoardView). Tap-to-travel takes its steps at this pace, so the hero walks
 * the whole route instead of each step cutting the last one short. A held direction (repeats every 210 ms) chains the steps,
 * each restarting from where the hero is.
 */
export const WALK_MS = 260;
