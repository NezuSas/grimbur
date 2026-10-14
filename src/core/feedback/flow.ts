/** The first descents skip the shop and the fork: only the relic draft (the hook of the loop) is shown. */
export const SKIP_SHOP_BELOW_FLOOR = 3;

/**
 * Whether the shop/fork interlude opens before `nextFloor`. Afterwards the player has gems worth spending and a
 * fork worth choosing.
 */
export function shouldShowShop(nextFloor: number, _state?: { gems?: number }): boolean {
  return nextFloor >= SKIP_SHOP_BELOW_FLOOR;
}

/** The level-complete card moves on by itself after this long (a tap still skips it). */
export const LEVEL_COMPLETE_AUTO_MS = 1600;
