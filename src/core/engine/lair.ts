import { GAME_CONFIG } from '../../config/gameConfig';
import type { GameMode } from './seed';

/**
 * Whether a floor is a Wumpus lair. Expeditions and the daily end with the lair on floor 10; the endless
 * descent meets the Wumpus again every tenth floor, each time with one more heart.
 */
export function isLairFloor(mode: GameMode, level: number): boolean {
  const floors = GAME_CONFIG.expedition.floors;
  return mode === 'endless' ? level >= floors && level % floors === 0 : level === floors;
}

/** Extra hearts the Wumpus has on this lair floor (only the endless descent adds any). */
export function lairHeartBonus(mode: GameMode, level: number): number {
  if (mode !== 'endless') return 0;
  return Math.max(0, Math.floor(level / GAME_CONFIG.expedition.floors) - 1);
}

/** Extra guardians and vortexes the endless descent piles on beyond the last designed floor. */
export function endlessPressure(level: number): { enemies: number; pits: number } {
  const beyond = Math.max(0, level - GAME_CONFIG.expedition.floors);
  return { enemies: Math.min(6, Math.floor(beyond / 3)), pits: Math.min(4, Math.floor(beyond / 4)) };
}
