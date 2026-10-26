import type { GameMode } from '../engine/seed';

/** The slice of `GAME_CONFIG.monetization` that decides what is locked. */
export interface GatingConfig {
  /** Master switch: off means the whole game is open (today's behaviour). */
  enabled: boolean;
  /** Expedition floors that stay free; the next one needs the full game. */
  freeFloors: number;
}

/**
 * Pure rules for the one-time "full game" unlock. Free forever: the tutorial, the daily challenge and expedition
 * floors 1..freeFloors. The full game opens the rest of the expedition (and with it the Grimbur) and the endless descent.
 */
export function isModeLocked(mode: GameMode, unlocked: boolean, cfg: GatingConfig): boolean {
  if (!cfg.enabled || unlocked) return false;
  return mode === 'endless';
}

/** Is this floor behind the unlock? (The daily is always free; endless is locked as a whole.) */
export function isFloorLocked(floor: number, mode: GameMode, unlocked: boolean, cfg: GatingConfig): boolean {
  if (!cfg.enabled || unlocked) return false;
  if (mode === 'daily') return false;
  if (mode === 'endless') return true;
  return floor > cfg.freeFloors;
}

/** After clearing `clearedFloor`, must the paywall stand in the way of the next floor? */
export function shouldGateDescent(clearedFloor: number, mode: GameMode, unlocked: boolean, cfg: GatingConfig): boolean {
  return mode === 'expedition' && isFloorLocked(clearedFloor + 1, mode, unlocked, cfg);
}
