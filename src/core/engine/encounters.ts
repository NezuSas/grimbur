import { createPRNG } from '../random/prng';
import { isLairFloor } from './lair';
import { MAX_ITEMS } from './shop';
import { chestRelic, relicCount, type RelicId } from './relics';
import type { GameMode } from './seed';
import type { EventId } from './events';
import type { GameEntity, GameState } from './types';
import { isClueHazard } from './types';
import { draftContext, gainRelicNow, nearestTile } from './worldHelpers';

/**
 * Encounters: some floors open with a quick choice told as a scene (a wounded scout, a strange spring, a gambler, a forgotten
 * shrine). Taking it costs something now for something better, or rolls the dice; walking past costs nothing. They make each
 * run tell its own story. Chosen from the run seed and the floor, so a daily or a challenge has the same scenes for everyone,
 * and the dice of a scene are seeded too (no save-scumming).
 */
export type EncounterId = 'scout' | 'spring' | 'gambler' | 'shrine' | 'miner' | 'map' | 'echo' | 'smith';
export const ENCOUNTERS: readonly EncounterId[] = ['scout', 'spring', 'gambler', 'shrine', 'miner', 'map', 'echo', 'smith'];

export interface Encounter {
  id: EncounterId;
  /** Set once the player chose: what happened ('win'/'lose' for a gamble, 'done' for a trade, 'skip' when walked past). */
  outcome?: 'win' | 'lose' | 'done' | 'skip';
  /** The relic the trapped miner gave (shown on the outcome). */
  relic?: RelicId;
}

export const ENCOUNTER_FROM = 2;
export const ENCOUNTER_CHANCE = 0.25;
/** The week of the wanderers: most floors open with a scene. */
export const ENCOUNTER_CHANCE_WANDERERS = 0.7;
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
/** The trapped miner: a bomb clears the rubble, and the miner gives a relic (never a cursed one). */
export const MINER_BOMBS = 1;
/** Shop gems the miner gives instead when every relic is already maxed. */
export const MINER_GEMS = 3;
/** The torn map: shop gems for the place of the nearest gem still hidden. */
export const MAP_GEMS = 2;
/** The echo: most of the time it gives away the nearest danger (flagged), otherwise an arrow falls into the dark. */
export const ECHO_LUCK = 0.7;
/** The wandering smith: the shield melted into arrows. */
export const SMITH_ARROWS = 3;

const prngFor = (runSeed: number, level: number, salt: number) => {
  const roll = createPRNG(((runSeed ^ Math.imul(level, 0x9e3779b1) ^ salt) >>> 0) || 1);
  roll();
  return roll;
};

/** The scene that opens a floor, or null (never the first floors nor the lair). */
export function encounterFor(runSeed: number, level: number, mode: GameMode, event?: EventId | null): EncounterId | null {
  if (level < ENCOUNTER_FROM || isLairFloor(mode, level)) return null;
  const roll = prngFor(runSeed, level, 0x2545f491);
  if (roll() >= (event === 'wanderers' ? ENCOUNTER_CHANCE_WANDERERS : ENCOUNTER_CHANCE)) return null;
  return ENCOUNTERS[Math.floor(roll() * ENCOUNTERS.length)];
}

/** Whether the player can pay for the scene right now (walking past is always possible). */
export function canTake(id: EncounterId, s: Pick<GameState, 'attack' | 'gems' | 'items'> & Partial<Pick<GameState, 'shield' | 'entities' | 'rows' | 'cols' | 'visited' | 'playerIndex' | 'marked'>>): boolean {
  if (id === 'scout') return s.attack >= SCOUT_ARROWS;
  if (id === 'gambler') return s.gems >= GAMBLER_STAKE;
  if (id === 'shrine') return s.attack >= SHRINE_ARROWS && (s.items.detector < MAX_ITEMS || s.items.bomb < MAX_ITEMS);
  if (id === 'miner') return s.items.bomb >= MINER_BOMBS;
  if (id === 'map') return s.gems >= MAP_GEMS && !!s.entities && hiddenGem(s as GameState) !== null;
  if (id === 'smith') return !!s.shield;
  // The echo stakes an arrow, and has to have something left to give away.
  if (id === 'echo') return s.attack >= 1 && !!s.entities && echoDanger(s as GameState) !== null;
  return true;
}

/** The nearest gem the hero has not seen yet (the torn map points at it), or null. */
export function hiddenGem(s: Pick<GameState, 'cols' | 'visited' | 'entities' | 'playerIndex'>): number | null {
  const seen = new Set(s.visited);
  return nearestTile(s.entities.filter(e => e.type === 'coin' && !seen.has(e.index)).map(e => e.index), s.playerIndex, s.cols);
}

/** The nearest danger the echo gives away: a clue hazard not explored and not already flagged. */
export function echoDanger(s: Pick<GameState, 'cols' | 'visited' | 'entities' | 'playerIndex' | 'marked'>): number | null {
  const skip = new Set([...s.visited, ...s.marked]);
  return nearestTile(s.entities.filter(e => isClueHazard(e.type) && e.type !== 'boss' && !skip.has(e.index)).map(e => e.index), s.playerIndex, s.cols);
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
    if (e && (isClueHazard(e.type) || e.type === 'trap' || e.type === 'thief')) continue;
    out.push({ i, d: Math.abs(Math.floor(i / s.cols) - pr) + Math.abs((i % s.cols) - pc) });
  }
  return out.sort((a, b) => a.d - b.d || a.i - b.i).slice(0, SCOUT_TILES).map(o => o.i);
}

/** The state after the player takes (or walks past) the floor's scene. */
export function resolveEncounter(state: GameState, take: boolean): GameState {
  const enc = state.encounter;
  if (!enc || enc.outcome) return state;
  const after = resolveScene(state, enc, take);
  const done = after.encounter ?? enc;
  return { ...after, encounterLog: [...(state.encounterLog ?? []), { id: done.id, outcome: done.outcome }] };
}

function resolveScene(state: GameState, enc: Encounter, take: boolean): GameState {
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
    case 'miner': {
      const items = { ...state.items, bomb: state.items.bomb - MINER_BOMBS };
      // A grateful miner never hands over a cursed relic: the owned list is read as if one were already held.
      const relic = chestRelic(state.runSeed, state.level, 9973, [...state.relics, 'gambler'], draftContext(state));
      if (!relic) return { ...state, items, gems: state.gems + MINER_GEMS, encounter: { ...enc, outcome: 'lose' } };
      return { ...state, ...gainRelicNow({ ...state, items }, relic), encounter: { ...enc, outcome: 'win', relic } };
    }
    case 'map': {
      const gem = hiddenGem(state);
      return { ...state, gems: state.gems - MAP_GEMS, visited: gem === null ? state.visited : [...state.visited, gem], encounter: { ...enc, outcome: 'done' } };
    }
    case 'echo': {
      const danger = echoDanger(state);
      if (danger !== null && roll() < ECHO_LUCK) return { ...state, marked: [...state.marked, danger], encounter: { ...enc, outcome: 'win' } };
      return { ...state, attack: state.attack - 1, encounter: { ...enc, outcome: 'lose' } };
    }
    case 'smith':
      return { ...state, shield: false, attack: state.attack + SMITH_ARROWS, encounter: { ...enc, outcome: 'done' } };
  }
}
