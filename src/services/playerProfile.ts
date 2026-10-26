import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkName } from '../core/leaderboard/validation';
import { ensureSignedIn } from '../lib/auth';

/**
 * Who the player is on the boards and in duels: the anonymous Firebase uid (firestore.rules binds every write
 * to it, so nobody can touch another player's row) and the name they chose. It is not an account the player
 * manages; it needs nothing from them.
 */
const NAME_STORAGE = 'grimbur.player.name.v1';

/** The player's id for boards and duels. Rejects when the anonymous sign-in cannot complete (offline). */
export async function getPlayerId(): Promise<string> {
  return ensureSignedIn();
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
