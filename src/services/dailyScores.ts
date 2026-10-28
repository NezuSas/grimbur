import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { checkName } from '../core/leaderboard/validation';
import { DailySubmission, dailyDocId, validateDaily, weekDays } from '../core/leaderboard/daily';
import { rankRows } from '../core/leaderboard/threshold';
import { getPlayerId } from './playerProfile';

/** The daily challenge's board and the week's best results (see core/leaderboard/daily.ts and firestore.rules). */
const REQUEST_TIMEOUT_MS = 8000;
const COLLECTION = 'daily_scores';

export type BoardRow = Omit<DailySubmission, 'pid'> & { pid?: string };
export type BoardDoc = { id: string; data: () => BoardRow };

const withTimeout = <T,>(work: Promise<T>, label: string): Promise<T> =>
  Promise.race([work, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`[daily] ${label} timed out`)), REQUEST_TIMEOUT_MS))]);

export interface DailyResult {
  /** The day the run was played (the daily challenge's local day, `2026-10-17`). */
  day: string;
  level: number;
  score: number;
  coins: number;
  characterIndex: number;
  /** Seconds played. */
  time: number;
}

export type SubmitOutcome = 'saved' | 'not-better';

/**
 * Sends today's result under the player's name. A day keeps one result per phone: a lower score than the one already there is not
 * sent. Throws when the result is not valid or the network fails (the caller shows nothing or retries later).
 */
export async function submitDailyScore(result: DailyResult, name: string): Promise<SubmitOutcome> {
  const checked = checkName(name);
  if (!checked.ok) throw new Error(`[daily] rejected name (${checked.reason})`);
  const pid = await getPlayerId();
  const row: DailySubmission = {
    day: result.day,
    pid,
    name: checked.name,
    level: Math.min(10, Math.max(1, Math.round(result.level))),
    score: Math.max(0, Math.round(result.score)),
    coins: Math.max(0, Math.round(result.coins)),
    characterIndex: result.characterIndex,
    time: Math.max(1, Math.round(result.time)),
  };
  const problems = validateDaily(row);
  if (problems.length > 0) throw new Error(`[daily] invalid result: ${problems.join(', ')}`);

  const ref = doc(db, COLLECTION, dailyDocId(row.day, pid));
  const existing = await withTimeout(getDoc(ref), 'read');
  if (existing.exists() && Number(existing.data()?.score) >= row.score) return 'not-better';
  await withTimeout(setDoc(ref, row), 'write');
  return 'saved';
}

async function load(days: string[]): Promise<BoardDoc[]> {
  if (days.length === 0) return [];
  const q = query(collection(db, COLLECTION), days.length === 1 ? where('day', '==', days[0]) : where('day', 'in', days), orderBy('score', 'desc'), limit(20));
  const snap = await withTimeout(getDocs(q), 'load');
  const docs: BoardDoc[] = snap.docs.map(d => ({ id: d.id, data: () => d.data() as BoardRow }));
  // Ties on score: the faster run first.
  return rankRows(docs.map(d => ({ doc: d, score: d.data().score, time: d.data().time }))).map(r => r.doc);
}

/** The best results of a day (up to 20). Throws when the network fails. */
export const loadDayBoard = (day: string): Promise<BoardDoc[]> => load([day]);

/** The best results of the ISO week a day belongs to (up to 20). Throws when the network fails. */
export const loadWeekBoard = (day: string): Promise<BoardDoc[]> => load(weekDays(day));
