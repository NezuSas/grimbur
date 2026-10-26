import type { LocalStats } from './runStats';
import { newlyUnlockedHeroes } from './heroUnlocks';

/**
 * The endless descent opens with the first victory, or earlier for players who keep dying before the Grimbur:
 * reaching floor 5 or playing 8 runs is enough. (A perfect bot only reaches the boss ~40% of the time.)
 */
export const ENDLESS_FLOOR = 5;
export const ENDLESS_GAMES = 8;

export const isEndlessUnlocked = (stats: LocalStats): boolean =>
  stats.victories >= 1 || stats.bestLevel >= ENDLESS_FLOOR || stats.gamesPlayed >= ENDLESS_GAMES;

/** Progress shown on the locked card ("Reach floor 5: 3/5"): the route closest to done, floors by default. */
export function endlessProgress(stats: LocalStats): { kind: 'floor' | 'games'; current: number; target: number } {
  const floor = Math.min(stats.bestLevel, ENDLESS_FLOOR) / ENDLESS_FLOOR;
  const games = Math.min(stats.gamesPlayed, ENDLESS_GAMES) / ENDLESS_GAMES;
  return games > floor
    ? { kind: 'games', current: Math.min(stats.gamesPlayed, ENDLESS_GAMES), target: ENDLESS_GAMES }
    : { kind: 'floor', current: Math.min(stats.bestLevel, ENDLESS_FLOOR), target: ENDLESS_FLOOR };
}

/** Everything a run can open: heroes, a deeper difficulty and the endless descent. */
export interface Unlocks {
  heroes: number[];
  /** The new maximum depth when it went up, otherwise null. */
  depth: number | null;
  endless: boolean;
  /** Outfits that a finished run unlocked for free (filled in by the game screen from the run result). */
  skins?: { hero: number; skin: string }[];
}

export function newUnlocks(before: LocalStats, after: LocalStats): Unlocks {
  return {
    heroes: newlyUnlockedHeroes(before, after),
    depth: after.maxAscension > before.maxAscension ? after.maxAscension : null,
    endless: !isEndlessUnlocked(before) && isEndlessUnlocked(after),
  };
}

export const hasUnlocks = (u: Unlocks | null | undefined): boolean => !!u && (u.heroes.length > 0 || u.depth !== null || u.endless || (u.skins?.length ?? 0) > 0);
