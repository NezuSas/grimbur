import { RELICS, type RelicId } from '../engine/relics';
import type { GameState } from '../engine/types';

/**
 * What a finished run leaves behind beyond its score: the last floor as it looked when the run ended (for the history), the
 * relics it picked (for the relic book) and the best of the week's event. Pure helpers, kept apart from runStats.ts.
 */

/** The last floor of a run, small enough to keep for every run in the history. */
export interface RunBoard {
  rows: number;
  cols: number;
  /** Where the hero stood (or fell). */
  player: number;
  /** The tiles stepped on, in the order they were first reached. */
  visited: number[];
  /** What lay on the floor: [tile, kind] (a lieutenant is `brute`). */
  things: [number, string][];
}

const MAX_CELLS = 400;

/** The board of a state, as a history keeps it. */
export function snapshotBoard(s: Pick<GameState, 'rows' | 'cols' | 'playerIndex' | 'visited' | 'entities'>): RunBoard {
  return {
    rows: s.rows,
    cols: s.cols,
    player: s.playerIndex,
    visited: [...s.visited],
    things: s.entities.map(e => [e.index, e.type === 'boss' && (e as { warden?: boolean }).warden ? 'warden' : e.type === 'boss' && (e as { mini?: boolean }).mini ? 'brute' : e.type] as [number, string]),
  };
}

const isTile = (v: unknown, cells: number): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < cells;

export function parseRunBoard(raw: unknown): RunBoard | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const rows = r.rows, cols = r.cols;
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || (rows as number) < 1 || (cols as number) < 1) return undefined;
  const cells = (rows as number) * (cols as number);
  if (cells > MAX_CELLS || !isTile(r.player, cells)) return undefined;
  const visited = Array.isArray(r.visited) ? r.visited.filter(v => isTile(v, cells)) : [];
  const things = Array.isArray(r.things)
    ? r.things.filter((t): t is [number, string] => Array.isArray(t) && isTile(t[0], cells) && typeof t[1] === 'string' && t[1].length <= 16)
    : [];
  return { rows: rows as number, cols: cols as number, player: r.player as number, visited, things };
}

// ── The relic book ─────────────────────────────────────────────────────────────────────────────────────────────

/** Every relic ever picked: how many times, and in how many won runs. */
export interface RelicBook {
  picks: Partial<Record<RelicId, number>>;
  wins: Partial<Record<RelicId, number>>;
}

export const EMPTY_RELIC_BOOK: RelicBook = { picks: {}, wins: {} };

const isRelic = (v: unknown): v is RelicId => typeof v === 'string' && Object.prototype.hasOwnProperty.call(RELICS, v);

/** A finished run's picks added to the book: each relic counts once per run however many copies were taken. */
export function addRunRelics(book: RelicBook, relics: readonly string[] | undefined, victory: boolean): RelicBook {
  const ids = [...new Set((relics ?? []).filter(isRelic))];
  if (ids.length === 0) return book;
  const picks = { ...book.picks };
  const wins = { ...book.wins };
  for (const id of ids) {
    picks[id] = (picks[id] ?? 0) + 1;
    if (victory) wins[id] = (wins[id] ?? 0) + 1;
  }
  return { picks, wins };
}

export function parseRelicBook(raw: unknown): RelicBook {
  if (!raw || typeof raw !== 'object') return EMPTY_RELIC_BOOK;
  const r = raw as { picks?: unknown; wins?: unknown };
  const counts = (v: unknown) => {
    const out: Partial<Record<RelicId, number>> = {};
    if (v && typeof v === 'object') {
      for (const [k, n] of Object.entries(v as Record<string, unknown>)) {
        if (isRelic(k) && typeof n === 'number' && Number.isFinite(n) && n > 0) out[k] = Math.trunc(n);
      }
    }
    return out;
  };
  const picks = counts(r.picks);
  const wins = counts(r.wins);
  // A win with a relic is also a pick of it.
  for (const [k, n] of Object.entries(wins) as [RelicId, number][]) picks[k] = Math.max(picks[k] ?? 0, n);
  return { picks, wins };
}

// ── The week's event ───────────────────────────────────────────────────────────────────────────────────────────

/** The best expedition run played under this week's event. */
export interface EventBest {
  week: string;
  event: string;
  score: number;
  level: number;
}

export function parseEventBest(raw: unknown): EventBest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.week !== 'string' || typeof r.event !== 'string') return null;
  const score = typeof r.score === 'number' && Number.isFinite(r.score) ? Math.max(0, Math.trunc(r.score)) : 0;
  const level = typeof r.level === 'number' && Number.isFinite(r.level) ? Math.max(1, Math.trunc(r.level)) : 1;
  return { week: r.week, event: r.event, score, level };
}

/** A run under an event folded into the week's best (a new week starts over). */
export function addEventRun(best: EventBest | null, week: string, event: string, score: number, level: number): EventBest {
  if (!best || best.week !== week || best.event !== event) return { week, event, score, level };
  return score > best.score ? { week, event, score, level } : best;
}
