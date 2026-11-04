import type { GameState } from '../engine/types';
import { HUNTER_TYPES, LETHAL_TYPES, type EntityType, type PickupKind } from '../engine/types';
import { bossHearts, countGuardians } from '../engine/entityCounts';
import { getNearbyHazards } from '../engine/proximity';
import { relicCount } from '../engine/relics';

/** What the screen needs from a state: the fields below only, so tests can pass small objects. */
export type FeedbackState = Pick<
  GameState,
  | 'playerIndex'
  | 'rows'
  | 'cols'
  | 'entities'
  | 'entityMap'
  | 'score'
  | 'attack'
  | 'coins'
  | 'level'
  | 'seed'
  | 'runSeed'
  | 'turn'
  | 'shield'
  | 'relics'
  | 'enemyCombo'
  | 'isGameOver'
  | 'isLevelUp'
  | 'lastPickup'
  | 'deathCause'
>;

export type FeedbackEvent =
  /** `tile` is where the effect happened (the popups rise from it). */
  | { kind: 'coin'; tile: number }
  /**
   * A guardian died to an arrow or a bomb. `combo` is the combo after the kill (0 for a bomb). `tile` is the closest kill;
   * `tiles` lists every guardian tile that fell in the action (closest first), so a thrown bomb that slays several can show
   * each one (a single kill gives `[tile]`).
   */
  | { kind: 'kill'; combo: number; tile: number; foe?: EntityType; tiles?: number[] }
  /** The Grimbur lost hearts; `dead` when it has none left. */
  | { kind: 'bossHit'; dead: boolean; hearts: number; tile: number }
  /** An arrow was fired and hit nothing. */
  | { kind: 'miss' }
  | { kind: 'pickup'; pickup: PickupKind; tile: number }
  /** A shield (or a Phoenix Feather) soaked a deadly touch. */
  | { kind: 'shieldBreak'; tile: number }
  /** A hunter has just started winding up a strike. */
  | { kind: 'charge' }
  /** The hero has just stepped next to a hazard it was not next to before. */
  | { kind: 'hazardNear' }
  | { kind: 'death' };

/**
 * Compares two consecutive states and lists what just happened, so every effect (sound, popup, haptic)
 * fires exactly once. Only actions that take a turn (a step, a shot, a bomb) produce events: buying, the
 * detector, undo, a new floor or a new run never replay old feedback.
 */
export function diffFeedback(prev: FeedbackState, next: FeedbackState): FeedbackEvent[] {
  if (prev === next) return [];
  // New floor, new run or an undo: nothing "happened".
  if (prev.seed !== next.seed || prev.runSeed !== next.runSeed || prev.level !== next.level) return [];
  if (next.turn <= prev.turn) {
    return next.isGameOver && !prev.isGameOver ? [{ kind: 'death' }] : [];
  }

  const events: FeedbackEvent[] = [];
  const moved = next.playerIndex !== prev.playerIndex;
  const shot = next.attack < prev.attack;

  const guardiansBefore = countGuardians(prev);
  const guardiansNow = countGuardians(next);
  const heartsBefore = bossHearts(prev);
  const heartsNow = bossHearts(next);
  const bossBefore = prev.entities.some(e => e.type === 'boss');
  const bossAfter = next.entities.some(e => e.type === 'boss');

  const killed = guardiansNow < guardiansBefore && !moved;
  const bossHit = bossBefore && (heartsNow < heartsBefore || !bossAfter) && !moved;

  if (next.coins < prev.coins) events.push({ kind: 'coin', tile: next.playerIndex });
  if (killed) {
    const tiles = goneGuardianTiles(prev, next);
    const tile = tiles.length > 0 ? tiles[0] : next.playerIndex;
    const kill: FeedbackEvent = { kind: 'kill', combo: shot || next.enemyCombo > prev.enemyCombo ? next.enemyCombo : 0, tile, foe: prev.entityMap[tile]?.type };
    // Several guardians fell at once (a bomb's blast): every tile, for a popup on each.
    events.push(tiles.length > 1 ? { ...kill, tiles } : kill);
  }
  if (bossHit) {
    const bossTile = prev.entities.find(e => e.type === 'boss')?.index ?? next.playerIndex;
    events.push({ kind: 'bossHit', dead: !bossAfter, hearts: heartsNow, tile: bossTile });
  }
  if (shot && !killed && !bossHit) events.push({ kind: 'miss' });

  if (moved && next.lastPickup) events.push({ kind: 'pickup', pickup: next.lastPickup, tile: next.playerIndex });

  const feathers = (s: FeedbackState) => relicCount(s.relics, 'phoenix');
  const absorbed = (prev.shield && !next.shield) || feathers(next) < feathers(prev);
  if (absorbed && !next.isGameOver) events.push({ kind: 'shieldBreak', tile: next.playerIndex });

  if (chargedHunters(next) > chargedHunters(prev)) events.push({ kind: 'charge' });

  if (moved && !next.isGameOver && !next.isLevelUp) {
    const was = getNearbyHazards(prev.playerIndex, prev.rows, prev.cols, prev.entityMap);
    const now = getNearbyHazards(next.playerIndex, next.rows, next.cols, next.entityMap);
    if ((now.enemy || now.pit) && !(was.enemy || was.pit)) events.push({ kind: 'hazardNear' });
  }

  if (next.isGameOver && !prev.isGameOver) events.push({ kind: 'death' });
  return events;
}

/** The tile of the guardian that disappeared (the one nearest the hero when several did), or the hero's tile. */
export function goneGuardianTile(prev: FeedbackState, next: FeedbackState): number {
  const gone = goneGuardianTiles(prev, next);
  return gone.length > 0 ? gone[0] : next.playerIndex;
}

/**
 * Every tile whose guardian is gone between the two states, closest to the hero first. A stalker that only stepped aside (its
 * old tile empty, a stalker now on a tile beside it) is not counted as fallen.
 */
export function goneGuardianTiles(prev: FeedbackState, next: FeedbackState): number[] {
  const cols = prev.cols;
  const dist = (a: number, b: number) => Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs((a % cols) - (b % cols));
  const isGuardian = (t: string | undefined) => t === 'enemy' || t === 'stalker' || t === 'sleeper' || t === 'mimic';
  const gone = prev.entities.filter(e => isGuardian(e.type) && next.entityMap[e.index] === undefined).map(e => e.index);
  // Stalkers standing where none stood before: each one walked from a vanished stalker's tile beside it.
  const arrived = next.entities.filter(e => e.type === 'stalker' && !isGuardian(prev.entityMap[e.index]?.type)).map(e => e.index);
  const fallen = [...gone];
  for (const a of arrived) {
    const from = fallen.findIndex(g => prev.entityMap[g]?.type === 'stalker' && dist(g, a) === 1);
    if (from !== -1) fallen.splice(from, 1);
  }
  return fallen.sort((a, b) => dist(a, next.playerIndex) - dist(b, next.playerIndex));
}

/** Hunters (Grimbur, stalkers) currently winding up a strike. */
export const chargedHunters = (s: Pick<FeedbackState, 'entities'>): number =>
  s.entities.filter(e => HUNTER_TYPES.includes(e.type) && (e.charge ?? 0) >= 1).length;

/**
 * The tile that killed the hero: the lethal thing it stepped on, or the hunter that struck it (an adjacent
 * entity of the death cause). Falls back to the hero's own tile.
 */
export function killerTile(
  s: Pick<FeedbackState, 'playerIndex' | 'rows' | 'cols' | 'entityMap' | 'entities' | 'deathCause'>,
): number {
  const here = s.entityMap[s.playerIndex];
  if (here && LETHAL_TYPES.includes(here.type)) return s.playerIndex;
  if (s.deathCause) {
    const row = Math.floor(s.playerIndex / s.cols);
    const col = s.playerIndex % s.cols;
    const hit = s.entities.find(
      e => e.type === s.deathCause && Math.abs(Math.floor(e.index / s.cols) - row) + Math.abs((e.index % s.cols) - col) === 1,
    );
    if (hit) return hit.index;
  }
  return s.playerIndex;
}
