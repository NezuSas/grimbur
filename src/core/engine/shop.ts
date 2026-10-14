import { createPRNG } from '../random/prng';
import { deriveLevelSeed } from './seed';
import { isLairFloor } from './lair';
import { GAME_CONFIG } from '../../config/gameConfig';
import type { GameMode } from './seed';
import type { OmenId } from './omens';

/** What gems buy between floors. */
export type ShopItem = 'arrows' | 'shield' | 'detector' | 'bomb';

export const SHOP_ITEMS: readonly ShopItem[] = ['arrows', 'shield', 'detector', 'bomb'];

/** Price in gems of each shop item. */
export const SHOP_PRICES: Record<ShopItem, number> = {
  arrows: 3,
  shield: 5,
  detector: 4,
  bomb: 6,
};

/** Arrows added to the next floor by one purchase. */
export const SHOP_ARROWS = 2;

/** Most one-use items of one kind the bag holds. */
export const MAX_ITEMS = 3;

/** Actions the ability needs to recharge after being used. */
export const ABILITY_COOLDOWN = 12;

/** One of the two doors at the fork: an omen, or a plain floor (null). */
export type Door = OmenId | null;

const DOORS: readonly Door[] = ['bounty', 'calm', 'arsenal', null];

/**
 * The two doors the player chooses between before floor `level` (only expedition and endless; the daily keeps the
 * same cave for everyone, and the first floor and the lair never have a fork). Deterministic from the run seed.
 */
export function forkDoors(runSeed: number, level: number, mode: GameMode): [Door, Door] | null {
  if (mode === 'daily' || level < 2 || isLairFloor(mode, level)) return null;
  if (mode !== 'endless' && level > GAME_CONFIG.expedition.floors) return null;
  const next = createPRNG(deriveLevelSeed(runSeed, level) ^ 0x2c1b3c6d);
  next();
  const pool = [...DOORS];
  const first = pool.splice(Math.floor(next() * pool.length), 1)[0];
  const second = pool[Math.floor(next() * pool.length)];
  return [first, second];
}
