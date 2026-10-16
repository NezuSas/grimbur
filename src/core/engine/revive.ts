/**
 * A second chance: when the hero dies in an expedition or the endless descent it can come back for embers (never in the daily,
 * whose board is the same for everyone). It returns to just before the fatal action with a shield and a few arrows. Each use costs
 * more than the last and the number is limited, so it is a lifeline and not a way around the game.
 */
export const REVIVE_PRICES: readonly number[] = [40, 90];

export const MAX_REVIVES = REVIVE_PRICES.length;

/** Arrows the hero is brought back with (it never has fewer). */
export const REVIVE_ARROWS = 3;

/** The embers the next revive costs after `used` ones, or null when no more can be bought. */
export const revivePrice = (used: number): number | null => REVIVE_PRICES[Math.max(0, Math.trunc(used) || 0)] ?? null;

/**
 * Arrows bought with embers in the middle of a run, for the hero that ran dry. Three packs per run, each dearer than the last
 * (never in the daily).
 */
export const REFILL_PRICES: readonly number[] = [15, 25, 40];

/** Arrows in a pack. */
export const REFILL_ARROWS = 3;

/** The embers the next pack costs after `used` ones, or null when the run's packs are gone. */
export const refillPrice = (used: number): number | null => REFILL_PRICES[Math.max(0, Math.trunc(used) || 0)] ?? null;
