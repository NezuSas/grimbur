/** The first descents skip the shop and the fork: only the relic draft (the hook of the loop) is shown. */
export const SKIP_SHOP_BELOW_FLOOR = 3;

/**
 * Whether the shop/fork interlude opens before `nextFloor`. Afterwards the player has gems worth spending and a
 * fork worth choosing.
 */
export function shouldShowShop(nextFloor: number, _state?: { gems?: number }): boolean {
  return nextFloor >= SKIP_SHOP_BELOW_FLOOR;
}

/**
 * The level-complete card moves on by itself this long AFTER its stars have finished appearing (a tap still skips it).
 * It used to count from the moment the card opened, which cut the stars off halfway.
 */
export const LEVEL_COMPLETE_HOLD_MS = 1200;

/** The most the card may stay up, whatever happens to its animation (a stuck animation must never trap the player). */
export const LEVEL_COMPLETE_MAX_MS = 6000;
