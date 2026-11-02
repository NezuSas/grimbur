import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { checkName } from '../core/leaderboard/validation';
import { getPlayerId, getPlayerName } from './playerProfile';
import type { FriendEntry } from '../core/social/friends';

/**
 * The puzzle of the day among friends (firestore.rules: `puzzle_scores/{date}_{playerId}`): each player's best try of the day,
 * read back by id for the player's friends. Nothing is listed: only friends who know each other's code see a row.
 */
const COLLECTION = 'puzzle_scores';
const REQUEST_TIMEOUT_MS = 8000;

export interface PuzzleRow {
  pid: string;
  name: string;
  date: string;
  stars: number;
  mistakes: number;
  hints: number;
  /** Seconds, restarts included. */
  time: number;
  characterIndex: number;
}

const withTimeout = <T,>(work: Promise<T>, label: string): Promise<T> =>
  Promise.race([work, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`[puzzle] ${label} timed out`)), REQUEST_TIMEOUT_MS))]);

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.trunc(v)));

/** Better = more stars, or as many in less time (the server keeps only a better row). */
export const isBetterPuzzle = (a: Pick<PuzzleRow, 'stars' | 'time'>, b: Pick<PuzzleRow, 'stars' | 'time'> | null): boolean =>
  !b || a.stars > b.stars || (a.stars === b.stars && a.time < b.time);

/** Friends (and the player) ordered for the day: most stars first, then the fastest. */
export const rankPuzzleRows = (rows: readonly PuzzleRow[]): PuzzleRow[] => [...rows].sort((a, b) => b.stars - a.stars || a.time - b.time);

/** Sends the player's try of the day (a no-op without a name, or when the board already has a better one). Never throws. */
export async function submitPuzzleScore(r: { date: string; stars: number; mistakes: number; hints: number; seconds: number; characterIndex: number }): Promise<void> {
  try {
    if (r.stars < 1) return;
    const name = await getPlayerName();
    const checked = name ? checkName(name) : null;
    if (!checked || !checked.ok) return;
    const pid = await getPlayerId();
    const row: PuzzleRow = {
      pid,
      name: checked.name,
      date: r.date,
      stars: clamp(r.stars, 1, 3),
      mistakes: clamp(r.mistakes, 0, 99),
      hints: clamp(r.hints, 0, 99),
      time: clamp(r.seconds, 3, 86400),
      characterIndex: clamp(r.characterIndex, 0, 5),
    };
    const ref = doc(db, COLLECTION, `${r.date}_${pid}`);
    const existing = await withTimeout(getDoc(ref), 'read');
    if (existing.exists() && !isBetterPuzzle(row, existing.data() as PuzzleRow)) return;
    await withTimeout(setDoc(ref, row), 'write');
  } catch (e) {
    console.warn('[puzzle] submit failed', e);
  }
}

/**
 * The day's rows of the player and their friends who solved it, best first. Friends with no row (not solved yet, or a board
 * not deployed) are left out; throws only when nothing at all could be read.
 */
export async function loadFriendsPuzzle(date: string, friends: readonly FriendEntry[]): Promise<{ rows: PuzzleRow[]; me: string }> {
  const me = await getPlayerId();
  let failures = 0;
  const ids = [me, ...friends.map(f => f.pid).filter(p => p !== me)];
  const rows = await Promise.all(
    ids.map(async pid => {
      try {
        const snap = await withTimeout(getDoc(doc(db, COLLECTION, `${date}_${pid}`)), 'load');
        return snap.exists() ? (snap.data() as PuzzleRow) : null;
      } catch {
        failures++;
        return null;
      }
    }),
  );
  if (failures === ids.length) throw new Error('[puzzle] offline');
  return { rows: rankPuzzleRows(rows.filter((r): r is PuzzleRow => !!r)), me };
}
