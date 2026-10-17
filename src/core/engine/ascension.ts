import { GAME_CONFIG } from '../../config/gameConfig';

/**
 * Ascension ("Depth"): harder versions of the same expedition, unlocked one at a time by
 * winning. Each depth keeps every earlier penalty, so depth 5 stacks them all.
 *
 *   1  one arrow fewer on every floor, one more guardian
 *   2  stalkers already from floor 5, one more vortex
 *   3  two arrows fewer, the Wumpus has one more heart, two more guardians and vortexes, stalkers act sooner
 *   4  traps hurt twice as much and each floor has one more, another vortex, one more stalker
 *   5  relic drafts offer only 2 choices, one more guardian and vortex, one more stalker, the Wumpus has another heart
 */
export const MAX_ASCENSION = 5;

export interface AscensionModifiers {
  /** Arrows removed from every floor's allowance (never below 1 arrow). */
  arrowPenalty: number;
  /** First floor that always has at least one stalker. */
  stalkerFloor: number;
  /** Extra hearts on the Wumpus. */
  bossHpBonus: number;
  /** Guardians added to every floor from floor 2 (the floors stay solvable: see the generator). */
  enemyBonus: number;
  /** Vortexes added to every floor from floor 2. */
  pitBonus: number;
  trapPenaltyMultiplier: number;
  /** Extra traps per floor (from floor 3, where traps start). */
  extraTraps: number;
  /** Extra roaming stalkers per floor, from `stalkerFloor` on. */
  stalkerBonus: number;
  /** Stalkers act this many actions sooner. */
  hunterHaste: number;
  /** How many relics a draft offers. */
  draftSize: number;
}

export function clampAscension(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_ASCENSION, Math.max(0, Math.trunc(value)));
}

export function modifiersFor(ascension: number): AscensionModifiers {
  const a = clampAscension(ascension);
  return {
    arrowPenalty: [0, 1, 1, 2, 3, 4][a],
    stalkerFloor: a >= 5 ? 3 : a >= 4 ? 4 : a >= 2 ? 5 : GAME_CONFIG.stalker.minFloor,
    bossHpBonus: a >= 5 ? 2 : a >= 3 ? 1 : 0,
    enemyBonus: [0, 1, 1, 2, 4, 6][a],
    pitBonus: [0, 0, 1, 2, 3, 4][a],
    trapPenaltyMultiplier: a >= 4 ? 2 : 1,
    extraTraps: a >= 4 ? 1 : 0,
    stalkerBonus: [0, 0, 0, 0, 1, 2][a],
    hunterHaste: a >= 5 ? 2 : a >= 3 ? 1 : 0,
    draftSize: a >= 5 ? 2 : 3,
  };
}

/** Translation key of the one-line rule that depth adds (`ascension.1` ... `ascension.5`). */
export const ascensionRuleKey = (ascension: number) => `ascension.${clampAscension(ascension)}` as const;
