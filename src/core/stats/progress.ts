import type { RunRecord } from './runStats';

export type Trend = 'up' | 'flat' | 'down';

/** The latest `count` runs that count for the score chart (the endless descent is measured in floors, not points). */
export const chartRuns = (history: readonly RunRecord[], count = 14): RunRecord[] =>
  history.filter(r => r.mode !== 'endless').slice(-count);

/**
 * Compares the average score of the more recent half of the runs with the earlier half.
 * Needs at least six runs, otherwise it is too early to say anything.
 */
export function trendOf(runs: readonly RunRecord[]): Trend | null {
  if (runs.length < 6) return null;
  const half = Math.floor(runs.length / 2);
  const avg = (rs: readonly RunRecord[]) => rs.reduce((sum, r) => sum + r.score, 0) / rs.length;
  const before = avg(runs.slice(0, half));
  const after = avg(runs.slice(runs.length - half));
  if (before <= 0) return after > 0 ? 'up' : 'flat';
  const change = (after - before) / before;
  return change > 0.1 ? 'up' : change < -0.1 ? 'down' : 'flat';
}
