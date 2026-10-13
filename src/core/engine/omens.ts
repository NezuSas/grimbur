import { GAME_CONFIG } from '../../config/gameConfig';
import { deriveLevelSeed } from './seed';
import { createPRNG } from '../random/prng';
import { isLairFloor } from './lair';
import type { GameMode } from './seed';

/**
 * Omens: a rule twist that some floors announce as they begin. They give every floor its own
 * flavour (risk for reward, a breather, a bigger arsenal) without changing the board format.
 * Chosen purely from the run seed and the floor, so a daily challenge has the same omens for everyone.
 */
export type OmenId = 'bounty' | 'calm' | 'arsenal';

export interface OmenEffects {
  /** Gem value multiplier. */
  gemMultiplier: number;
  /** Guardians added to (or removed from) the floor. */
  enemyDelta: number;
  /** Vortexes added to (or removed from) the floor. */
  pitDelta: number;
  /** Extra arrows lying in the quiver. */
  arrowBonus: number;
}

export const OMENS: Record<OmenId, OmenEffects> = {
  bounty: { gemMultiplier: 1.5, enemyDelta: 1, pitDelta: 0, arrowBonus: 0 },
  calm: { gemMultiplier: 1, enemyDelta: -1, pitDelta: -1, arrowBonus: 0 },
  arsenal: { gemMultiplier: 1, enemyDelta: 0, pitDelta: 1, arrowBonus: 2 },
};

export const NO_OMEN: OmenEffects = { gemMultiplier: 1, enemyDelta: 0, pitDelta: 0, arrowBonus: 0 };

/** Probability of each outcome, in order; the remainder is a plain floor. */
const TABLE: readonly [OmenId, number][] = [
  ['bounty', 0.25],
  ['calm', 0.2],
  ['arsenal', 0.15],
];

/** The omen of a floor, or null. Never on the first floor or on the Wumpus' lair. */
export function omenFor(runSeed: number, level: number, mode: GameMode = 'expedition'): OmenId | null {
  if (level < 2 || isLairFloor(mode, level)) return null;
  if (mode !== 'endless' && level > GAME_CONFIG.expedition.floors) return null;
  const roll = createPRNG(deriveLevelSeed(runSeed, level) ^ 0x5bd1e995)();
  let acc = 0;
  for (const [id, p] of TABLE) {
    acc += p;
    if (roll < acc) return id;
  }
  return null;
}

export const omenEffects = (id: OmenId | null | undefined): OmenEffects => (id ? OMENS[id] : NO_OMEN);
