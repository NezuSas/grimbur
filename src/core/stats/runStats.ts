import { previousDayKey } from '../engine/seed';
import { MAX_ASCENSION, clampAscension } from '../engine/ascension';
import { UPGRADES, embersFor } from './forge';
import { HERO_COUNT } from './achievements';

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
  /** Expeditions won (the Wumpus slain). */
  victories: number;
  /** Gems collected over all runs. */
  totalGems: number;
  /** Embers (Forge currency) available to spend. */
  embers: number;
  /** Forge upgrade levels: id -> level. */
  forge: Record<string, number>;
  /** Highest depth (ascension) the player may choose; 0 until the first victory. */
  maxAscension: number;
  /** Hero indices the player has played with. */
  heroesUsed: number[];
  /** Unlocked achievements: id -> UTC day (`YYYY-MM-DD`) it was earned. */
  achievements: Record<string, string>;
  /** Today's daily-challenge progress (only the most recent day is kept). */
  daily: DailyProgress | null;
  /** Consecutive days with at least one daily-challenge run. */
  streak: number;
  lastDailyDate: string | null;
}

export interface RunResult {
  score: number;
  level: number;
  /** True when the run ended by slaying the Wumpus. */
  victory?: boolean;
  /** Gems collected in the run. */
  gems?: number;
  /** Relics held at the end of the run. */
  relics?: number;
  /** Run duration in seconds. */
  time?: number;
  /** Hero played. */
  heroIndex?: number;
  /** Depth (ascension) the run was played at. */
  ascension?: number;
  /** False for a run abandoned before doing anything (earns no embers). */
  progressed?: boolean;
}

export const EMPTY_STATS: LocalStats = {
  bestScore: 0,
  bestLevel: 0,
  gamesPlayed: 0,
  victories: 0,
  totalGems: 0,
  embers: 0,
  forge: {},
  maxAscension: 0,
  heroesUsed: [],
  achievements: {},
  daily: null,
  streak: 0,
  lastDailyDate: null,
};

/** Fields shared by every finished run: lifetime gems and the heroes tried. */
function accumulate(stats: LocalStats, run: RunResult) {
  const heroesUsed =
    run.heroIndex !== undefined && !stats.heroesUsed.includes(run.heroIndex)
      ? [...stats.heroesUsed, run.heroIndex].sort((a, b) => a - b)
      : stats.heroesUsed;
  const progressed = run.progressed ?? true;
  return {
    totalGems: stats.totalGems + (run.gems ?? 0),
    heroesUsed,
    embers: stats.embers + embersFor(run, progressed, stats.forge.fortune ?? 0),
  };
}

/** Winning at a depth unlocks the next one (never lowers what was already unlocked). */
function unlockedDepth(stats: LocalStats, run: RunResult): number {
  if (!run.victory) return stats.maxAscension;
  return Math.max(stats.maxAscension, Math.min(MAX_ASCENSION, clampAscension(run.ascension ?? 0) + 1));
}

/** Folds a finished expedition run into the stored stats. Pure, so it is easy to test. */
export function mergeRun(stats: LocalStats, run: RunResult) {
  const isNewBestScore = run.score > stats.bestScore;
  const next: LocalStats = {
    ...stats,
    ...accumulate(stats, run),
    maxAscension: unlockedDepth(stats, run),
    bestScore: Math.max(stats.bestScore, run.score),
    bestLevel: Math.max(stats.bestLevel, run.level),
    gamesPlayed: stats.gamesPlayed + 1,
    victories: stats.victories + (run.victory ? 1 : 0),
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

  // A device clock set backwards must not reset the streak or move the last-played day back in time.
  const clockWentBack = stats.lastDailyDate !== null && stats.lastDailyDate > dateKey;
  let streak = stats.streak;
  if (!clockWentBack && stats.lastDailyDate !== dateKey) {
    streak = stats.lastDailyDate === previousDayKey(dateKey) ? stats.streak + 1 : 1;
  }

  return {
    stats: {
      ...stats,
      ...accumulate(stats, run),
      daily,
      streak,
      lastDailyDate: clockWentBack ? stats.lastDailyDate : dateKey,
      // Daily runs count towards hero unlocks (depth and victories) and games played. They never unlock a
      // new depth: depths belong to expeditions (the daily is always depth 0).
      bestLevel: Math.max(stats.bestLevel, run.level),
      gamesPlayed: stats.gamesPlayed + 1,
      victories: stats.victories + (run.victory ? 1 : 0),
    } as LocalStats,
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

function parseForge(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, number> = {};
  for (const upgrade of UPGRADES) {
    const level = (value as Record<string, unknown>)[upgrade.id];
    if (typeof level === 'number' && Number.isInteger(level) && level > 0) {
      out[upgrade.id] = Math.min(level, upgrade.costs.length);
    }
  }
  return out;
}

function parseAchievements(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [id, day] of Object.entries(value as Record<string, unknown>)) {
    if (typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)) out[id] = day;
  }
  return out;
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
      victories: num(data.victories),
      totalGems: num(data.totalGems),
      maxAscension: Math.min(MAX_ASCENSION, Math.trunc(num(data.maxAscension))),
      embers: Math.trunc(num(data.embers)),
      forge: parseForge(data.forge),
      heroesUsed: Array.isArray(data.heroesUsed)
        ? [...new Set<number>(data.heroesUsed.filter((v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < HERO_COUNT))].sort((a, b) => a - b)
        : [],
      achievements: parseAchievements(data.achievements),
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
