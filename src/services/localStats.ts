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
  const { stats, isNewBestScore } = mergeRun(before, run);
  await save(stats);
  return { stats, isNewBestScore, unlocked: newlyUnlockedHeroes(before, stats) };
}

/** Persists a finished daily-challenge run for the given UTC day (default: today). */
export async function recordDailyRun(run: RunResult, key: string = dailyKey()) {
  const before = await getLocalStats();
  const { stats, isNewDailyBest } = mergeDailyRun(before, key, run);
  await save(stats);
  return {
    stats,
    unlocked: newlyUnlockedHeroes(before, stats),
    isNewDailyBest,
    dailyBest: stats.daily?.bestScore ?? 0,
    streak: currentStreak(stats, key),
  };
}
