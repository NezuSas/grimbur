import { GAME_CONFIG } from '../../config/gameConfig';
import type { GameMode } from './seed';

/**
 * Whether a floor is a Grimbur lair. Expeditions and the daily end with the lair on floor 10; the endless
 * descent meets the Grimbur again every tenth floor, each time with one more heart.
 */
export function isLairFloor(mode: GameMode, level: number): boolean {
  const floors = GAME_CONFIG.expedition.floors;
  return mode === 'endless' ? level >= floors && level % floors === 0 : level === runFloors(mode);
}

/** The quick descent: one floor of each cave and the lair. */
export const QUICK_FLOORS = 4;
/** The expedition floor each quick floor is built like (so four floors still climb from the plain caves to the lair). */
const QUICK_BOARD_LEVELS = [2, 5, 8, 10];

/** Floors in a run of this mode (the endless descent has no end; its count is the expedition's, used for its lairs). */
export const runFloors = (mode: GameMode): number => (mode === 'quick' ? QUICK_FLOORS : GAME_CONFIG.expedition.floors);

/** The floor whose difficulty a board of this mode and floor is built with. */
export const boardLevel = (mode: GameMode, level: number): number =>
  mode === 'quick' ? QUICK_BOARD_LEVELS[Math.min(QUICK_FLOORS, Math.max(1, level)) - 1] : level;

/** A ten-floor run (the expedition or the daily): the only ones whose wins, records and goals count as an expedition's. */
export const isFullRun = (mode: GameMode | undefined): boolean => (mode ?? 'expedition') === 'expedition' || mode === 'daily';

/** Extra hearts the Grimbur has on this lair floor (only the endless descent adds any). */
export function lairHeartBonus(mode: GameMode, level: number): number {
  if (mode !== 'endless') return 0;
  return Math.max(0, Math.floor(level / GAME_CONFIG.expedition.floors) - 1);
}

/**
 * Extra hazards the endless descent piles on beyond the last designed floor. Boards stop growing (8x13), so the
 * floors get denser (toward ~28% hazards), not longer, and a hunter joins every five floors.
 */
export function endlessPressure(level: number): { enemies: number; pits: number; stalkers: number } {
  const beyond = Math.max(0, level - GAME_CONFIG.expedition.floors);
  return {
    enemies: Math.min(3, Math.floor(beyond / 4)),
    pits: Math.min(2, Math.floor(beyond / 6)),
    stalkers: Math.min(3, Math.floor(beyond / 5)),
  };
}
