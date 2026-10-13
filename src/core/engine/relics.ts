import { createPRNG } from '../random/prng';
import { deriveLevelSeed } from './seed';

/**
 * Relics are permanent run modifiers: after every cleared floor the player
 * drafts one of three. They are plain data read by the reducer.
 */
export type RelicId =
  | 'quiver'
  | 'lucky_coin'
  | 'iron_boots'
  | 'lantern'
  | 'phoenix'
  | 'hunter'
  | 'long_bow'
  | 'bulwark'
  | 'greed'
  | 'frost'
  | 'trap_sense';

export interface RelicInfo {
  id: RelicId;
  name: string;
  description: string;
  icon: string;
  /** How many copies a run can hold. */
  max: number;
}

export const RELICS: Record<RelicId, RelicInfo> = {
  quiver: {
    id: 'quiver',
    name: 'Bottomless Quiver',
    description: '+2 arrows now and +1 arrow at the start of every floor.',
    icon: '🏹',
    max: 3,
  },
  lucky_coin: {
    id: 'lucky_coin',
    name: 'Lucky Coin',
    description: 'Gems are worth 25% more.',
    icon: '🪙',
    max: 3,
  },
  iron_boots: {
    id: 'iron_boots',
    name: 'Iron Boots',
    description: 'Walking no longer costs points.',
    icon: '👢',
    max: 1,
  },
  lantern: {
    id: 'lantern',
    name: 'Old Lantern',
    description: 'Every floor starts with the area around you already explored.',
    icon: '🏮',
    max: 1,
  },
  phoenix: {
    id: 'phoenix',
    name: 'Phoenix Feather',
    description: 'Survives one deadly touch, then crumbles.',
    icon: '🪶',
    max: 1,
  },
  hunter: {
    id: 'hunter',
    name: "Hunter's Mark",
    description: 'Kill combos can climb one step higher.',
    icon: '🎯',
    max: 2,
  },
  long_bow: {
    id: 'long_bow',
    name: 'Long Bow',
    description: 'Arrows fly one tile farther.',
    icon: '🌠',
    max: 1,
  },
  bulwark: {
    id: 'bulwark',
    name: 'Bulwark',
    description: 'Start every floor with a shield.',
    icon: '🛡️',
    max: 1,
  },
  greed: {
    id: 'greed',
    name: 'Dragon Hoard',
    description: 'Clearing a floor pays 50% more.',
    icon: '💰',
    max: 2,
  },
  frost: {
    id: 'frost',
    name: 'Frost Charm',
    description: 'The Wumpus moves more slowly.',
    icon: '❄️',
    max: 1,
  },
  trap_sense: {
    id: 'trap_sense',
    name: 'Trap Sense',
    description: 'Traps are disarmed without penalty.',
    icon: '🪤',
    max: 1,
  },
};

export const ALL_RELICS = Object.keys(RELICS) as RelicId[];

export const relicCount = (relics: readonly RelicId[], id: RelicId): number =>
  relics.reduce((n, r) => (r === id ? n + 1 : n), 0);

/** Returns `relics` without one copy of `id`. */
export const removeRelic = (relics: readonly RelicId[], id: RelicId): RelicId[] => {
  const at = relics.indexOf(id);
  return at === -1 ? [...relics] : [...relics.slice(0, at), ...relics.slice(at + 1)];
};

/**
 * Picks `count` different relics the player can still take. Deterministic for a
 * given (runSeed, floor, owned), so a Daily Challenge offers everyone the same draft.
 */
export function draftRelics(
  runSeed: number,
  floor: number,
  owned: readonly RelicId[],
  count = 3,
): RelicId[] {
  const pool = ALL_RELICS.filter(id => relicCount(owned, id) < RELICS[id].max);
  const next = createPRNG(deriveLevelSeed(runSeed, 1000 + floor));
  next(); // discard the weakly-mixed first sample

  const picks: RelicId[] = [];
  while (picks.length < count && pool.length > 0) {
    const at = Math.floor(next() * pool.length);
    picks.push(pool.splice(at, 1)[0]);
  }
  return picks;
}
