import { previousDayKey } from '../engine/seed';

export interface DailyProgress {
  /** UTC day (`YYYY-MM-DD`) this progress belongs to. */
  date: string;
  bestScore: number;
  bestLevel: number;
  attempts: number;
}

export interface LocalStats {
  bestScore: number;
  bestLevel: number;
  gamesPlayed: number;
  /** Today's daily-challenge progress (only the most recent day is kept). */
  daily: DailyProgress | null;
  /** Consecutive days with at least one daily-challenge run. */
  streak: number;
  lastDailyDate: string | null;
}

export interface RunResult {
  score: number;
  level: number;
}

export const EMPTY_STATS: LocalStats = {
  bestScore: 0,
  bestLevel: 0,
  gamesPlayed: 0,
  daily: null,
  streak: 0,
  lastDailyDate: null,
};

/** Folds a finished expedition run into the stored stats. Pure, so it is easy to test. */
export function mergeRun(stats: LocalStats, run: RunResult) {
  const isNewBestScore = run.score > stats.bestScore;
  const next: LocalStats = {
    ...stats,
    bestScore: Math.max(stats.bestScore, run.score),
    bestLevel: Math.max(stats.bestLevel, run.level),
    gamesPlayed: stats.gamesPlayed + 1,
  };
  return { stats: next, isNewBestScore };
}

/** Folds a finished daily-challenge run (played on `dateKey`) into the stored stats. */
export function mergeDailyRun(stats: LocalStats, dateKey: string, run: RunResult) {
  const sameDay = stats.daily?.date === dateKey;
  const before: DailyProgress = sameDay && stats.daily
    ? stats.daily
    : { date: dateKey, bestScore: 0, bestLevel: 0, attempts: 0 };

  const isNewDailyBest = run.score > before.bestScore;
  const daily: DailyProgress = {
    date: dateKey,
    bestScore: Math.max(before.bestScore, run.score),
    bestLevel: Math.max(before.bestLevel, run.level),
    attempts: before.attempts + 1,
  };

  let streak = stats.streak;
  if (stats.lastDailyDate !== dateKey) {
    streak = stats.lastDailyDate === previousDayKey(dateKey) ? stats.streak + 1 : 1;
  }

  return {
    stats: { ...stats, daily, streak, lastDailyDate: dateKey } as LocalStats,
    isNewDailyBest,
  };
}

/**
 * The streak to display on `todayKey`: it is still alive if the last daily run
 * was today or yesterday, otherwise it has been broken.
 */
export function currentStreak(stats: LocalStats, todayKey: string): number {
  if (!stats.lastDailyDate) return 0;
  const alive = stats.lastDailyDate === todayKey || stats.lastDailyDate === previousDayKey(todayKey);
  return alive ? stats.streak : 0;
}

/** Defensive parse for whatever was persisted (corrupt or older data included). */
export function parseStats(raw: string | null): LocalStats {
  if (!raw) return EMPTY_STATS;
  try {
    const data = JSON.parse(raw);
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
    const str = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

    const d = data.daily;
    const dailyDate = d ? str(d.date) : null;
    return {
      bestScore: num(data.bestScore),
      bestLevel: num(data.bestLevel),
      gamesPlayed: num(data.gamesPlayed),
      daily: dailyDate
        ? { date: dailyDate, bestScore: num(d.bestScore), bestLevel: num(d.bestLevel), attempts: num(d.attempts) }
        : null,
      streak: num(data.streak),
      lastDailyDate: str(data.lastDailyDate),
    };
  } catch {
    return EMPTY_STATS;
  }
}
