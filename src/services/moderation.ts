import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseHidden, serializeHidden, withHidden } from '../core/leaderboard/moderation';

const KEY = 'grimbur.hidden.v1';

/** Ids of the ranking entries this player hid. Never throws. */
export async function loadHidden(): Promise<string[]> {
  try {
    return parseHidden(await AsyncStorage.getItem(KEY));
  } catch {
    return [];
  }
}

/** Hides one entry for good (on this device) and returns the new list. */
export async function hideEntry(id: string): Promise<string[]> {
  const next = withHidden(await loadHidden(), id);
  try {
    await AsyncStorage.setItem(KEY, serializeHidden(next));
  } catch (e) {
    console.warn('[Moderation] Could not save the hidden list', e);
  }
  return next;
}

/** Shows every hidden entry again. */
export async function clearHidden(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Nothing to do: the list simply stays as it was.
  }
}
