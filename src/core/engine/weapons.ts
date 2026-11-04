import type { Direction, GameState } from './types';
import { getHeroPerks } from './heroes';

/**
 * Each hero's attack. The archers (Vael, Sera, Borin, Auric) shoot the bow exactly as before; Mira casts an arcane ORB that
 * bursts where it lands and lights the tiles around it (an information weapon); Bram throws a BOMB that explodes in a plus
 * around where it lands (area, scarcity and noise). The weapon is a hero perk, so it is plain data and the rules stay pure,
 * deterministic and testable.
 *
 * This file is the shared contract between the engine, the board, the HUD/texts and the cosmetics.
 */
export type WeaponId = 'bow' | 'orb' | 'bomb';
export const WEAPONS: readonly WeaponId[] = ['bow', 'orb', 'bomb'];

export const weaponOf = (state: Pick<GameState, 'perks'>): WeaponId => state.perks.weapon ?? 'bow';
export const weaponOfHero = (heroIndex: number): WeaponId => getHeroPerks(heroIndex).weapon ?? 'bow';

/** Radius (Manhattan) of the orb's burst around where it lands. */
export const ORB_BURST = 1;
/** How far a bomb is thrown by default. */
export const BOMB_REACH = 2;
/** Sleepers this close (Manhattan) to a bomb's blast wake up. */
export const BOMB_WAKE = 3;

/** Bombs are scarcer: every grant of ammo gives half as many (rounded up). Arrows and orbs are unchanged. */
export const scaleAmmo = (weapon: WeaponId, n: number): number => (weapon === 'bomb' ? Math.ceil(n / 2) : n);

/**
 * The plan of a shot toward `aim`, before it is resolved: the tiles it crosses, the tile it hits (-1 when none), where it
 * lands (the target, or the last tile of its flight), and the tiles its burst / blast covers (empty for the bow). The
 * reducer, the aim preview, the flight animation and the tests all use it, so what the board shows is what the shot does.
 * Implemented in the engine (shotPlan in weapons.ts, filled by the engine work).
 */
export interface ShotPlan {
  weapon: WeaponId;
  dir: Direction;
  tiles: number[];
  targetIndex: number;
  landing: number;
  area: number[];
}

/** The tiles within Manhattan `radius` of `center` (inside the board), the hero's own tile left out, in index order. */
export function burstArea(center: number, radius: number, rows: number, cols: number, playerIndex: number): number[] {
  if (center < 0) return [];
  const cr = Math.floor(center / cols);
  const cc = center % cols;
  const out: number[] = [];
  for (let r = Math.max(0, cr - radius); r <= Math.min(rows - 1, cr + radius); r++) {
    for (let c = Math.max(0, cc - radius); c <= Math.min(cols - 1, cc + radius); c++) {
      const i = r * cols + c;
      if (Math.abs(r - cr) + Math.abs(c - cc) <= radius && i !== playerIndex) out.push(i);
    }
  }
  return out;
}

/** The 3x3 square around `center` (inside the board), the hero's own tile left out, in index order (a piercing bomb). */
export function squareArea(center: number, rows: number, cols: number, playerIndex: number): number[] {
  if (center < 0) return [];
  const cr = Math.floor(center / cols);
  const cc = center % cols;
  const out: number[] = [];
  for (let r = Math.max(0, cr - 1); r <= Math.min(rows - 1, cr + 1); r++) {
    for (let c = Math.max(0, cc - 1); c <= Math.min(cols - 1, cc + 1); c++) {
      const i = r * cols + c;
      if (i !== playerIndex) out.push(i);
    }
  }
  return out;
}

const has = (relics: readonly string[], id: string) => relics.includes(id);

/**
 * The shot's plan (see ShotPlan).
 * - bow: exactly arrowPath; no area.
 * - orb: the arrow's flight; with the Piercing Head it flies on through a guardian it would slay (to the next hostile tile or
 *   the end of its reach). It lands on the last thing it hits (or the last tile of its flight) and bursts there: the tiles within
 *   ORB_BURST (2 with the Flare Arrow), the hero's tile left out. The reducer leaves out the tiles already explored.
 * - bomb: the arrow's flight (base reach BOMB_REACH through the hero's arrowReach); it explodes on the first hostile tile or at
 *   the end of its flight, in a plus around it (a 3x3 square with the Piercing Head), the hero's tile left out.
 * `arrowPath` is imported lazily-at-call from the reducer, which also imports this file.
 */
export function shotPlan(
  state: Pick<GameState, 'playerIndex' | 'rows' | 'cols' | 'perks' | 'relics' | 'entityMap'>,
  aim: Direction,
): ShotPlan {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { arrowPath } = require('./reducer') as typeof import('./reducer');
  const weapon = weaponOf(state);
  let { tiles, targetIndex } = arrowPath(state, aim);
  let landing = targetIndex !== -1 ? targetIndex : tiles.length ? tiles[tiles.length - 1] : -1;
  if (weapon === 'bow') return { weapon, dir: aim, tiles, targetIndex, landing, area: [] };
  const { rows, cols, playerIndex } = state;
  const relics = state.relics as readonly string[];

  if (weapon === 'orb') {
    const hit = targetIndex !== -1 ? state.entityMap[targetIndex]?.type : undefined;
    if (hit && has(relics, 'piercing') && hit !== 'boss' && hit !== 'thief') {
      // The orb flies on through the fallen guardian: the same flight with the guardian gone.
      const entityMap = { ...state.entityMap };
      delete entityMap[targetIndex];
      const on = arrowPath({ ...state, entityMap }, aim);
      tiles = on.tiles;
      landing = on.targetIndex !== -1 ? on.targetIndex : on.tiles.length ? on.tiles[on.tiles.length - 1] : -1;
    }
    const radius = has(relics, 'flare_arrow') ? 2 : ORB_BURST;
    return { weapon, dir: aim, tiles, targetIndex, landing, area: burstArea(landing, radius, rows, cols, playerIndex) };
  }

  const area = has(relics, 'piercing') ? squareArea(landing, rows, cols, playerIndex) : burstArea(landing, 1, rows, cols, playerIndex);
  return { weapon, dir: aim, tiles, targetIndex, landing, area };
}
