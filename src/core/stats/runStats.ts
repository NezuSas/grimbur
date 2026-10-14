import { daysBetween } from '../engine/seed';
import { MAX_ASCENSION, clampAscension } from '../engine/ascension';
import { UPGRADES, dailyBonus, embersFor, milestoneEmbers } from './forge';
import { HERO_COUNT } from './achievements';
import { SKINS_BY_HERO, SkinId, isSkinId, skinKey } from '../skins/skins';

export interface DailyProgress {
  /** Local day (`YYYY-MM-DD`) this progress belongs to. */
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
  /** Unlocked achievements: id -> local day (`YYYY-MM-DD`) it was earned. */
  achievements: Record<string, string>;
  /** Today's daily-challenge progress (only the most recent day is kept). */
  daily: DailyProgress | null;
  /** Consecutive days with at least one daily-challenge run. */
  streak: number;
  lastDailyDate: string | null;
  /** The longest daily streak ever reached (the current one can be lost; this never goes down). */
  bestStreak: number;
  /** Streak freezes held (0..MAX_FREEZES): one missed day is forgiven and the streak survives. */
  freezes: number;
  /** The local day of the last finished run (any mode): a long absence pays the welcome-back gift. */
  lastPlayedDate: string | null;
  /** Deepest floor reached in the endless descent (0 until it is played). */
  bestEndlessFloor: number;
  /** Every ember ever earned (the balance goes down when spending; this never does). */
  lifetimeEmbers: number;
  /** Expeditions and dailies won with each hero (same order as the roster). */
  heroWins: number[];
  /** Daily challenges played and won. */
  dailyRuns: number;
  dailyWins: number;
  /** The local day on which the daily bonus was last paid. */
  lastBonusDate: string | null;
  /** The most recent runs, oldest first. */
  history: RunRecord[];
  /** Deepest depth (ascension) won in an expedition with each hero (0 when none). */
  heroBestDepth: number[];
  /** Hero outfits: `owned` holds `heroIndex:skinId` keys (classic is implicit); `equipped` maps hero index to skin. */
  skins: { owned: string[]; equipped: Record<string, SkinId> };
}

/** One finished run, kept for the progress chart (the latest HISTORY_LIMIT are stored). */
export interface RunRecord {
  day: string;
  score: number;
  level: number;
  victory: boolean;
  mode: 'expedition' | 'daily' | 'endless';
}

export const HISTORY_LIMIT = 30;
/** A freeze is earned every this many days of streak; at most MAX_FREEZES are held. */
export const FREEZE_EVERY_DAYS = 7;
export const MAX_FREEZES = 2;
/** Days away after which the next run pays the welcome-back gift (its size is capped). */
export const WELCOME_BACK_DAYS = 3;
export const WELCOME_BACK_CAP = 100;

/** Where a finished run's embers came from. `total` is the whole amount the balance grew by (the caller adds the achievement rewards). */
export interface RunPayout {
  /** Floors and score (with Fortune). */
  run: number;
  /** One-time bonus for new deepest floors. */
  milestone: number;
  /** First run of the day. */
  daily: number;
  /** Gift for coming back after days away. */
  welcomeBack: number;
  /** Rewards of the achievements unlocked by the run (filled in by the caller, 0 here). */
  achievements: number;
  total: number;
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
  /** Mode of the run; the endless descent keeps its own record instead of the expedition ones. */
  mode?: 'expedition' | 'daily' | 'endless';
  /** Local day the run was played; the first finished run of each day also pays a bonus. */
  day?: string;
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
  bestStreak: 0,
  freezes: 0,
  lastPlayedDate: null,
  bestEndlessFloor: 0,
  lifetimeEmbers: 0,
  heroWins: Array.from({ length: HERO_COUNT }, () => 0),
  dailyRuns: 0,
  dailyWins: 0,
  lastBonusDate: null,
  history: [],
  heroBestDepth: Array.from({ length: HERO_COUNT }, () => 0),
  skins: { owned: [], equipped: {} },
};

/** Fields shared by every finished run: lifetime gems, the heroes tried and the embers paid (with their breakdown). */
function accumulate(stats: LocalStats, run: RunResult, milestone = 0) {
  const heroesUsed =
    run.heroIndex !== undefined && !stats.heroesUsed.includes(run.heroIndex)
      ? [...stats.heroesUsed, run.heroIndex].sort((a, b) => a - b)
      : stats.heroesUsed;
  const progressed = run.progressed ?? true;
  // The bonus is paid once per day and never again if the clock is moved back to an earlier day.
  const bonusDue = progressed && run.day !== undefined && (stats.lastBonusDate === null || run.day > stats.lastBonusDate);
  const runEmbers = embersFor(run, progressed, stats.forge.fortune ?? 0);
  const milestonePay = progressed ? milestone : 0;
  const daily = bonusDue ? dailyBonus(currentStreak(stats, run.day as string)) : 0;
  const away = progressed && run.day !== undefined && stats.lastPlayedDate !== null ? daysBetween(stats.lastPlayedDate, run.day) : 0;
  const welcomeBack = away >= WELCOME_BACK_DAYS ? Math.min(WELCOME_BACK_CAP, runEmbers) : 0;
  const total = runEmbers + milestonePay + daily + welcomeBack;
  const payout: RunPayout = { run: runEmbers, milestone: milestonePay, daily, welcomeBack, achievements: 0, total };
  const played = progressed && run.day !== undefined;
  const patch = {
    lastBonusDate: bonusDue ? (run.day as string) : stats.lastBonusDate,
    lastPlayedDate: played && (stats.lastPlayedDate === null || (run.day as string) > stats.lastPlayedDate) ? (run.day as string) : stats.lastPlayedDate,
    history: played
      ? [...stats.history, { day: run.day as string, score: Math.max(0, Math.trunc(run.score) || 0), level: Math.max(1, Math.trunc(run.level) || 1), victory: run.victory === true, mode: run.mode ?? 'expedition' } as RunRecord].slice(-HISTORY_LIMIT)
      : stats.history,
    totalGems: stats.totalGems + (run.gems ?? 0),
    heroesUsed,
    heroWins: stats.heroWins.map((n, i) => n + (run.victory && run.heroIndex === i ? 1 : 0)),
    heroBestDepth: stats.heroBestDepth.map((n, i) =>
      run.victory && run.heroIndex === i && (run.mode ?? 'expedition') === 'expedition' ? Math.max(n, clampAscension(run.ascension ?? 0)) : n),
    embers: stats.embers + total,
    lifetimeEmbers: stats.lifetimeEmbers + total,
  };
  return { patch, payout };
}

/** Winning at a depth unlocks the next one (never lowers what was already unlocked). */
function unlockedDepth(stats: LocalStats, run: RunResult): number {
  if (!run.victory) return stats.maxAscension;
  return Math.max(stats.maxAscension, Math.min(MAX_ASCENSION, clampAscension(run.ascension ?? 0) + 1));
}

/** A payout with the embers of newly unlocked achievements added (each ember counted once). */
export const addAchievementEmbers = (payout: RunPayout, embers: number): RunPayout => ({ ...payout, achievements: embers, total: payout.total + embers });

/** Folds a finished expedition run into the stored stats. Pure, so it is easy to test. */
export function mergeRun(stats: LocalStats, run: RunResult) {
  if (run.mode === 'endless') {
    // The endless descent has its own record; it never touches the expedition's best score, floor or victories.
    const { patch, payout } = accumulate(stats, run);
    const next: LocalStats = {
      ...stats,
      ...patch,
      bestEndlessFloor: Math.max(stats.bestEndlessFloor, run.level),
      gamesPlayed: stats.gamesPlayed + 1,
    };
    return { stats: next, isNewBestScore: run.level > stats.bestEndlessFloor, payout };
  }
  const isNewBestScore = run.score > stats.bestScore;
  const { patch, payout } = accumulate(stats, run, milestoneEmbers(stats.bestLevel, run.level));
  const next: LocalStats = {
    ...stats,
    ...patch,
    maxAscension: unlockedDepth(stats, run),
    bestScore: Math.max(stats.bestScore, run.score),
    bestLevel: Math.max(stats.bestLevel, run.level),
    gamesPlayed: stats.gamesPlayed + 1,
    victories: stats.victories + (run.victory ? 1 : 0),
  };
  return { stats: next, isNewBestScore, payout };
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

  // Streak maths. A device clock set backwards must not reset the streak or move the last-played day back in time.
  const gap = stats.lastDailyDate !== null ? daysBetween(stats.lastDailyDate, dateKey) : null;
  const clockWentBack = gap !== null && gap < 0;
  let streak = stats.streak;
  let freezes = stats.freezes;
  let freezeUsed = false;
  let freezeEarned = false;
  if (!clockWentBack && gap !== 0) {
    if (gap === 1) streak = stats.streak + 1;
    else if (gap === 2 && freezes > 0) {
      // Exactly one missed day and a freeze in the pocket: the streak survives.
      streak = stats.streak + 1;
      freezes -= 1;
      freezeUsed = true;
    } else streak = 1;
    if (streak > stats.streak && streak % FREEZE_EVERY_DAYS === 0 && freezes < MAX_FREEZES) {
      freezes += 1;
      freezeEarned = true;
    }
  }
  // A streak of one day is not worth mourning.
  const streakLost = gap !== null && gap > 1 && !freezeUsed && stats.streak > 1 ? stats.streak : 0;

  const { patch, payout } = accumulate(stats, { ...run, mode: 'daily' }, milestoneEmbers(stats.bestLevel, run.level));
  return {
    stats: {
      ...stats,
      ...patch,
      daily,
      dailyRuns: stats.dailyRuns + 1,
      dailyWins: stats.dailyWins + (run.victory ? 1 : 0),
      streak,
      freezes,
      bestStreak: Math.max(stats.bestStreak, streak),
      lastDailyDate: clockWentBack ? stats.lastDailyDate : dateKey,
      // Daily runs count towards hero unlocks (depth and victories) and games played. They never unlock a
      // new depth: depths belong to expeditions (the daily is always depth 0).
      bestLevel: Math.max(stats.bestLevel, run.level),
      gamesPlayed: stats.gamesPlayed + 1,
      victories: stats.victories + (run.victory ? 1 : 0),
    } as LocalStats,
    isNewDailyBest,
    payout,
    streakEvent: { lost: streakLost, freezeUsed, freezeEarned },
  };
}

/**
 * The streak to display on `todayKey`: it is still alive if the last daily run was today or yesterday (or the day
 * before with a freeze to spend), otherwise it has been broken and counts as 0. A clock moved back keeps it.
 */
export function currentStreak(stats: LocalStats, todayKey: string): number {
  if (!stats.lastDailyDate) return 0;
  const gap = daysBetween(stats.lastDailyDate, todayKey);
  const alive = gap <= 1 || (gap === 2 && stats.freezes > 0);
  return alive ? stats.streak : 0;
}

/** What the cover and the game over say about the streak on `todayKey`. */
export interface StreakStatus {
  current: number;
  /** Length of the streak that was just lost (0 when it is alive or there was none worth mourning). */
  lost: number;
  best: number;
  /** A run today is needed to extend the streak. */
  needsToday: boolean;
  /** The streak is only alive because a freeze will be spent on the next run. */
  freezeWillSave: boolean;
  freezes: number;
}

export function streakStatus(stats: LocalStats, todayKey: string): StreakStatus {
  const current = currentStreak(stats, todayKey);
  const gap = stats.lastDailyDate ? daysBetween(stats.lastDailyDate, todayKey) : null;
  return {
    current,
    lost: current === 0 && stats.streak > 1 && gap !== null ? stats.streak : 0,
    best: Math.max(stats.bestStreak, stats.streak),
    needsToday: current > 0 && gap !== null && gap >= 1,
    freezeWillSave: current > 0 && gap === 2,
    freezes: stats.freezes,
  };
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

function parseHistory(value: unknown): RunRecord[] {
  if (!Array.isArray(value)) return [];
  const out: RunRecord[] = [];
  for (const r of value) {
    if (!r || typeof r !== 'object') continue;
    const { day, score, level, victory, mode } = r as Record<string, unknown>;
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) continue;
    if (typeof level !== 'number' || !Number.isFinite(level) || level < 1) continue;
    out.push({ day, score: Math.trunc(score), level: Math.trunc(level), victory: victory === true, mode: mode === 'daily' || mode === 'endless' ? mode : 'expedition' });
  }
  return out.slice(-HISTORY_LIMIT);
}

function parseAchievements(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [id, day] of Object.entries(value as Record<string, unknown>)) {
    if (typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)) out[id] = day;
  }
  return out;
}

function parseSkins(value: unknown): LocalStats['skins'] {
  const out: LocalStats['skins'] = { owned: [], equipped: {} };
  if (!value || typeof value !== 'object') return out;
  const { owned, equipped } = value as Record<string, unknown>;
  const valid = (hero: number, skin: unknown): skin is SkinId =>
    isSkinId(skin) && skin !== 'classic' && (SKINS_BY_HERO[hero] ?? []).includes(skin);
  const keys = new Set<string>();
  if (Array.isArray(owned)) {
    for (const k of owned) {
      const m = typeof k === 'string' ? /^(\d{1,3}):([a-z]+)$/.exec(k) : null;
      if (m && valid(Number(m[1]), m[2])) keys.add(skinKey(Number(m[1]), m[2] as SkinId));
    }
  }
  out.owned = [...keys];
  if (equipped && typeof equipped === 'object' && !Array.isArray(equipped)) {
    for (const [h, skin] of Object.entries(equipped as Record<string, unknown>)) {
      if (/^\d{1,3}$/.test(h) && valid(Number(h), skin) && keys.has(skinKey(Number(h), skin))) out.equipped[String(Number(h))] = skin;
    }
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
      bestStreak: Math.max(Math.trunc(num(data.bestStreak)), Math.trunc(num(data.streak))),
      freezes: Math.min(MAX_FREEZES, Math.trunc(num(data.freezes))),
      // Older saves: the last bonus day is the best guess of when the player was last here.
      lastPlayedDate: str(data.lastPlayedDate) ?? str(data.lastBonusDate),
      bestEndlessFloor: Math.trunc(num(data.bestEndlessFloor)),
      lifetimeEmbers: Math.trunc(num(data.lifetimeEmbers)),
      heroWins: Array.from({ length: HERO_COUNT }, (_, i) => (Array.isArray(data.heroWins) ? Math.trunc(num(data.heroWins[i])) : 0)),
      dailyRuns: Math.trunc(num(data.dailyRuns)),
      dailyWins: Math.trunc(num(data.dailyWins)),
      lastBonusDate: str(data.lastBonusDate),
      history: parseHistory(data.history),
      heroBestDepth: Array.from({ length: HERO_COUNT }, (_, i) => (Array.isArray(data.heroBestDepth) ? Math.min(MAX_ASCENSION, Math.trunc(num(data.heroBestDepth[i]))) : 0)),
      skins: parseSkins(data.skins),
    };
  } catch {
    return EMPTY_STATS;
  }
}
