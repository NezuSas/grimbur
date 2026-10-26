import AsyncStorage from '@react-native-async-storage/async-storage';
import { CachedBoard, CachedRow, parseBoard, serializeBoard } from '../core/leaderboard/cache';

const CACHE_KEY = 'grimbur.top10.v1';

/** Remembers the list that just loaded. Never throws: a full disk must not break the leaderboard. */
export async function saveTop10Cache(rows: readonly CachedRow[], at: number = Date.now()): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, serializeBoard(rows, at));
  } catch (e) {
    console.warn('[Highscores] Could not cache the top 10', e);
  }
}

/** The last good list, or null when none was saved (or it is unreadable). Never throws. */
export async function loadTop10Cache(now: number = Date.now()): Promise<CachedBoard | null> {
  try {
    return parseBoard(await AsyncStorage.getItem(CACHE_KEY), now);
  } catch {
    return null;
  }
}
