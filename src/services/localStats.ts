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

const STORAGE_KEY = 'wumpus.stats.v1';

export async function getLocalStats(): Promise<LocalStats> {
  return parseStats(await AsyncStorage.getItem(STORAGE_KEY));
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
}

/** Persists a finished expedition run and reports whether it beat the previous best score. */
export const recordRun = (run: RunResult) => serialized(() => recordRunNow(run));
async function recordRunNow(run: RunResult) {
  const before = await getLocalStats();
  const day = run.day ?? dailyKey();
  const merged = mergeRun(before, { ...run, day });
  const achievements = newAchievements(merged.stats, run);
  const stats = withAchievements(merged.stats, achievements, day);
  await save(stats);
  const payout = addAchievementEmbers(merged.payout, rewardFor(achievements));
  return {
    stats,
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
  const stats = withAchievements(merged.stats, achievements, key);
  await save(stats);
  const payout = addAchievementEmbers(merged.payout, rewardFor(achievements));
  const status = streakStatus(stats, key);
  const unlocks = newUnlocks(before, stats);
  return {
    stats,
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

/** Deletes everything stored on the device: progress, embers, achievements and records. */
export async function resetLocalStats(): Promise<void> {
  await serialized(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
  });
}

/** Replaces the saved progress with already-validated stats (a restored backup). */
export const replaceLocalStats = (stats: LocalStats): Promise<void> => serialized(() => save(stats));
