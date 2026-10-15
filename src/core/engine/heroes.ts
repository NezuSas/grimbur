import type { AbilityId } from './abilities';

/**
 * Hero perks. They are plain data read by the reducer, so the rules stay pure
 * and testable. Heroes are addressed by the same index as `data/characters.ts`.
 */
export interface HeroPerks {
  /** Traps are disarmed without penalty. */
  trapImmune: boolean;
  /** Extra arrows granted at the start of every floor. */
  bonusArrows: number;
  /** How many tiles an arrow can travel (the first hostile one is hit). */
  arrowReach: number;
  /** Begin every floor with a shield. */
  startShield: boolean;
  /** Multiplier applied to gem value. */
  coinMultiplier: number;
  /** Multiplier applied to the new-tile exploration bonus. */
  newTileMultiplier: number;
  /** Every floor starts with the area around the start tile already explored (the Old Lantern's light). */
  startLit: boolean;
  /** One-use items in the bag at the start of every run. */
  startItems: { detector: number; bomb: number };
  /** The hero's active ability (null when none). */
  ability: AbilityId | null;
}

export const NO_PERKS: HeroPerks = {
  trapImmune: false,
  bonusArrows: 0,
  arrowReach: 1,
  startShield: false,
  coinMultiplier: 1,
  newTileMultiplier: 1,
  startLit: false,
  startItems: { detector: 0, bomb: 0 },
  ability: null,
};

export interface HeroInfo {
  perkName: string;
  perkDescription: string;
  perks: HeroPerks;
}

export const HEROES: readonly HeroInfo[] = [
  {
    perkName: 'Trapfinder',
    perkDescription: 'Traps never hurt. +1 arrow every floor.',
    perks: { ...NO_PERKS, trapImmune: true, bonusArrows: 1, ability: 'scout' },
  },
  {
    perkName: 'Piercing arrows',
    perkDescription: 'Arrows fly 2 tiles.',
    perks: { ...NO_PERKS, arrowReach: 2, ability: 'volley' },
  },
  {
    perkName: 'Stoneskin',
    perkDescription: 'Starts every floor with a shield.',
    perks: { ...NO_PERKS, startShield: true, ability: 'brace' },
  },
  {
    perkName: 'Treasure hunter',
    perkDescription: 'Gems are worth +30%. Exploring pays double.',
    perks: { ...NO_PERKS, coinMultiplier: 1.3, newTileMultiplier: 2, ability: 'magnet' },
  },
  {
    perkName: 'Lightbearer',
    perkDescription: 'Every floor starts with the area around you already lit.',
    perks: { ...NO_PERKS, startLit: true, ability: 'flare' },
  },
  {
    perkName: 'Tinkerer',
    perkDescription: 'Every run starts with a detector and a bomb.',
    perks: { ...NO_PERKS, startItems: { detector: 1, bomb: 1 }, ability: 'blast' },
  },
];

export function getHeroPerks(heroIndex: number): HeroPerks {
  return HEROES[heroIndex]?.perks ?? NO_PERKS;
}
