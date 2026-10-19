import AsyncStorage from '@react-native-async-storage/async-storage';
import { DuelRecord, addRecord, parseHistory } from '../core/duel/history';

const STORAGE = 'wumpus.duel.history.v1';

export async function getDuelHistory(): Promise<DuelRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE);
    return raw ? parseHistory(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

/** Saves a finished duel (the same duel is saved once, whatever happens to the screen). Never throws. */
export async function saveDuelRecord(record: DuelRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE, JSON.stringify(addRecord(await getDuelHistory(), record)));
  } catch (e) {
    console.warn('[duel] could not save the history:', e);
  }
}
