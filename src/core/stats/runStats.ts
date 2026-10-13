export interface LocalStats {
  bestScore: number;
  bestLevel: number;
  gamesPlayed: number;
}

export interface RunResult {
  score: number;
  level: number;
}

export const EMPTY_STATS: LocalStats = { bestScore: 0, bestLevel: 0, gamesPlayed: 0 };

/** Folds a finished run into the stored stats. Pure, so it is easy to test. */
export function mergeRun(stats: LocalStats, run: RunResult) {
  const isNewBestScore = run.score > stats.bestScore;
  const next: LocalStats = {
    bestScore: Math.max(stats.bestScore, run.score),
    bestLevel: Math.max(stats.bestLevel, run.level),
    gamesPlayed: stats.gamesPlayed + 1,
  };
  return { stats: next, isNewBestScore };
}

/** Defensive parse for whatever was persisted (corrupt or older data included). */
export function parseStats(raw: string | null): LocalStats {
  if (!raw) return EMPTY_STATS;
  try {
    const data = JSON.parse(raw);
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
    return { bestScore: num(data.bestScore), bestLevel: num(data.bestLevel), gamesPlayed: num(data.gamesPlayed) };
  } catch {
    return EMPTY_STATS;
  }
}
