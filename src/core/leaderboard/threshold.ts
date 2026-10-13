/**
 * Pure helpers for the "does this score make the top 10?" check, kept free of Firebase so they can be tested.
 */

export interface Threshold {
  /** How many scores the board currently holds (max 10). */
  count: number;
  minScore: number;
  /** Time of the 10th place; ties on score are broken by the faster run. */
  maxTime: number;
}

export interface ScoreLike {
  score: number;
  time?: number | null;
}

/** Time used for legacy rows that lack a `time` field: they lose every tie. */
export const NO_TIME = 999999;

export const timeOf = (row: ScoreLike): number =>
  row.time !== undefined && row.time !== null ? row.time : NO_TIME;

/** Orders rows by score (desc) then time (asc). Does not mutate the input. */
export function rankRows<T extends ScoreLike>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => (a.score !== b.score ? b.score - a.score : timeOf(a) - timeOf(b)));
}

/** Derives the entry threshold from the (already ranked) top-10 rows. */
export function thresholdFromTop10(top10: readonly ScoreLike[]): Threshold {
  if (top10.length < 10) return { count: top10.length, minScore: 0, maxTime: NO_TIME };
  const tenth = top10[9];
  return { count: 10, minScore: tenth.score, maxTime: timeOf(tenth) };
}

/** True when a run with `score`/`time` would enter the board described by `threshold`. */
export function qualifies(threshold: Threshold, score: number, time: number): boolean {
  if (threshold.count < 10) return true;
  if (score > threshold.minScore) return true;
  return score === threshold.minScore && time < threshold.maxTime;
}
