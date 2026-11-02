import { createPRNG } from '../random/prng';
import { deriveLevelSeed } from './seed';
import { isLairFloor, runFloors } from './lair';
import { GAME_CONFIG } from '../../config/gameConfig';
import type { GameMode } from './seed';
import type { OmenId } from './omens';
import { MID_BOSS_FLOOR } from './generator';
import type { AbilityId } from './abilities';

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

/** Actions an ability needs to recharge after being used (the default; see ABILITY_COOLDOWNS). */
export const ABILITY_COOLDOWN = 12;

/**
 * Recharge time of each ability. Brace only works without a shield and Stoneskin already starts every floor with one,
 * and the Magnet pulls in a whole gem, so those two wait longer.
 */
export const ABILITY_COOLDOWNS: Record<AbilityId, number> = {
  scout: 12,
  volley: 12,
  brace: 18,
  magnet: 18,
  flare: 18,
  blast: 24,
};

export const abilityCooldown = (ability: AbilityId | null | undefined): number =>
  ability ? ABILITY_COOLDOWNS[ability] : ABILITY_COOLDOWN;

/** One of the two doors at the fork: an omen, or a plain floor (null). */
export type Door = OmenId | null;

const DOORS: readonly Door[] = ['bounty', 'calm', 'arsenal', null];
/** The elite door shows up at a fork from this floor, with this chance. */
export const ELITE_FROM = 3;
/** The blood merchant takes this many arrows for this many shop gems. */
export const MERCHANT_ARROWS = 2;
export const MERCHANT_GEMS = 5;
export const ELITE_CHANCE = 0.35;
/** The dark floor can be offered from this floor. */
export const DARK_FROM = 4;
/** A shortcut can be offered from this floor. */
export const SHORTCUT_FROM = 3;

/**
 * The two doors the player chooses between before floor `level` (only expedition and endless; the daily keeps the
 * same cave for everyone, and the first floor and the lair never have a fork). Deterministic from the run seed.
 */
export function forkDoors(runSeed: number, level: number, mode: GameMode): [Door, Door] | null {
  if (mode === 'daily' || level < 2 || isLairFloor(mode, level)) return null;
  if (mode !== 'endless' && level > runFloors(mode)) return null;
  const next = createPRNG(deriveLevelSeed(runSeed, level) ^ 0x2c1b3c6d);
  next();
  // From the fourth floor the dark floor can be one of the doors; from the third, a shortcut that never jumps the lieutenant's floor
  // and never lands past the lair.
  const pool: Door[] = level >= DARK_FROM ? [...DOORS, 'dark'] : [...DOORS];
  // The quick descent is too short to skip a floor of it.
  if (mode !== 'quick' && level >= SHORTCUT_FROM && level !== MID_BOSS_FLOOR && (mode === 'endless' || level + 1 <= GAME_CONFIG.expedition.floors)) pool.push('shortcut');
  const first = pool.splice(Math.floor(next() * pool.length), 1)[0];
  const second = pool[Math.floor(next() * pool.length)];
  // From the third floor one fork in three swaps a door for the elite floor: the risk is always a choice, never forced.
  if (level >= ELITE_FROM && next() < ELITE_CHANCE) return next() < 0.5 ? ['elite', second] : [first, 'elite'];
  return [first, second];
}
