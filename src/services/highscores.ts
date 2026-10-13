// src/services/highscores.ts
import { db } from "../lib/firebase";
import { checkName, validateSubmission } from "../core/leaderboard/validation";
import { Threshold, qualifies, rankRows, thresholdFromTop10 } from "../core/leaderboard/threshold";
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  limit,
  query,
} from "firebase/firestore";

export type HighscoreRow = {
  level: number;
  score: number;
  name: string;
  coins: number;
  characterIndex: number;
  time: number; // Total seconds
};
export type Doc = { id: string; data: () => HighscoreRow };

/** Network calls never hang the UI: they fail after this long. */
const REQUEST_TIMEOUT_MS = 8000;
/** The cached top-10 threshold is re-fetched after this long. */
const THRESHOLD_TTL_MS = 60_000;

let cachedThreshold: { value: Threshold; at: number } | null = null;

function withTimeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`[Highscores] ${label} timed out`)), ms);
    work.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Fetches the global top 10. Throws when the network or Firestore fails, so callers can show an
 * error instead of an empty (and wrong) leaderboard.
 */
export async function fetchTop10(): Promise<Doc[]> {
  // Ordered by score only: avoids a composite index and keeps legacy rows without `time`.
  const q = query(collection(db, "highscores"), orderBy("score", "desc"), limit(20));
  const snap = await withTimeout(getDocs(q), REQUEST_TIMEOUT_MS, "fetchTop10");
  const docs = snap.docs.map(d => ({ id: d.id, data: () => d.data() as HighscoreRow }));
  // Ties on score are broken in memory: faster time first, missing time last.
  const ranked = rankRows(docs.map(d => ({ doc: d, score: d.data().score, time: d.data().time })));
  return ranked.map(r => r.doc).slice(0, 10);
}

/** Warms the threshold cache. Never throws and never caches a failure. */
export async function prefetchLeaderboardThreshold(): Promise<void> {
  try {
    const top10 = await fetchTop10();
    const rows = top10.map(d => d.data());
    cachedThreshold = { value: thresholdFromTop10(rows), at: Date.now() };
  } catch (e) {
    console.warn("[Highscores] Prefetch threshold failed", e);
  }
}

export async function addHighscore(row: HighscoreRow): Promise<void> {
  cachedThreshold = null; // the board is about to change

  // Guard: time is at least 1 second (avoids 00:00 entries) and always an integer.
  const safeTime = Number.isFinite(row.time) ? Math.max(Math.round(row.time), 1) : 1;
  const nameCheck = checkName(row.name);
  if (!nameCheck.ok) throw new Error(`[Highscores] Rejected name (${nameCheck.reason})`);

  const safeRow: HighscoreRow = { ...row, name: nameCheck.name, time: safeTime };
  const problems = validateSubmission(safeRow);
  if (problems.length > 0) throw new Error(`[Highscores] Invalid submission: ${problems.join(", ")}`);

  await withTimeout(addDoc(collection(db, "highscores"), safeRow), REQUEST_TIMEOUT_MS, "addHighscore");
}

/**
 * Whether a run would enter the top 10. Returns false when the board cannot be read
 * (offline): we never invite the player to submit a score that could not be saved.
 */
export async function isTopTenScore(score: number, time: number): Promise<boolean> {
  const fresh = cachedThreshold && Date.now() - cachedThreshold.at < THRESHOLD_TTL_MS;
  if (!fresh) await prefetchLeaderboardThreshold();
  if (!cachedThreshold) return false;
  return qualifies(cachedThreshold.value, score, time);
}
