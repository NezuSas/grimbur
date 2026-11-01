import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { checkName } from '../core/leaderboard/validation';
import { lookOf } from '../core/cosmetics/look';
import { EMPTY_SEASON, syncSeason } from '../core/stats/season';
import { dailyKey } from '../core/engine/seed';
import { getPlayerId, getPlayerName } from './playerProfile';
import { getLocalStats, peekLocalStats } from './localStats';

/**
 * The season boards (firestore.rules: `season_scores/{YYYY-MM}_{playerId}`): every player's season points of the month,
 * sent after each run once the player has a name. Points only go up, so a resend never lowers a row.
 */
const COLLECTION = 'season_scores';
const REQUEST_TIMEOUT_MS = 8000;
/** The most points a month can hold on the server (firestore.rules). */
const MAX_POINTS = 100_000;

export interface SeasonRow {
  season: string;
  pid: string;
  name: string;
  points: number;
  characterIndex: number;
  frame?: string;
  title?: string;
}
export type SeasonDoc = { id: string; data: () => SeasonRow };

const withTimeout = <T,>(work: Promise<T>, label: string): Promise<T> =>
  Promise.race([work, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`[season] ${label} timed out`)), REQUEST_TIMEOUT_MS))]);

/** Sends this month's points (a no-op without a name, without points, or when the board already has as many). Never throws. */
export async function syncSeasonScore(characterIndex: number): Promise<void> {
  try {
    const stats = await getLocalStats();
    const day = dailyKey();
    const season = syncSeason(stats.season ?? EMPTY_SEASON, day);
    if (!season.key || season.points < 1) return;
    const name = await getPlayerName();
    const checked = name ? checkName(name) : null;
    if (!checked || !checked.ok) return;
    const pid = await getPlayerId();
    const ref = doc(db, COLLECTION, `${season.key}_${pid}`);
    const points = Math.min(MAX_POINTS, Math.trunc(season.points));
    const existing = await withTimeout(getDoc(ref), 'read');
    if (existing.exists() && Number(existing.data()?.points) >= points) return;
    const row: SeasonRow = { season: season.key, pid, name: checked.name, points, characterIndex: Math.max(0, Math.min(5, Math.trunc(characterIndex))) };
    await withTimeout(setDoc(ref, { ...row, ...lookOf(peekLocalStats()) }), 'write');
  } catch (e) {
    console.warn('[season] sync failed', e);
  }
}

/** The best 20 of a season. Throws when the network fails. */
export async function loadSeasonBoard(season: string): Promise<SeasonDoc[]> {
  const q = query(collection(db, COLLECTION), where('season', '==', season), orderBy('points', 'desc'), limit(20));
  const snap = await withTimeout(getDocs(q), 'load');
  return snap.docs.map(d => ({ id: d.id, data: () => d.data() as SeasonRow }));
}

/** One player's row of a season, or null. Throws when the network fails. */
export async function getSeasonRow(season: string, pid: string): Promise<SeasonRow | null> {
  const snap = await withTimeout(getDoc(doc(db, COLLECTION, `${season}_${pid}`)), 'get');
  return snap.exists() ? (snap.data() as SeasonRow) : null;
}
