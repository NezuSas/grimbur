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

  pickups: {
    /** Arrows granted by an ammo pickup. */
    ammoAmount: 2,
  },
} as const;
