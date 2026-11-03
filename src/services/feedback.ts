import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { db } from '../lib/firebase';
import { getPlayerId, getPlayerName } from './playerProfile';

/**
 * What testers think, sent from inside the game (firestore.rules: `feedback/{autoId}`): a kind (a bug, an idea, something they
 * liked, anything else), their words, and where and on what they played, so a report can be reproduced. Written once, read only
 * from the Firebase console; nobody can list or read another player's notes.
 */
export type FeedbackKind = 'bug' | 'idea' | 'like' | 'other';
export const FEEDBACK_KINDS: readonly FeedbackKind[] = ['bug', 'idea', 'like', 'other'];
export const FEEDBACK_MAX = 1000;
export const FEEDBACK_MIN = 3;

const REQUEST_TIMEOUT_MS = 10000;
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

/** Sends one note. Resolves true when it reached the server, false otherwise (offline, refused). Never throws. */
export async function sendFeedback(r: { kind: FeedbackKind; text: string; where: string; width: number; height: number }): Promise<boolean> {
  try {
    const text = cut(r.text.trim(), FEEDBACK_MAX);
    if (text.length < FEEDBACK_MIN) return false;
    const pid = await getPlayerId();
    const name = (await getPlayerName()) ?? '';
    const ua = Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.userAgent : `${Platform.OS} ${String(Platform.Version)}`;
    const row = {
      pid,
      name: cut(name, 20),
      kind: r.kind,
      text,
      where: cut(r.where, 40),
      platform: Platform.OS,
      version: cut(Constants.expoConfig?.version ?? '?', 20),
      width: Math.max(0, Math.min(20000, Math.round(r.width))),
      height: Math.max(0, Math.min(20000, Math.round(r.height))),
      ua: cut(ua, 300),
      at: serverTimestamp(),
    };
    await Promise.race([
      addDoc(collection(db, 'feedback'), row),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('[feedback] timed out')), REQUEST_TIMEOUT_MS)),
    ]);
    return true;
  } catch (e) {
    console.warn('[feedback] send failed', e);
    return false;
  }
}
