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
  },

  /** Roaming hunters that appear from `minFloor` on. */
  stalker: {
    /** A stalker steps toward the player after every Nth player action. */
    moveEvery: 4,
    minFloor: 7,
  },

  /** Sleeping guardians: still until the player comes this close, then they hunt like stalkers. */
  sleeper: {
    minFloor: 5,
    wakeDistance: 2,
  },

  pickups: {
    /** Arrows granted by an ammo pickup. */
    ammoAmount: 2,
  },
} as const;
