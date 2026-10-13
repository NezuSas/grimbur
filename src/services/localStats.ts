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

const STORAGE_KEY = 'wumpus.stats.v1';

export async function getLocalStats(): Promise<LocalStats> {
  return parseStats(await AsyncStorage.getItem(STORAGE_KEY));
}

async function save(stats: LocalStats) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

/** Persists a finished expedition run and reports whether it beat the previous best score. */
export async function recordRun(run: RunResult) {
  const { stats, isNewBestScore } = mergeRun(await getLocalStats(), run);
  await save(stats);
  return { stats, isNewBestScore };
}

/** Persists a finished daily-challenge run for the given UTC day (default: today). */
export async function recordDailyRun(run: RunResult, key: string = dailyKey()) {
  const { stats, isNewDailyBest } = mergeDailyRun(await getLocalStats(), key, run);
  await save(stats);
  return {
    stats,
    isNewDailyBest,
    dailyBest: stats.daily?.bestScore ?? 0,
    streak: currentStreak(stats, key),
  };
}
