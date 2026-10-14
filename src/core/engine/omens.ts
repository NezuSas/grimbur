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
  /** Gem score multiplier. */
  gemMultiplier: number;
  /** Every Nth gem collected on the floor also gives one more shop gem (0 = never): bounty pays +50% in the shop too. */
  shopGemEvery: number;
  /** Guardians added to (or removed from) the floor. */
  enemyDelta: number;
  /** Vortexes added to (or removed from) the floor. */
  pitDelta: number;
  /** Gems lying on the floor added (or removed); a floor always keeps at least two. */
  coinDelta: number;
  /** Roaming stalkers added to the floor. */
  stalkerDelta: number;
  /** Extra arrows lying in the quiver. */
  arrowBonus: number;
}

export const OMENS: Record<OmenId, OmenEffects> = {
  // Greed: richer (score x1.5, +1 gem on the board, +50% shop gems) but one more guardian guards the hoard.
  bounty: { gemMultiplier: 1.5, shopGemEvery: 2, enemyDelta: 1, pitDelta: 0, coinDelta: 1, stalkerDelta: 0, arrowBonus: 0 },
  // A breather: safer board, but a leaner one (one gem less to collect and spend).
  calm: { gemMultiplier: 1, shopGemEvery: 0, enemyDelta: -1, pitDelta: -1, coinDelta: -1, stalkerDelta: 0, arrowBonus: 0 },
  // Firepower: two more arrows, paid for with a vortex and a roaming stalker drawn by the noise.
  arsenal: { gemMultiplier: 1, shopGemEvery: 0, enemyDelta: 0, pitDelta: 1, coinDelta: 0, stalkerDelta: 1, arrowBonus: 2 },
};

export const NO_OMEN: OmenEffects = { gemMultiplier: 1, shopGemEvery: 0, enemyDelta: 0, pitDelta: 0, coinDelta: 0, stalkerDelta: 0, arrowBonus: 0 };

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
