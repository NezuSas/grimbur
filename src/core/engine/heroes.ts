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
}

export const NO_PERKS: HeroPerks = {
  trapImmune: false,
  bonusArrows: 0,
  arrowReach: 1,
  startShield: false,
  coinMultiplier: 1,
  newTileMultiplier: 1,
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
    perks: { ...NO_PERKS, trapImmune: true, bonusArrows: 1 },
  },
  {
    perkName: 'Piercing arrows',
    perkDescription: 'Arrows fly 2 tiles.',
    perks: { ...NO_PERKS, arrowReach: 2 },
  },
  {
    perkName: 'Stoneskin',
    perkDescription: 'Starts every floor with a shield.',
    perks: { ...NO_PERKS, startShield: true },
  },
  {
    perkName: 'Treasure hunter',
    perkDescription: 'Gems are worth +30%. Exploring pays double.',
    perks: { ...NO_PERKS, coinMultiplier: 1.3, newTileMultiplier: 2 },
  },
];

export function getHeroPerks(heroIndex: number): HeroPerks {
  return HEROES[heroIndex]?.perks ?? NO_PERKS;
}
