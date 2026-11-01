import type { GameState } from '../engine/types';

/**
 * The bestiary: the creatures and dangers of the cave, unlocked by meeting them (every floor that ends unveils what it held)
 * and counted when defeated. A run tallies them in its state; finished runs add them to the stats for good.
 */
export const BEASTS = ['enemy', 'stalker', 'sleeper', 'mimic', 'thief', 'brute', 'boss', 'pit', 'trap', 'chest'] as const;
export type BeastId = (typeof BEASTS)[number];

/** The ones that can be defeated (the others are only met). */
export const SLAYABLE: readonly BeastId[] = ['enemy', 'stalker', 'sleeper', 'mimic', 'thief', 'brute', 'boss'];

export interface Bestiary {
  met: BeastId[];
  slain: Partial<Record<BeastId, number>>;
}

export const EMPTY_BESTIARY: Bestiary = { met: [], slain: {} };

const isBeast = (v: unknown): v is BeastId => typeof v === 'string' && (BEASTS as readonly string[]).includes(v);

/** The bestiary id of an entity: the lieutenant is a boss with `mini`. */
export const beastOf = (e: { type: string; mini?: boolean }): BeastId | null => {
  if (e.type === 'boss') return e.mini ? 'brute' : 'boss';
  return isBeast(e.type) ? e.type : null;
};

type Tally = Pick<GameState, 'entities' | 'level' | 'runSeed' | 'isGameOver' | 'isVictory' | 'deathCause'> & { met?: BeastId[]; slain?: Partial<Record<BeastId, number>> };

const count = (entities: GameState['entities']) => {
  const out: Partial<Record<BeastId, number>> = {};
  for (const e of entities) {
    const b = beastOf(e);
    if (b && SLAYABLE.includes(b)) out[b] = (out[b] ?? 0) + 1;
  }
  return out;
};

/**
 * What one action added to the run's tally, from the state before and after it. A creature that leaves the floor without the
 * floor changing was defeated (or caught, for a thief); a sleeper that wakes becomes a stalker, so creatures that appear cancel
 * as many disappearances (the sleeper first). When a floor ends (cleared or fatal) everything it held counts as met.
 */
export function tallyBestiary(prev: Tally, next: Tally): { met: BeastId[]; slain: Partial<Record<BeastId, number>> } {
  let met = next.met ?? prev.met ?? [];
  let slain = { ...(next.slain ?? prev.slain ?? {}) };
  if (prev.runSeed !== next.runSeed) return { met: [], slain: {} };
  const meet = (ids: Iterable<BeastId>) => {
    const add = [...ids].filter(b => !met.includes(b));
    if (add.length) met = [...met, ...add];
  };
  if (prev.level === next.level) {
    const before = count(prev.entities);
    const after = count(next.entities);
    let appeared = 0;
    for (const b of SLAYABLE) appeared += Math.max(0, (after[b] ?? 0) - (before[b] ?? 0));
    const gone: BeastId[] = [];
    for (const b of ['sleeper', ...SLAYABLE.filter(x => x !== 'sleeper')] as BeastId[]) {
      for (let k = 0; k < Math.max(0, (before[b] ?? 0) - (after[b] ?? 0)); k++) gone.push(b);
    }
    for (const b of gone.slice(appeared)) slain = { ...slain, [b]: (slain[b] ?? 0) + 1 };
    meet(gone.slice(appeared));
  }
  const floorEnded = prev.level !== next.level || (!prev.isGameOver && next.isGameOver) || (!prev.isVictory && next.isVictory);
  if (floorEnded) {
    meet(prev.entities.map(beastOf).filter((b): b is BeastId => !!b));
    if (next.isGameOver && next.deathCause) {
      const cause = next.deathCause === 'brute' ? 'brute' : beastOf({ type: next.deathCause });
      if (cause) meet([cause]);
    }
  }
  return { met, slain };
}

/** A finished run added to the lifetime bestiary. */
export const mergeBestiary = (book: Bestiary, run: { met?: readonly string[]; slain?: Partial<Record<string, number>> }): Bestiary => {
  const met = [...book.met];
  for (const b of run.met ?? []) if (isBeast(b) && !met.includes(b)) met.push(b);
  const slain = { ...book.slain };
  for (const [b, n] of Object.entries(run.slain ?? {})) {
    if (isBeast(b) && typeof n === 'number' && n > 0) {
      slain[b] = (slain[b] ?? 0) + Math.trunc(n);
      if (!met.includes(b)) met.push(b);
    }
  }
  return { met, slain };
};

export function parseBestiary(raw: unknown): Bestiary {
  if (!raw || typeof raw !== 'object') return EMPTY_BESTIARY;
  const r = raw as { met?: unknown; slain?: unknown };
  const met = Array.isArray(r.met) ? [...new Set(r.met.filter(isBeast))] : [];
  const slain: Partial<Record<BeastId, number>> = {};
  if (r.slain && typeof r.slain === 'object') {
    for (const [k, v] of Object.entries(r.slain as Record<string, unknown>)) {
      if (isBeast(k) && typeof v === 'number' && Number.isFinite(v) && v > 0) slain[k] = Math.trunc(v);
    }
  }
  return { met, slain };
}
