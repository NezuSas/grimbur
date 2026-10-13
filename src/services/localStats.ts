import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalStats, RunResult, mergeRun, parseStats } from '../core/stats/runStats';

const STORAGE_KEY = 'wumpus.stats.v1';

export async function getLocalStats(): Promise<LocalStats> {
  return parseStats(await AsyncStorage.getItem(STORAGE_KEY));
}

/** Persists a finished run and reports whether it beat the previous best score. */
export async function recordRun(run: RunResult) {
  const { stats, isNewBestScore } = mergeRun(await getLocalStats(), run);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  return { stats, isNewBestScore };
}
