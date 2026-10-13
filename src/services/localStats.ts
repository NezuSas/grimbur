import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LocalStats,
  RunResult,
  currentStreak,
  mergeDailyRun,
  mergeRun,
  parseStats,
} from '../core/stats/runStats';
import { dailyKey } from '../core/engine/seed';
import { newlyUnlockedHeroes } from '../core/stats/heroUnlocks';
import { newAchievements, withAchievements } from '../core/stats/achievements';
import { UpgradeId, dailyBonus, purchase } from '../core/stats/forge';

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
  const merged = mergeRun(before, { ...run, day: run.day ?? dailyKey() });
  const achievements = newAchievements(merged.stats, run);
  const stats = withAchievements(merged.stats, achievements, dailyKey());
  await save(stats);
  return {
    stats,
    isNewBestScore: merged.isNewBestScore,
    unlocked: newlyUnlockedHeroes(before, stats),
    achievements,
    embers: stats.embers - before.embers,
    bonus: merged.stats.lastBonusDate !== before.lastBonusDate ? dailyBonus(before.streak) : 0,
  };
}

/** Persists a finished daily-challenge run for the given UTC day (default: today). */
export const recordDailyRun = (run: RunResult, key: string = dailyKey()) => serialized(() => recordDailyRunNow(run, key));
async function recordDailyRunNow(run: RunResult, key: string) {
  const before = await getLocalStats();
  const merged = mergeDailyRun(before, key, { ...run, day: run.day ?? key });
  const achievements = newAchievements(merged.stats, run);
  const stats = withAchievements(merged.stats, achievements, key);
  const isNewDailyBest = merged.isNewDailyBest;
  await save(stats);
  return {
    stats,
    achievements,
    embers: stats.embers - before.embers,
    unlocked: newlyUnlockedHeroes(before, stats),
    isNewDailyBest,
    bonus: merged.stats.lastBonusDate !== before.lastBonusDate ? dailyBonus(before.streak) : 0,
    dailyBest: stats.daily?.bestScore ?? 0,
    streak: currentStreak(stats, key),
  };
}

/** Buys the next level of a Forge upgrade. Resolves with the new stats, or null when it cannot be bought. */
export const buyUpgrade = (id: UpgradeId): Promise<LocalStats | null> =>
  serialized(async () => {
    const next = purchase(await getLocalStats(), id);
    if (!next) return null;
    await save(next);
    return next;
  });

/** Deletes everything stored on the device: progress, embers, achievements and records. */
export async function resetLocalStats(): Promise<void> {
  await serialized(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
  });
}
