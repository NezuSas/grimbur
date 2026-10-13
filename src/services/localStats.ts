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
import { UpgradeId, purchase } from '../core/stats/forge';

const STORAGE_KEY = 'wumpus.stats.v1';

export async function getLocalStats(): Promise<LocalStats> {
  return parseStats(await AsyncStorage.getItem(STORAGE_KEY));
}

async function save(stats: LocalStats) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

/** Persists a finished expedition run and reports whether it beat the previous best score. */
export async function recordRun(run: RunResult) {
  const before = await getLocalStats();
  const merged = mergeRun(before, run);
  const achievements = newAchievements(merged.stats, run);
  const stats = withAchievements(merged.stats, achievements, dailyKey());
  await save(stats);
  return {
    stats,
    isNewBestScore: merged.isNewBestScore,
    unlocked: newlyUnlockedHeroes(before, stats),
    achievements,
    embers: stats.embers - before.embers,
  };
}

/** Persists a finished daily-challenge run for the given UTC day (default: today). */
export async function recordDailyRun(run: RunResult, key: string = dailyKey()) {
  const before = await getLocalStats();
  const merged = mergeDailyRun(before, key, run);
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
    dailyBest: stats.daily?.bestScore ?? 0,
    streak: currentStreak(stats, key),
  };
}

/** Buys the next level of a Forge upgrade. Resolves with the new stats, or null when it cannot be bought. */
export async function buyUpgrade(id: UpgradeId): Promise<LocalStats | null> {
  const next = purchase(await getLocalStats(), id);
  if (!next) return null;
  await save(next);
  return next;
}
