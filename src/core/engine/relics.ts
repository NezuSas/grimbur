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
  | 'trap_sense'
  | 'blood_pact'
  | 'hasty_boots'
  | 'greedy_idol'
  | 'glass_bow';

export interface RelicInfo {
  id: RelicId;
  name: string;
  description: string;
  icon: string;
  /** How many copies a run can hold. */
  max: number;
  /** Cursed relics give power and take something back; a run holds at most one. */
  cursed?: boolean;
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
    description: 'Gems are worth 25% more, and each has a 20% chance to give one more shop gem.',
    icon: '🪙',
    max: 3,
  },
  iron_boots: {
    id: 'iron_boots',
    name: 'Pathfinder Boots',
    description: 'Walking is free, and stepping on explored tiles does not wake the hunters (not in the lair).',
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
    description: 'Kill combos can climb one step higher, and every guardian you shoot drops one shop gem.',
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
    description: 'Clearing a floor pays 50% more and gives one shop gem.',
    icon: '💰',
    max: 2,
  },
  frost: {
    id: 'frost',
    name: 'Frost Charm',
    description: 'The Wumpus and the stalkers act more slowly.',
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
  blood_pact: {
    id: 'blood_pact',
    name: 'Blood Pact',
    description: 'Gems are worth 50% more, but every floor starts with one arrow less (at least one).',
    icon: '🩸',
    max: 1,
    cursed: true,
  },
  hasty_boots: {
    id: 'hasty_boots',
    name: 'Hasty Boots',
    description: 'Exploring a new tile pays triple, but hunters act one action sooner.',
    icon: '⚡',
    max: 1,
    cursed: true,
  },
  greedy_idol: {
    id: 'greedy_idol',
    name: 'Greedy Idol',
    description: 'Every gem is worth double in the shop, but each new floor gains two more vortexes.',
    icon: '🗿',
    max: 1,
    cursed: true,
  },
  glass_bow: {
    id: 'glass_bow',
    name: 'Glass Bow',
    description: 'Arrows fly two tiles farther, but every floor starts with half the arrows (at least one).',
    icon: '🔮',
    max: 1,
    cursed: true,
  },
};

export const ALL_RELICS = Object.keys(RELICS) as RelicId[];
/** Relics that can appear in a normal draft. */
export const NORMAL_RELICS = ALL_RELICS.filter(id => !RELICS[id].cursed);
export const CURSED_RELICS = ALL_RELICS.filter(id => RELICS[id].cursed);

/** True when the run already carries a cursed relic. */
export const hasCursed = (relics: readonly RelicId[]): boolean => relics.some(id => RELICS[id].cursed);

export const relicCount = (relics: readonly RelicId[], id: RelicId): number =>
  relics.reduce((n, r) => (r === id ? n + 1 : n), 0);

/** Returns `relics` without one copy of `id`. */
export const removeRelic = (relics: readonly RelicId[], id: RelicId): RelicId[] => {
  const at = relics.indexOf(id);
  return at === -1 ? [...relics] : [...relics.slice(0, at), ...relics.slice(at + 1)];
};

/** Chance that a draft (from floor 3) includes one cursed relic. */
export const CURSED_CHANCE = 0.4;

/** What the run already has, so the draft never offers a relic that would do nothing. */
export interface DraftContext {
  /** The hero already starts every floor with a shield (the Bulwark would be wasted). */
  startShield?: boolean;
  /** The hero is immune to traps (Trap Sense would be wasted). */
  trapImmune?: boolean;
  /** Every floor already starts lit (the Old Lantern would be wasted). */
  startLit?: boolean;
}

/** True when `id` can still help a run with this hero and these relics. */
export function isUsefulRelic(id: RelicId, owned: readonly RelicId[], ctx: DraftContext = {}): boolean {
  if (relicCount(owned, id) >= RELICS[id].max) return false;
  if (id === 'bulwark' && ctx.startShield) return false;
  if (id === 'trap_sense' && ctx.trapImmune) return false;
  if (id === 'lantern' && ctx.startLit) return false;
  return true;
}

/**
 * Picks `count` different relics the player can still take and benefit from. Deterministic for a
 * given (runSeed, floor, owned, hero), so a Daily Challenge offers everyone the same draft.
 */
export function draftRelics(
  runSeed: number,
  floor: number,
  owned: readonly RelicId[],
  count = 3,
  ctx: DraftContext = {},
): RelicId[] {
  const pool = NORMAL_RELICS.filter(id => isUsefulRelic(id, owned, ctx));
  const next = createPRNG(deriveLevelSeed(runSeed, 1000 + floor));
  next(); // discard the weakly-mixed first sample

  const picks: RelicId[] = [];
  while (picks.length < count && pool.length > 0) {
    const at = Math.floor(next() * pool.length);
    picks.push(pool.splice(at, 1)[0]);
  }

  // From the third floor a cursed relic sometimes takes the last slot (never when the run already has one).
  if (floor >= 3 && picks.length >= 2 && !hasCursed(owned)) {
    const cursedRoll = createPRNG(deriveLevelSeed(runSeed, 3000 + floor));
    cursedRoll();
    if (cursedRoll() < CURSED_CHANCE) {
      const cursedPool = CURSED_RELICS.filter(id => isUsefulRelic(id, owned, ctx));
      if (cursedPool.length > 0) picks[picks.length - 1] = cursedPool[Math.floor(cursedRoll() * cursedPool.length)];
    }
  }
  return picks;
}
