import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LocalStats,
  RunResult,
  addAchievementEmbers,
  mergeDailyRun,
  mergeRun,
  parseStats,
  streakStatus,
} from '../core/stats/runStats';
import { dailyKey } from '../core/engine/seed';
import { newUnlocks } from '../core/stats/unlocks';
import { nextGoals, newlyAffordable } from '../core/stats/goals';
import { AchievementId, newAchievements, rewardFor, withAchievements } from '../core/stats/achievements';
import { UpgradeId, purchase } from '../core/stats/forge';
import { buySkin, claimUnlockedSkins, equipSkin } from '../core/skins/ownership';
import { applyRun as applyMissionRun, claim as claimMission, syncMissions } from '../core/stats/missions';
import { rankUp } from '../core/stats/rank';
import type { SkinId } from '../core/skins/skins';

const STORAGE_KEY = 'wumpus.stats.v1';

/** The last stats read or written, kept in memory so a screen can draw its first frame with real data. */
let latest: LocalStats | null = null;

/** The stats as they are right now, if they have been read this session (the splash screen reads them). */
export const peekLocalStats = (): LocalStats | null => latest;

export async function getLocalStats(): Promise<LocalStats> {
  latest = parseStats(await AsyncStorage.getItem(STORAGE_KEY));
  return latest;
}

/**
 * Every read-modify-write goes through this queue, one at a time. Without it, two overlapping updates
 * (the end-of-run save and a quick Forge purchase) would both read the same old stats and the later
 * write would silently erase the earlier one.
 */
let writeQueue: Promise<unknown> = Promise.resolve();
function serialized<T>(work: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(work, work);
  writeQueue = result.catch(() => undefined);
  return result;
}

async function save(stats: LocalStats) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  latest = stats;
}

/** Feeds a finished run to the missions of its day (a new day or week replaces the old ones first). */
function withMissions(stats: LocalStats, run: RunResult, day: string): { stats: LocalStats; done: string[] } {
  if (run.progressed === false) return { stats, done: [] };
  const applied = applyMissionRun(syncMissions(stats.missions, day), run);
  return { stats: { ...stats, missions: applied.state }, done: applied.done };
}

/** The missions of today (rolled over when the day or week changed), saved. Used by the screens that show them. */
export const getMissions = (day: string = dailyKey()): Promise<LocalStats> =>
  serialized(async () => {
    const before = await getLocalStats();
    const synced = syncMissions(before.missions, day);
    if (synced === before.missions) return before;
    const stats = { ...before, missions: synced };
    await save(stats);
    return stats;
  });

/** Claims a mission reward (or the daily bonus with the id `bonus`) and pays its embers. Resolves with the new stats, or null. */
export const claimMissionReward = (id: string): Promise<LocalStats | null> =>
  serialized(async () => {
    const before = await getLocalStats();
    const result = claimMission(before.missions, id);
    if (result.embers <= 0) return null;
    const stats = { ...before, missions: result.state, embers: before.embers + result.embers, lifetimeEmbers: before.lifetimeEmbers + result.embers };
    await save(stats);
    return stats;
  });

/** Persists a finished expedition run and reports whether it beat the previous best score. */
export const recordRun = (run: RunResult) => serialized(() => recordRunNow(run));
async function recordRunNow(run: RunResult) {
  const before = await getLocalStats();
  const day = run.day ?? dailyKey();
  const merged = mergeRun(before, { ...run, day });
  const achievements = newAchievements(merged.stats, run);
  const claim = claimUnlockedSkins(withAchievements(merged.stats, achievements, day));
  const missioned = withMissions(claim.stats, run, day);
  const stats = missioned.stats;
  await save(stats);
  const payout = addAchievementEmbers(merged.payout, rewardFor(achievements));
  return {
    stats,
    missionsDone: missioned.done,
    /** The new rank when this run raised it. */
    rankUp: rankUp(before.lifetimeEmbers, stats.lifetimeEmbers),
    /** Skins unlocked by playing (their goal was just met). */
    newSkins: claim.claimed,
    isNewBestScore: merged.isNewBestScore,
    unlocks: newUnlocks(before, stats),
    /** Hero indices unlocked by the run (kept for callers that only care about heroes). */
    unlocked: newUnlocks(before, stats).heroes,
    achievements,
    /** Where the embers came from; `payout.total` is everything the run added to the balance (shown once). */
    payout,
    embers: payout.total,
    bonus: payout.daily,
    affordableNow: newlyAffordable(before, stats),
    goals: nextGoals(stats, 2),
  };
}

/** Persists a finished daily-challenge run for the given local day (default: today). */
export const recordDailyRun = (run: RunResult, key: string = dailyKey()) => serialized(() => recordDailyRunNow(run, key));
async function recordDailyRunNow(run: RunResult, key: string) {
  const before = await getLocalStats();
  const merged = mergeDailyRun(before, key, { ...run, mode: 'daily', day: run.day ?? key });
  const achievements = newAchievements(merged.stats, run);
  const claim = claimUnlockedSkins(withAchievements(merged.stats, achievements, key));
  const missioned = withMissions(claim.stats, { ...run, mode: 'daily' }, key);
  const stats = missioned.stats;
  await save(stats);
  const payout = addAchievementEmbers(merged.payout, rewardFor(achievements));
  const status = streakStatus(stats, key);
  const unlocks = newUnlocks(before, stats);
  return {
    stats,
    missionsDone: missioned.done,
    rankUp: rankUp(before.lifetimeEmbers, stats.lifetimeEmbers),
    newSkins: claim.claimed,
    achievements,
    payout,
    embers: payout.total,
    bonus: payout.daily,
    unlocks,
    unlocked: unlocks.heroes,
    isNewDailyBest: merged.isNewDailyBest,
    dailyBest: stats.daily?.bestScore ?? 0,
    streak: status.current,
    bestStreak: status.best,
    /** Length of the streak this run found broken (0 when it was alive). */
    streakLost: merged.streakEvent.lost,
    freezeUsed: merged.streakEvent.freezeUsed,
    freezeEarned: merged.streakEvent.freezeEarned,
    affordableNow: newlyAffordable(before, stats),
    goals: nextGoals(stats, 2),
  };
}

/**
 * Unlocks the achievements the stored numbers already satisfy. They are normally evaluated when a run ends or something is
 * bought, so one that was added later (or whose number was reached by a restored backup) would show a full bar and stay
 * locked until the next run. Resolves with the achievements it just unlocked (their embers are paid).
 */
export const syncAchievements = (): Promise<{ stats: LocalStats; achievements: AchievementId[] }> =>
  serialized(async () => {
    const before = await getLocalStats();
    const achievements = newAchievements(before, { score: 0, level: 1 });
    if (achievements.length === 0) return { stats: before, achievements };
    const stats = claimUnlockedSkins(withAchievements(before, achievements, dailyKey())).stats;
    await save(stats);
    return { stats, achievements };
  });

/**
 * Buys the next level of a Forge upgrade and evaluates the achievements it may complete (first_forge, smith...).
 * Resolves with the new stats and the achievements earned, or null when it cannot be bought.
 */
export const buyUpgrade = (id: UpgradeId): Promise<{ stats: LocalStats; achievements: AchievementId[] } | null> =>
  serialized(async () => {
    const bought = purchase(await getLocalStats(), id);
    if (!bought) return null;
    const achievements = newAchievements(bought, { score: 0, level: 1 });
    const stats = withAchievements(bought, achievements, dailyKey());
    await save(stats);
    return { stats, achievements };
  });

/** Buys a hero skin with embers; resolves with the new stats, or null when it cannot be bought. */
export const buySkinFor = (hero: number, skin: SkinId): Promise<LocalStats | null> =>
  serialized(async () => {
    const stats = buySkin(await getLocalStats(), hero, skin);
    if (!stats) return null;
    await save(stats);
    return stats;
  });

/** Wears an owned skin; resolves with the new stats, or null when the skin is not owned. */
export const equipSkinFor = (hero: number, skin: SkinId): Promise<LocalStats | null> =>
  serialized(async () => {
    const stats = equipSkin(await getLocalStats(), hero, skin);
    if (!stats) return null;
    await save(stats);
    return stats;
  });

/** Deletes everything stored on the device: progress, embers, achievements and records. */
export async function resetLocalStats(): Promise<void> {
  await serialized(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
  });
}

/** Replaces the saved progress with already-validated stats (a restored backup). */
export const replaceLocalStats = (stats: LocalStats): Promise<void> => serialized(() => save(stats));
