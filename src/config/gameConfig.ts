/**
 * Tunable gameplay constants. Board size, hazard counts and coin counts are
 * derived per level in `core/difficulty/difficulty.ts`.
 */
export const GAME_CONFIG = {
  coins: {
    value: 100,
  },

  scoring: {
    stepCost: -1,
    newTile: 5,
    killEnemy: 250,
    missPenalty: -25,
    trapPenalty: -75,
    pickup: 50,
    levelClear: 500,
  },

  multipliers: {
    levelScale: 0.2,
    maxCombo: 3,
  },

  /** Development switches; keep every flag off for release builds. */
  dev: {
    unlockAllHeroes: false,
    /** In dev builds, the paywall's Buy button grants the unlock locally (no store needed). */
    localPurchases: false,
  },

  /**
   * One-time unlock of the full game (see docs/release/MONETIZATION_SETUP.md). OFF: everything is open, as always.
   * Free: tutorial, expedition floors 1..freeFloors and the daily challenge. Paid: the rest of the expedition,
   * the Wumpus and the endless descent. Never ads, never loot boxes, never ranking power.
   */
  /** Where players send reports and questions (the report button on the ranking opens a mail to it). */
  support: {
    // TODO(owner): replace with the real support address before publishing.
    email: 'support@example.com',
  },

  monetization: {
    enabled: false,
    freeFloors: 3,
    /** Product id of the one-time in-app product in Play Console. */
    productId: 'grimbur_full_game',
    /** Shown until the store answers (or when it cannot). */
    fallbackPrice: '$3.99',
    // Placeholders: replace with the hosted pages before enabling.
    termsUrl: 'https://example.com/grimbur/terms',
    privacyUrl: 'https://example.com/grimbur/privacy',
  },

  expedition: {
    /** Floors in a run; the last one is the Wumpus lair. */
    floors: 10,
  },

  boss: {
    hp: 3,
    /** The Wumpus steps toward the player after every Nth player move. */
    moveEvery: 2,
    hitScore: 150,
    killScore: 2000,
    /** Minimum Manhattan distance from the spawn when it is placed. */
    minSpawnDistance: 6,
    /** Fury: with one heart left the Wumpus steps after every Nth player action (instead of `moveEvery`). */
    furyMoveEvery: 1,
    /** Most guardians / vortexes a lair floor keeps: the floor is a fight, not a minefield plus a boss. */
    lairGuardians: 8,
    lairPits: 7,
    /** A wounded Wumpus may call a stalker next to itself: chance per hit, and the most calls per fight. */
    callChance: 0.5,
    maxCalls: 2,
  },

  /** Roaming hunters that appear from `minFloor` on. */
  stalker: {
    /** A stalker steps toward the player after every Nth player action. */
    moveEvery: 4,
    /** From this floor on there is always at least one stalker. */
    minFloor: 7,
    /** From this floor a single stalker appears with `earlyChance` (decided by the floor seed): the first close call. */
    earlyFloor: 4,
    /** The last floor of that early window (floor 6 already has the sleeper, 7 the guaranteed stalker). */
    earlyLastFloor: 5,
    earlyChance: 0.5,
    /** Most stalkers a floor can hold (the endless descent adds one every five floors). */
    maxPerFloor: 5,
  },

  /** Sleeping guardians: still until the player comes this close, then they hunt like stalkers. */
  sleeper: {
    minFloor: 6,
    wakeDistance: 2,
  },

  pickups: {
    /** Arrows granted by an ammo pickup. */
    ammoAmount: 2,
  },

  arrows: {
    /** Unused arrows that carry over to the next floor (at most this many). */
    carryOverCap: 4,
  },

  vortex: {
    /** Chance that a vortex drops you on an already explored tile (it scrambles your bearings instead of revealing a new one). */
    revisitChance: 0.3,
  },
} as const;
