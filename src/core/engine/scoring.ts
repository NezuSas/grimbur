import { GAME_CONFIG } from '../../config/gameConfig';

/**
 * Single source of truth for score rewards. Used by the reducer to update the
 * score and by the UI to display the same numbers (floating popups, etc.).
 */

const levelMultiplier = (level: number): number =>
  1 + (level - 1) * GAME_CONFIG.multipliers.levelScale;

/** Points for collecting one coin at the given level. */
export const coinValue = (level: number): number =>
  Math.round(GAME_CONFIG.coins.value * levelMultiplier(level));

/** Points for killing an enemy at the given (already incremented) combo. */
export const killValue = (combo: number): number =>
  Math.round(GAME_CONFIG.scoring.killEnemy * combo);

/** Bonus for clearing the last coin of a level. */
export const levelClearBonus = (level: number): number =>
  Math.round(GAME_CONFIG.scoring.levelClear * levelMultiplier(level));
