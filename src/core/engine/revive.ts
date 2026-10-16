/**
 * A second chance: when the hero dies in an expedition or the endless descent it can come back for embers (never in the daily,
 * whose board is the same for everyone). It returns to just before the fatal action with a shield and a few arrows. There is no
 * fixed number of revives: each costs 1.8 times the last and the price grows with the floor and the depth, so a deep run is paid
 * for dearly and the embers themselves are the limit.
 */
export const REVIVE_GROWTH = 1.8;
/** The dearest a revive can cost. */
export const REVIVE_CAP = 600;

/** Arrows the hero is brought back with (it never has fewer). */
export const REVIVE_ARROWS = 3;

const roundTo5 = (n: number) => Math.round(n / 5) * 5;

/** The embers the next revive costs after `used` ones, on `level` at `depth` (floor 1, depth 0: 40, 70, 130, 235, 420, 600...). */
export const revivePrice = (used: number, level = 1, depth = 0): number => {
  const n = Math.max(0, Math.trunc(used) || 0);
  const base = 30 + 10 * Math.max(1, Math.trunc(level) || 1) + 15 * Math.max(0, Math.trunc(depth) || 0);
  return Math.min(REVIVE_CAP, roundTo5(base * REVIVE_GROWTH ** n));
};

/** Arrows bought with embers in the middle of a run, for the hero that ran dry (never in the daily). Each pack costs 1.5 times the last. */
export const REFILL_ARROWS = 3;
export const REFILL_CAP = 120;

/** The embers the next pack costs after `used` ones (15, 25, 35, 50, 75, 110, 120...). */
export const refillPrice = (used: number): number => {
  const n = Math.max(0, Math.trunc(used) || 0);
  return Math.min(REFILL_CAP, roundTo5(15 * 1.5 ** n));
};
