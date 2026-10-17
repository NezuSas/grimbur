import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { checkName } from '../core/leaderboard/validation';
import { CODE_PATTERN } from '../core/challenge/code';
import { rankRows } from '../core/leaderboard/threshold';
import { getPlayerId } from './playerProfile';

/** The boards of friend challenges (see core/challenge/code.ts and firestore.rules) and the codes this phone has played. */
const REQUEST_TIMEOUT_MS = 8000;
const COLLECTION = 'challenge_scores';
const RECENT_STORAGE = 'wumpus.challenges.recent.v1';
const MAX_RECENT = 8;

export interface ChallengeRow {
  code: string;
  pid?: string;
  name: string;
  level: number;
  score: number;
  coins: number;
  characterIndex: number;
  time: number;
}
export type ChallengeDoc = { id: string; data: () => ChallengeRow };

const withTimeout = <T,>(work: Promise<T>, label: string): Promise<T> =>
  Promise.race([work, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`[challenge] ${label} timed out`)), REQUEST_TIMEOUT_MS))]);

export interface ChallengeResult {
  level: number;
  score: number;
  coins: number;
  characterIndex: number;
  /** Seconds played. */
  time: number;
}

export type SubmitOutcome = 'saved' | 'not-better';

/** Sends a result under the player's name. One result per phone per challenge: a lower score than the one already there is not sent. */
export async function submitChallengeScore(code: string, result: ChallengeResult, name: string): Promise<SubmitOutcome> {
  if (!CODE_PATTERN.test(code)) throw new Error('[challenge] not a code');
  const checked = checkName(name);
  if (!checked.ok) throw new Error(`[challenge] rejected name (${checked.reason})`);
  const pid = await getPlayerId();
  const row = {
    code,
    pid,
    name: checked.name,
    level: Math.round(result.level),
    score: Math.round(result.score),
    coins: Math.round(result.coins),
    characterIndex: result.characterIndex,
    time: Math.max(1, Math.round(result.time)),
  };
  const ref = doc(db, COLLECTION, `${code}_${pid}`);
  const existing = await withTimeout(getDoc(ref), 'read');
  if (existing.exists() && Number(existing.data()?.score) >= row.score) return 'not-better';
  await withTimeout(setDoc(ref, row), 'write');
  return 'saved';
}

/** The best results of a challenge (up to 20). Throws when the network fails. */
export async function loadChallengeBoard(code: string): Promise<ChallengeDoc[]> {
  const q = query(collection(db, COLLECTION), where('code', '==', code), orderBy('score', 'desc'), limit(20));
  const snap = await withTimeout(getDocs(q), 'load');
  const docs: ChallengeDoc[] = snap.docs.map(d => ({ id: d.id, data: () => d.data() as ChallengeRow }));
  return rankRows(docs.map(d => ({ doc: d, score: d.data().score, time: d.data().time }))).map(r => r.doc);
}

export async function getRecentChallenges(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_STORAGE);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string' && CODE_PATTERN.test(x)) : [];
  } catch {
    return [];
  }
}

/** Remembers a code as the most recent one (the list keeps the last few). */
export async function rememberChallenge(code: string): Promise<string[]> {
  const next = [code, ...(await getRecentChallenges()).filter(c => c !== code)].slice(0, MAX_RECENT);
  try {
    await AsyncStorage.setItem(RECENT_STORAGE, JSON.stringify(next));
  } catch (e) {
    console.warn('[challenge] could not remember the code:', e);
  }
  return next;
}
