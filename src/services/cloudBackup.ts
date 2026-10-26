import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRandomBytes } from 'expo-crypto';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { keyFromBytes, normalizeKey } from '../core/cloud/cloudKey';
import { createBackupCode } from './backup';

/**
 * The cloud copy of the player's progress. It is the same backup code as the clipboard one, kept in the document whose id is the
 * player's recovery key (see firestore.rules). Everything here is best effort: nothing throws and a bad connection only means that
 * the copy is saved the next time.
 */
const KEY_STORAGE = 'grimbur.cloud.key.v1';
const LAST_STORAGE = 'grimbur.cloud.last.v1';
const NETWORK_TIMEOUT_MS = 10_000;
const QUEUE_DELAY_MS = 4_000;

const withTimeout = <T,>(work: Promise<T>): Promise<T> =>
  Promise.race([work, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS))]);

export interface CloudState {
  key: string | null;
  /** When the copy was last saved (ms), or null. */
  lastSaved: number | null;
}

export async function getCloudState(): Promise<CloudState> {
  try {
    const [key, last] = await Promise.all([AsyncStorage.getItem(KEY_STORAGE), AsyncStorage.getItem(LAST_STORAGE)]);
    const normalized = key ? normalizeKey(key) : null;
    const lastSaved = last ? Number(last) : null;
    return { key: normalized, lastSaved: lastSaved !== null && Number.isFinite(lastSaved) ? lastSaved : null };
  } catch {
    return { key: null, lastSaved: null };
  }
}

async function upload(key: string): Promise<boolean> {
  try {
    const code = await createBackupCode();
    if (!code) return false;
    await withTimeout(setDoc(doc(db, 'backups', key), { code, updatedAt: serverTimestamp() }));
    await AsyncStorage.setItem(LAST_STORAGE, String(Date.now()));
    return true;
  } catch (e) {
    console.warn('[cloud] saving the copy failed:', e);
    return false;
  }
}

/** Turns the cloud copy on: makes a key, saves the first copy and remembers the key. Null when it could not be saved. */
export async function enableCloud(): Promise<string | null> {
  try {
    const key = keyFromBytes(getRandomBytes(10));
    if (!(await upload(key))) return null;
    await AsyncStorage.setItem(KEY_STORAGE, key);
    return key;
  } catch (e) {
    console.warn('[cloud] could not turn on:', e);
    return null;
  }
}

/** Saves the copy now (a no-op without a key). */
export async function syncCloudNow(): Promise<boolean> {
  const { key } = await getCloudState();
  return key ? upload(key) : false;
}

let timer: ReturnType<typeof setTimeout> | undefined;
/** Saves the copy soon, once: many calls in a row (every run, every screen) turn into one upload. */
export function queueCloudSync(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = undefined;
    void syncCloudNow();
  }, QUEUE_DELAY_MS);
}

/** Turns the cloud copy off: the key is forgotten and the copy deleted (when there is a connection). */
export async function disableCloud(): Promise<void> {
  const { key } = await getCloudState();
  try {
    await AsyncStorage.multiRemove([KEY_STORAGE, LAST_STORAGE]);
  } catch (e) {
    console.warn('[cloud] could not forget the key:', e);
  }
  if (key) {
    try {
      await withTimeout(deleteDoc(doc(db, 'backups', key)));
    } catch (e) {
      console.warn('[cloud] could not delete the copy:', e);
    }
  }
}

export type CloudFetch = { ok: true; code: string; key: string } | { ok: false; reason: 'format' | 'notfound' | 'network' };

/** Reads the backup code kept under a recovery key typed by the player. */
export async function fetchCloudBackup(input: string): Promise<CloudFetch> {
  const key = normalizeKey(input);
  if (!key) return { ok: false, reason: 'format' };
  try {
    const snap = await withTimeout(getDoc(doc(db, 'backups', key)));
    const code = snap.exists() ? snap.data()?.code : null;
    return typeof code === 'string' ? { ok: true, code, key } : { ok: false, reason: 'notfound' };
  } catch (e) {
    console.warn('[cloud] reading the copy failed:', e);
    return { ok: false, reason: 'network' };
  }
}

/** After a restore the phone keeps using the key it restored from, so the next saves go to the same place. */
export async function adoptCloudKey(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_STORAGE, key);
    await AsyncStorage.setItem(LAST_STORAGE, String(Date.now()));
  } catch (e) {
    console.warn('[cloud] could not remember the key:', e);
  }
}
