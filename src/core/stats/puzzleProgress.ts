import { PUZZLE_COUNT } from '../puzzles/puzzles';
import { daysBetween, previousDayKey } from '../engine/seed';
import { YULE_GIFT_EMBERS, isYuleDay } from '../events/yule';

/** What the player has done with the cave's puzzles. */
export interface PuzzleProgress {
  /** Best stars (0..3) of each numbered puzzle of the path, in order. */
  stars: number[];
  /** The latest daily puzzle solved and its best stars. */
  daily: { date: string; stars: number } | null;
  /** Daily puzzles solved over all days. */
  dailySolved: number;
  /** Days in a row with the day's puzzle solved (as of `daily.date`), and the longest such run. */
  streak: number;
  bestStreak: number;
  /** Endless puzzles (open once the path is done): how many solved, and the run of three-star solves in a row (now and best). */
  endless: { solved: number; run: number; bestRun: number };
}

export const EMPTY_PUZZLES: PuzzleProgress = { stars: [], daily: null, dailySolved: 0, streak: 0, bestStreak: 0, endless: { solved: 0, run: 0, bestRun: 0 } };
/** Embers an endless puzzle pays per star (less than the path: it never ends). */
export const ENDLESS_EMBERS_PER_STAR = 2;

/** The first day of the puzzle of the day: it numbers them (#1 that day) for sharing. */
export const PUZZLE_EPOCH = '2026-11-01';
export const dailyPuzzleNumber = (date: string): number => Math.max(1, daysBetween(PUZZLE_EPOCH, date) + 1);

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
  const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0);
  const n = count(r.dailySolved);
  // Saves from before the streak start it at the last day solved.
  const streak = daily ? Math.max(1, count(r.streak)) : 0;
  const e = (r.endless && typeof r.endless === 'object' ? r.endless : {}) as Record<string, unknown>;
  const run = count(e.run);
  const endless = { solved: count(e.solved), run, bestRun: Math.max(run, count(e.bestRun)) };
  return { stars, daily, dailySolved: n, streak, bestStreak: Math.max(streak, count(r.bestStreak)), endless };
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
/** The streak that still stands on `today`: solved today or yesterday keeps it, a missed day ends it. */
export const dailyPuzzleStreak = (p: PuzzleProgress | undefined, today: string): number => {
  if (!p?.daily) return 0;
  return p.daily.date === today || p.daily.date === previousDayKey(today) ? p.streak : 0;
};

export type PuzzleTarget = { kind: 'path'; index: number } | { kind: 'daily'; date: string } | { kind: 'endless'; n: number };
/** Endless puzzles open once every puzzle of the path is solved. */
export const isEndlessOpen = (p: PuzzleProgress | undefined): boolean => puzzlesSolved(p) >= PUZZLE_COUNT;

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
  if (target.kind === 'endless') {
    // Only the next one counts (a stale screen solving an old number pays nothing).
    if (Math.trunc(target.n) !== base.endless.solved) return { progress: base, embers: 0 };
    const run = got === MAX_STARS ? base.endless.run + 1 : 0;
    return {
      progress: { ...base, endless: { solved: base.endless.solved + 1, run, bestRun: Math.max(base.endless.bestRun, run) } },
      embers: got * ENDLESS_EMBERS_PER_STAR,
    };
  }
  const before = dailyPuzzleStars(base, target.date);
  const first = base.daily?.date !== target.date;
  if (!first && got <= before) return { progress: base, embers: 0 };
  return {
    progress: (() => {
      const streak = first ? (base.daily?.date === previousDayKey(target.date) ? base.streak + 1 : 1) : base.streak;
      return { ...base, daily: { date: target.date, stars: Math.max(got, before) }, dailySolved: base.dailySolved + (first ? 1 : 0), streak, bestStreak: Math.max(base.bestStreak, streak) };
    })(),
    // During Christmas in the cave the first solve of the day also carries a gift.
    embers: first ? DAILY_PUZZLE_EMBERS + (isYuleDay(target.date) ? YULE_GIFT_EMBERS : 0) : 0,
  };
}
