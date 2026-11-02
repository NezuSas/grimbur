import { createPRNG } from '../random/prng';
import { isLairFloor } from './lair';
import { MAX_ITEMS } from './shop';
import { relicCount } from './relics';
import type { GameMode } from './seed';
import type { GameEntity, GameState } from './types';
import { isClueHazard } from './types';

/**
 * Encounters: some floors open with a quick choice told as a scene (a wounded scout, a strange spring, a gambler, a forgotten
 * shrine). Taking it costs something now for something better, or rolls the dice; walking past costs nothing. They make each
 * run tell its own story. Chosen from the run seed and the floor, so a daily or a challenge has the same scenes for everyone,
 * and the dice of a scene are seeded too (no save-scumming).
 */
export type EncounterId = 'scout' | 'spring' | 'gambler' | 'shrine';
export const ENCOUNTERS: readonly EncounterId[] = ['scout', 'spring', 'gambler', 'shrine'];

export interface Encounter {
  id: EncounterId;
  /** Set once the player chose: what happened ('win'/'lose' for a gamble, 'done' for a trade, 'skip' when walked past). */
  outcome?: 'win' | 'lose' | 'done' | 'skip';
}

export const ENCOUNTER_FROM = 2;
export const ENCOUNTER_CHANCE = 0.25;
/** The scout's price and how many safe tiles it shows. */
export const SCOUT_ARROWS = 2;
export const SCOUT_TILES = 3;
/** The spring: a shield (or an arrow when one is held) most of the time, otherwise gems are lost. */
export const SPRING_LUCK = 0.6;
export const SPRING_LOSS = 2;
/** The gambler: a stake of shop gems, paid back with a profit half of the time. */
export const GAMBLER_STAKE = 3;
export const GAMBLER_PAYOUT = 7;
export const GAMBLER_LUCK = 0.5;
/** The shrine: an arrow for a detector charge (a bomb when the bag holds the most detectors). */
export const SHRINE_ARROWS = 1;

const prngFor = (runSeed: number, level: number, salt: number) => {
  const roll = createPRNG(((runSeed ^ Math.imul(level, 0x9e3779b1) ^ salt) >>> 0) || 1);
  roll();
  return roll;
};

/** The scene that opens a floor, or null (never the first floors nor the lair). */
export function encounterFor(runSeed: number, level: number, mode: GameMode): EncounterId | null {
  if (level < ENCOUNTER_FROM || isLairFloor(mode, level)) return null;
  const roll = prngFor(runSeed, level, 0x2545f491);
  if (roll() >= ENCOUNTER_CHANCE) return null;
  return ENCOUNTERS[Math.floor(roll() * ENCOUNTERS.length)];
}

/** Whether the player can pay for the scene right now (walking past is always possible). */
export function canTake(id: EncounterId, s: Pick<GameState, 'attack' | 'gems' | 'items'>): boolean {
  if (id === 'scout') return s.attack >= SCOUT_ARROWS;
  if (id === 'gambler') return s.gems >= GAMBLER_STAKE;
  if (id === 'shrine') return s.attack >= SHRINE_ARROWS && (s.items.detector < MAX_ITEMS || s.items.bomb < MAX_ITEMS);
  return true;
}

/** The safe tiles the scout shows: unexplored, holding no danger, the closest to the hero first. */
export function scoutTiles(s: Pick<GameState, 'rows' | 'cols' | 'visited' | 'entityMap' | 'playerIndex'>): number[] {
  const seen = new Set(s.visited);
  const pr = Math.floor(s.playerIndex / s.cols);
  const pc = s.playerIndex % s.cols;
  const out: { i: number; d: number }[] = [];
  for (let i = 0; i < s.rows * s.cols; i++) {
    if (seen.has(i)) continue;
    const e: GameEntity | undefined = s.entityMap[i];
    if (e && (isClueHazard(e.type) || e.type === 'trap' || e.type === 'thief' || e.type === 'secret')) continue;
    out.push({ i, d: Math.abs(Math.floor(i / s.cols) - pr) + Math.abs((i % s.cols) - pc) });
  }
  return out.sort((a, b) => a.d - b.d || a.i - b.i).slice(0, SCOUT_TILES).map(o => o.i);
}

/** The state after the player takes (or walks past) the floor's scene. */
export function resolveEncounter(state: GameState, take: boolean): GameState {
  const enc = state.encounter;
  if (!enc || enc.outcome) return state;
  if (!take || !canTake(enc.id, state)) return { ...state, encounter: { ...enc, outcome: 'skip' } };
  const roll = prngFor(state.runSeed, state.level, 0x6a09e667);
  switch (enc.id) {
    case 'scout': {
      const tiles = scoutTiles(state);
      return { ...state, attack: state.attack - SCOUT_ARROWS, visited: [...state.visited, ...tiles], encounter: { ...enc, outcome: 'done' } };
    }
    case 'spring': {
      if (roll() < SPRING_LUCK) {
        // A shield already held (or one the Blood Gems would refuse) becomes an arrow.
        return state.shield || relicCount(state.relics, 'blood_gems') > 0
          ? { ...state, attack: state.attack + 1, encounter: { ...enc, outcome: 'win' } }
          : { ...state, shield: true, encounter: { ...enc, outcome: 'win' } };
      }
      return { ...state, gems: Math.max(0, state.gems - SPRING_LOSS), encounter: { ...enc, outcome: 'lose' } };
    }
    case 'gambler': {
      const won = roll() < GAMBLER_LUCK;
      return { ...state, gems: state.gems - GAMBLER_STAKE + (won ? GAMBLER_PAYOUT : 0), encounter: { ...enc, outcome: won ? 'win' : 'lose' } };
    }
    case 'shrine': {
      const items = state.items.detector < MAX_ITEMS ? { ...state.items, detector: state.items.detector + 1 } : { ...state.items, bomb: Math.min(MAX_ITEMS, state.items.bomb + 1) };
      return { ...state, attack: state.attack - SHRINE_ARROWS, items, encounter: { ...enc, outcome: 'done' } };
    }
  }
}
