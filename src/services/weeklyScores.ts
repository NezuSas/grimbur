import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { checkName } from '../core/leaderboard/validation';
import { getPlayerId, getPlayerName } from './playerProfile';
import type { FriendEntry } from '../core/social/friends';

/**
 * The Grimbur's weekly challenge among friends (firestore.rules: `weekly_scores/{week}_{playerId}`): each player's one counted
 * try of the week, solved or not and in how long. Written once, never changed (only the first try counts); read back by id for
 * the player's friends. Nothing is listed.
 */
const COLLECTION = 'weekly_scores';
const REQUEST_TIMEOUT_MS = 8000;

export interface WeeklyRow {
  pid: string;
  name: string;
  /** The week's Monday, yyyy-mm-dd. */
  week: string;
  solved: boolean;
  /** Seconds of the try (solved), 0 when it failed. */
  time: number;
  characterIndex: number;
}

const withTimeout = <T,>(work: Promise<T>, label: string): Promise<T> =>
  Promise.race([work, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`[weekly] ${label} timed out`)), REQUEST_TIMEOUT_MS))]);

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.trunc(v)));

/** Friends (and the player) for the week: who solved it first, the fastest first; the failed tries after. */
export const rankWeeklyRows = (rows: readonly WeeklyRow[]): WeeklyRow[] => [...rows].sort((a, b) => Number(b.solved) - Number(a.solved) || a.time - b.time);

/** Sends the player's counted try (a no-op without a name, or when the week already has one). Never throws. */
export async function submitWeeklyScore(r: { week: string; solved: boolean; seconds: number; characterIndex: number }): Promise<void> {
  try {
    const name = await getPlayerName();
    const checked = name ? checkName(name) : null;
    if (!checked || !checked.ok) return;
    const pid = await getPlayerId();
    const row: WeeklyRow = {
      pid,
      name: checked.name,
      week: r.week,
      solved: r.solved,
      time: r.solved ? clamp(r.seconds, 3, 86400) : 0,
      characterIndex: clamp(r.characterIndex, 0, 5),
    };
    const ref = doc(db, COLLECTION, `${r.week}_${pid}`);
    const existing = await withTimeout(getDoc(ref), 'read');
    if (existing.exists()) return;
    await withTimeout(setDoc(ref, row), 'write');
  } catch (e) {
    console.warn('[weekly] submit failed', e);
  }
}

/** The week's rows of the player and their friends, ranked. Throws only when nothing at all could be read. */
export async function loadFriendsWeekly(week: string, friends: readonly FriendEntry[]): Promise<{ rows: WeeklyRow[]; me: string }> {
  const me = await getPlayerId();
  let failures = 0;
  const ids = [me, ...friends.map(f => f.pid).filter(p => p !== me)];
  const rows = await Promise.all(
    ids.map(async pid => {
      try {
        const snap = await withTimeout(getDoc(doc(db, COLLECTION, `${week}_${pid}`)), 'load');
        return snap.exists() ? (snap.data() as WeeklyRow) : null;
      } catch {
        failures++;
        return null;
      }
    }),
  );
  if (failures === ids.length) throw new Error('[weekly] offline');
  return { rows: rankWeeklyRows(rows.filter((r): r is WeeklyRow => !!r)), me };
}
