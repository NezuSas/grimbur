import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { checkName } from '../core/leaderboard/validation';
import { lookOf } from '../core/cosmetics/look';
import { getPlayerId, getPlayerName } from './playerProfile';
import { getLocalStats, peekLocalStats } from './localStats';

/**
 * The endless board (firestore.rules: `endless_scores/{playerId}`): every player's deepest floor in the endless descent, sent after
 * an endless run once the player has a name. The floor only goes up, so a resend never lowers a row.
 */
const COLLECTION = 'endless_scores';
const REQUEST_TIMEOUT_MS = 8000;
/** The deepest floor the server accepts (firestore.rules). */
const MAX_FLOOR = 999;

export interface EndlessRow {
  pid: string;
  name: string;
  floor: number;
  characterIndex: number;
  frame?: string;
  title?: string;
}
export type EndlessDoc = { id: string; data: () => EndlessRow };

const withTimeout = <T,>(work: Promise<T>, label: string): Promise<T> =>
  Promise.race([work, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`[endless] ${label} timed out`)), REQUEST_TIMEOUT_MS))]);

/** Sends the deepest endless floor (a no-op without a name, without a floor, or when the board already has it). Never throws. */
export async function syncEndlessScore(characterIndex: number): Promise<void> {
  try {
    const stats = await getLocalStats();
    const floor = Math.min(MAX_FLOOR, Math.trunc(stats.bestEndlessFloor ?? 0));
    if (floor < 1) return;
    const name = await getPlayerName();
    const checked = name ? checkName(name) : null;
    if (!checked || !checked.ok) return;
    const pid = await getPlayerId();
    const ref = doc(db, COLLECTION, pid);
    const existing = await withTimeout(getDoc(ref), 'read');
    if (existing.exists() && Number(existing.data()?.floor) >= floor) return;
    const row: EndlessRow = { pid, name: checked.name, floor, characterIndex: Math.max(0, Math.min(5, Math.trunc(characterIndex))) };
    await withTimeout(setDoc(ref, { ...row, ...lookOf(peekLocalStats()) }), 'write');
  } catch (e) {
    console.warn('[endless] sync failed', e);
  }
}

/** The 20 deepest. Throws when the network fails. */
export async function loadEndlessBoard(): Promise<EndlessDoc[]> {
  const q = query(collection(db, COLLECTION), orderBy('floor', 'desc'), limit(20));
  const snap = await withTimeout(getDocs(q), 'load');
  return snap.docs.map(d => ({ id: d.id, data: () => d.data() as EndlessRow }));
}
