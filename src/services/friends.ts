import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { beatSinceSeen, type FriendEntry } from '../core/social/friends';
import { getSeasonRow } from './seasonScores';

/** What the friends list shows of one friend: their best run on the global board and their points this season. */
export interface FriendCard {
  pid: string;
  /** Null when the friend has no row on the global board yet. */
  name: string | null;
  best: number;
  level: number;
  coins: number;
  time: number;
  characterIndex: number;
  frame?: string;
  title?: string;
  /** This season's points, or null when unknown (no row, or the board could not be read). */
  seasonPoints: number | null;
  /** The friend beat their best since the player last looked. */
  newRecord: boolean;
}

const REQUEST_TIMEOUT_MS = 8000;
const withTimeout = <T,>(work: Promise<T>): Promise<T> =>
  Promise.race([work, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('[friends] timed out')), REQUEST_TIMEOUT_MS))]);

/** Reads every friend (each on its own: one that fails does not hide the others). Throws only when every read failed. */
export async function loadFriendCards(friends: readonly FriendEntry[], season: string): Promise<FriendCard[]> {
  let failures = 0;
  const cards = await Promise.all(
    friends.map(async (f): Promise<FriendCard> => {
      let row: Record<string, unknown> | null = null;
      try {
        const snap = await withTimeout(getDoc(doc(db, 'highscores', f.pid)));
        row = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
      } catch {
        failures++;
      }
      let seasonPoints: number | null = null;
      try {
        seasonPoints = (await getSeasonRow(season, f.pid))?.points ?? null;
      } catch {
        seasonPoints = null; // the season board may not be deployed yet
      }
      const best = Number(row?.score) || 0;
      return {
        pid: f.pid,
        name: typeof row?.name === 'string' ? row.name : null,
        best,
        level: Number(row?.level) || 0,
        coins: Number(row?.coins) || 0,
        time: Number(row?.time) || 0,
        characterIndex: Number(row?.characterIndex) || 0,
        frame: typeof row?.frame === 'string' ? row.frame : undefined,
        title: typeof row?.title === 'string' ? row.title : undefined,
        seasonPoints,
        newRecord: beatSinceSeen(f, best),
      };
    }),
  );
  if (friends.length > 0 && failures === friends.length) throw new Error('[friends] offline');
  return cards.sort((a, b) => b.best - a.best);
}
