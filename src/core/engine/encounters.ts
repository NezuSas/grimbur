import { createPRNG } from '../random/prng';
import { isLairFloor } from './lair';
import { MAX_ITEMS } from './shop';
import { chestRelic, relicCount, type RelicId } from './relics';
import type { GameMode } from './seed';
import type { EventId } from './events';
import type { GameEntity, GameState } from './types';
import { isClueHazard } from './types';
import { draftContext, gainRelicNow, nearestTile } from './worldHelpers';
import { scaleAmmo, weaponOf } from './weapons';

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
  /** The gambler's die, 1 to 6: 4 or more wins (shown rolling, then landing on it). */
  die?: number;
  /** How many tiles the torn map's safe path lit. */
  tiles?: number;
  /** What a scene that can give one thing or another gave (the spring: a shield or an arrow; the shrine: a detector or a bomb). */
  gift?: 'shield' | 'arrow' | 'detector' | 'bomb';
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
/** The gambler: a stake of shop gems, paid back with a profit half of the time (a die showing GAMBLER_WIN_FROM or more). */
export const GAMBLER_STAKE = 3;
export const GAMBLER_PAYOUT = 7;
export const GAMBLER_LUCK = 0.5;
export const GAMBLER_WIN_FROM = 4;
/** The shrine: an arrow for a detector charge (a bomb when the bag holds the most detectors). */
export const SHRINE_ARROWS = 1;
/** The trapped miner: a bomb clears the rubble, and the miner gives a relic (never a cursed one). */
export const MINER_BOMBS = 1;
/** Shop gems the miner gives instead when every relic is already maxed. */
export const MINER_GEMS = 3;
/** The torn map: shop gems for a safe path to the nearest gem not reached yet (its tiles are lit, as if walked). */
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

/** The scout's price in the hero's ammo: bombs are scarcer, so a bomber pays half (rounded up). */
export const scoutCost = (s: Partial<Pick<GameState, 'perks'>>): number => scaleAmmo(s.perks ? weaponOf(s as Pick<GameState, 'perks'>) : 'bow', SCOUT_ARROWS);
/** The arrows the smith melts the shield into, in the hero's ammo. */
export const smithAmmo = (s: Partial<Pick<GameState, 'perks'>>): number => scaleAmmo(s.perks ? weaponOf(s as Pick<GameState, 'perks'>) : 'bow', SMITH_ARROWS);

/** Whether the player can pay for the scene right now (walking past is always possible). */
export function canTake(id: EncounterId, s: Pick<GameState, 'attack' | 'gems' | 'items'> & Partial<Pick<GameState, 'shield' | 'entities' | 'rows' | 'cols' | 'visited' | 'playerIndex' | 'marked' | 'perks'>>): boolean {
  if (id === 'scout') return s.attack >= scoutCost(s);
  if (id === 'gambler') return s.gems >= GAMBLER_STAKE;
  if (id === 'shrine') return s.attack >= SHRINE_ARROWS && (s.items.detector < MAX_ITEMS || s.items.bomb < MAX_ITEMS);
  if (id === 'miner') return s.items.bomb >= MINER_BOMBS;
  if (id === 'map') return s.gems >= MAP_GEMS && !!s.entities && gemPath(s as GameState) !== null;
  if (id === 'smith') return !!s.shield;
  // The echo stakes an arrow, and has to have something left to give away.
  if (id === 'echo') return s.attack >= 1 && !!s.entities && echoDanger(s as GameState) !== null;
  return true;
}

/** A tile the torn map lets the hero cross: nothing on it that a clue warns of, no trap, no thief. */
const mapSafe = (e: GameEntity | undefined) => !e || !(isClueHazard(e.type) || e.type === 'trap' || e.type === 'thief');

/**
 * The torn map's safe path: the shortest walk over safe tiles from the hero to the nearest gem not reached yet (a real gem:
 * the map knows a mimic), the hero's own tile left out. Null when no gem can be reached safely.
 */
export function gemPath(s: Pick<GameState, 'rows' | 'cols' | 'visited' | 'entities' | 'playerIndex'>): number[] | null {
  const seen = new Set(s.visited);
  const gems = new Set(s.entities.filter(e => e.type === 'coin' && !seen.has(e.index)).map(e => e.index));
  if (!gems.size) return null;
  const at = new Map<number, GameEntity>();
  for (const e of s.entities) at.set(e.index, e);
  const from = new Map<number, number>([[s.playerIndex, -1]]);
  const queue = [s.playerIndex];
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    if (gems.has(i)) {
      const path: number[] = [];
      for (let t = i; t !== s.playerIndex; t = from.get(t)!) path.unshift(t);
      return path;
    }
    const r = Math.floor(i / s.cols);
    const c = i % s.cols;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= s.rows || nc >= s.cols) continue;
      const n = nr * s.cols + nc;
      if (from.has(n) || !mapSafe(at.get(n))) continue;
      from.set(n, i);
      queue.push(n);
    }
  }
  return null;
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
  return { ...after, encounterLog: [...(state.encounterLog ?? []), { id: done.id, outcome: done.outcome, floor: state.level }] };
}

function resolveScene(state: GameState, enc: Encounter, take: boolean): GameState {
  if (!take || !canTake(enc.id, state)) return { ...state, encounter: { ...enc, outcome: 'skip' } };
  const roll = prngFor(state.runSeed, state.level, 0x6a09e667);
  switch (enc.id) {
    case 'scout': {
      const tiles = scoutTiles(state);
      return { ...state, attack: state.attack - scoutCost(state), visited: [...state.visited, ...tiles], encounter: { ...enc, outcome: 'done' } };
    }
    case 'spring': {
      if (roll() < SPRING_LUCK) {
        // A shield already held (or one the Blood Gems would refuse) becomes an arrow.
        return state.shield || relicCount(state.relics, 'blood_gems') > 0
          ? { ...state, attack: state.attack + 1, encounter: { ...enc, outcome: 'win', gift: 'arrow' } }
          : { ...state, shield: true, encounter: { ...enc, outcome: 'win', gift: 'shield' } };
      }
      return { ...state, gems: Math.max(0, state.gems - SPRING_LOSS), encounter: { ...enc, outcome: 'lose' } };
    }
    case 'gambler': {
      const won = roll() < GAMBLER_LUCK;
      // The face the die shows: one of the winning faces or one of the losing ones (the luck above decides which).
      const faces = won ? 7 - GAMBLER_WIN_FROM : GAMBLER_WIN_FROM - 1;
      const die = (won ? GAMBLER_WIN_FROM : 1) + Math.min(faces - 1, Math.floor(roll() * faces));
      return { ...state, gems: state.gems - GAMBLER_STAKE + (won ? GAMBLER_PAYOUT : 0), encounter: { ...enc, outcome: won ? 'win' : 'lose', die } };
    }
    case 'shrine': {
      const detector = state.items.detector < MAX_ITEMS;
      const items = detector ? { ...state.items, detector: state.items.detector + 1 } : { ...state.items, bomb: Math.min(MAX_ITEMS, state.items.bomb + 1) };
      return { ...state, attack: state.attack - SHRINE_ARROWS, items, encounter: { ...enc, outcome: 'done', gift: detector ? 'detector' : 'bomb' } };
    }
    case 'miner': {
      const items = { ...state.items, bomb: state.items.bomb - MINER_BOMBS };
      // A grateful miner never hands over a cursed relic: the owned list is read as if one were already held.
      const relic = chestRelic(state.runSeed, state.level, 9973, [...state.relics, 'gambler'], draftContext(state));
      if (!relic) return { ...state, items, gems: state.gems + MINER_GEMS, encounter: { ...enc, outcome: 'lose' } };
      return { ...state, ...gainRelicNow({ ...state, items }, relic), encounter: { ...enc, outcome: 'win', relic } };
    }
    case 'map': {
      const path = gemPath(state) ?? [];
      const seen = new Set(state.visited);
      return {
        ...state,
        gems: state.gems - MAP_GEMS,
        visited: [...state.visited, ...path.filter(t => !seen.has(t))],
        encounter: { ...enc, outcome: 'done', tiles: path.length },
      };
    }
    case 'echo': {
      const danger = echoDanger(state);
      if (danger !== null && roll() < ECHO_LUCK) return { ...state, marked: [...state.marked, danger], encounter: { ...enc, outcome: 'win' } };
      return { ...state, attack: state.attack - 1, encounter: { ...enc, outcome: 'lose' } };
    }
    case 'smith':
      return { ...state, shield: false, attack: state.attack + smithAmmo(state), encounter: { ...enc, outcome: 'done' } };
  }
}
