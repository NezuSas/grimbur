import { PUZZLE_COUNT } from '../puzzles/puzzles';

/** What the player has done with the cave's puzzles. */
export interface PuzzleProgress {
  /** Best stars (0..3) of each numbered puzzle of the path, in order. */
  stars: number[];
  /** The latest daily puzzle solved and its best stars. */
  daily: { date: string; stars: number } | null;
  /** Daily puzzles solved over all days. */
  dailySolved: number;
}

export const EMPTY_PUZZLES: PuzzleProgress = { stars: [], daily: null, dailySolved: 0 };

/** Embers for every new star on the path (a better try pays the difference), and for the day's puzzle the first time. */
export const EMBERS_PER_STAR = 5;
export const DAILY_PUZZLE_EMBERS = 15;
export const MAX_STARS = 3;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const starOf = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(MAX_STARS, Math.trunc(v))) : 0);

export function parsePuzzles(raw: unknown): PuzzleProgress {
  if (!raw || typeof raw !== 'object') return EMPTY_PUZZLES;
  const r = raw as Record<string, unknown>;
  const stars = Array.isArray(r.stars) ? r.stars.slice(0, PUZZLE_COUNT).map(starOf) : [];
  const d = r.daily as Record<string, unknown> | null | undefined;
  const daily = d && typeof d === 'object' && typeof d.date === 'string' && DATE.test(d.date) ? { date: d.date, stars: starOf(d.stars) } : null;
  const n = typeof r.dailySolved === 'number' && Number.isFinite(r.dailySolved) ? Math.max(0, Math.trunc(r.dailySolved)) : 0;
  return { stars, daily, dailySolved: n };
}

export const puzzleStarsAt = (p: PuzzleProgress | undefined, index: number): number => p?.stars[index] ?? 0;
export const puzzlesSolved = (p: PuzzleProgress | undefined): number => (p?.stars ?? []).filter(s => s > 0).length;
export const totalPuzzleStars = (p: PuzzleProgress | undefined): number => (p?.stars ?? []).reduce((a, s) => a + s, 0);
/** A puzzle of the path opens once the one before it is solved. */
export const isPuzzleOpen = (p: PuzzleProgress | undefined, index: number): boolean => index === 0 || puzzleStarsAt(p, index - 1) > 0;
/** The first puzzle of the path still waiting to be solved (the path's end when all are). */
export const nextPuzzle = (p: PuzzleProgress | undefined): number => {
  for (let i = 0; i < PUZZLE_COUNT; i++) if (puzzleStarsAt(p, i) === 0) return i;
  return PUZZLE_COUNT - 1;
};
export const dailyPuzzleStars = (p: PuzzleProgress | undefined, date: string): number => (p?.daily?.date === date ? p.daily.stars : 0);

export type PuzzleTarget = { kind: 'path'; index: number } | { kind: 'daily'; date: string };

/** The progress after solving a puzzle with `stars`, and the embers it pays (only what is new). */
export function withPuzzleResult(p: PuzzleProgress | undefined, target: PuzzleTarget, stars: number): { progress: PuzzleProgress; embers: number } {
  const base = p ?? EMPTY_PUZZLES;
  const got = starOf(stars);
  if (got === 0) return { progress: base, embers: 0 };
  if (target.kind === 'path') {
    const index = Math.trunc(target.index);
    if (index < 0 || index >= PUZZLE_COUNT) return { progress: base, embers: 0 };
    const before = puzzleStarsAt(base, index);
    if (got <= before) return { progress: base, embers: 0 };
    const next = Array.from({ length: Math.max(base.stars.length, index + 1) }, (_, i) => base.stars[i] ?? 0);
    next[index] = got;
    return { progress: { ...base, stars: next }, embers: (got - before) * EMBERS_PER_STAR };
  }
  const before = dailyPuzzleStars(base, target.date);
  const first = base.daily?.date !== target.date;
  if (!first && got <= before) return { progress: base, embers: 0 };
  return {
    progress: { ...base, daily: { date: target.date, stars: Math.max(got, before) }, dailySolved: base.dailySolved + (first ? 1 : 0) },
    embers: first ? DAILY_PUZZLE_EMBERS : 0,
  };
}
