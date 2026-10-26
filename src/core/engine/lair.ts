import { GAME_CONFIG } from '../../config/gameConfig';
import type { GameMode } from './seed';

/**
 * Whether a floor is a Grimbur lair. Expeditions and the daily end with the lair on floor 10; the endless
 * descent meets the Grimbur again every tenth floor, each time with one more heart.
 */
export function isLairFloor(mode: GameMode, level: number): boolean {
  const floors = GAME_CONFIG.expedition.floors;
  return mode === 'endless' ? level >= floors && level % floors === 0 : level === floors;
}

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
