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

/** Share of runs that ended in a victory (0 when nothing has been played). Uses the lifetime counters, so it is exact. */
export const winRate = (victories: number, gamesPlayed: number): number =>
  gamesPlayed > 0 ? Math.round((Math.min(victories, gamesPlayed) / gamesPlayed) * 100) : 0;

/** The last `days` calendar days (day keys, no time zones) ending at `today`, oldest first, each marked when a stored run was played that day. */
export function playedDays(history: readonly RunRecord[], today: string, days = 14): { day: string; played: boolean }[] {
  const played = new Set(history.map(r => r.day));
  const out: { day: string; played: boolean }[] = [];
  const base = new Date(`${today}T00:00:00Z`);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, played: played.has(key) });
  }
  return out;
}

/** The newest `count` runs, newest first, each flagged when it is the best score of those stored. */
export function recentList(history: readonly RunRecord[], count = 8): (RunRecord & { best: boolean })[] {
  const scored = history.filter(r => r.mode !== 'endless');
  const top = Math.max(0, ...scored.map(r => r.score));
  return history
    .slice(-count)
    .reverse()
    .map(r => ({ ...r, best: r.mode !== 'endless' && r.score > 0 && r.score === top }));
}
