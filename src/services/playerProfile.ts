import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRandomBytes } from 'expo-crypto';
import { keyFromBytes } from '../core/cloud/cloudKey';
import { PLAYER_ID_PATTERN } from '../core/leaderboard/daily';
import { checkName } from '../core/leaderboard/validation';

/**
 * Who the player is on the daily and weekly boards: a random id made on first use (it only keeps one result per day per phone; it is
 * not an account) and the name they chose. Both stay on the device.
 */
const ID_STORAGE = 'wumpus.player.id.v1';
const NAME_STORAGE = 'wumpus.player.name.v1';

let cachedId: string | null = null;

export async function getPlayerId(): Promise<string> {
  if (cachedId) return cachedId;
  try {
    const stored = await AsyncStorage.getItem(ID_STORAGE);
    if (stored && PLAYER_ID_PATTERN.test(stored)) {
      cachedId = stored;
      return stored;
    }
  } catch {
    // fall through: a fresh id is made below
  }
  const id = keyFromBytes(getRandomBytes(10));
  cachedId = id;
  try {
    await AsyncStorage.setItem(ID_STORAGE, id);
  } catch (e) {
    console.warn('[player] could not remember the id:', e);
  }
  return id;
}

/** The saved name, or null when the player has not chosen one (or the saved one is no longer allowed). */
export async function getPlayerName(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(NAME_STORAGE);
    if (!stored) return null;
    const checked = checkName(stored);
    return checked.ok ? checked.name : null;
  } catch {
    return null;
  }
}

/** Saves the name (cleaned). Returns the saved name, or null when it is not allowed. */
export async function setPlayerName(name: string): Promise<string | null> {
  const checked = checkName(name);
  if (!checked.ok) return null;
  try {
    await AsyncStorage.setItem(NAME_STORAGE, checked.name);
  } catch (e) {
    console.warn('[player] could not remember the name:', e);
  }
  return checked.name;
}
