// src/services/highscores.ts
import { db } from "../lib/firebase";
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

let _cachedThreshold: { count: number; minScore: number; maxTime: number } | null = null;

export async function prefetchLeaderboardThreshold() {
  try {
    const top10 = await fetchTop10();
    if (top10.length < 10) {
      _cachedThreshold = { count: top10.length, minScore: 0, maxTime: 999999 };
    } else {
      const tenth = top10[9].data();
      // If tenth place has no time, use a large default (999999)
      const tenthTime = (tenth.time !== undefined && tenth.time !== null) ? tenth.time : 999999;
      _cachedThreshold = { count: 10, minScore: tenth.score, maxTime: tenthTime };
    }
  } catch (e) {
    console.warn("[Highscores] Prefetch threshold failed", e);
  }
}

export async function fetchTop10(): Promise<Doc[]> {
  // Fetch by score only to avoid Firestore index requirement 
  // and exclusion of legacy documents that lack the 'time' field.
  const q = query(
    collection(db, "highscores"), 
    orderBy("score", "desc"), 
    limit(20) // Get more to handle tie-breaks in memory
  );
  try {
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, data: () => d.data() as HighscoreRow }));
    
    // Sort in memory: Score DESC, then Time ASC (missing time treated as very large)
    return docs.sort((a, b) => {
      const da = a.data();
      const db = b.data();
      if (da.score !== db.score) return db.score - da.score;
      
      const ta = (da.time !== undefined && da.time !== null) ? da.time : 999999;
      const tb = (db.time !== undefined && db.time !== null) ? db.time : 999999;
      return ta - tb;
    }).slice(0, 10);
  } catch (e) {
    console.warn("[Highscores] fetchTop10 failed:", e);
    return [];
  }
}

export async function addHighscore(row: HighscoreRow) {
  _cachedThreshold = null; // Invalidate cache so it recalculates
  
  // Guard: Ensure time is a valid number and at least 1 (to avoid 00:00 bugs)
  const safeTime = (typeof row.time === 'number' && !isNaN(row.time)) ? Math.max(row.time, 1) : 1;
  const safeRow = { ...row, time: safeTime };
  
  console.log("[Highscores] Adding score:", safeRow);
  await addDoc(collection(db, "highscores"), safeRow);
}

/** Returns true instantly using a cached threshold. */
export async function isTopTenScore(score: number, time: number): Promise<boolean> {
  if (!_cachedThreshold) {
    await prefetchLeaderboardThreshold();
  }
  
  if (!_cachedThreshold) return false; // Fallback safely if network fails
  
  if (_cachedThreshold.count < 10) return true;
  if (score > _cachedThreshold.minScore) return true;
  if (score === _cachedThreshold.minScore && time < _cachedThreshold.maxTime) return true;
  return false;
}
