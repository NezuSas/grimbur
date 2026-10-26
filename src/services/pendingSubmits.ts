import AsyncStorage from '@react-native-async-storage/async-storage';
import { submitDailyScore, type DailyResult } from './dailyScores';
import { submitChallengeScore, type ChallengeResult } from './challenges';

/**
 * Results that could not reach the board (no network at the end of a run) wait here and are sent again the next
 * time the cover opens. Without this, a daily played offline silently never appears on the day's board.
 */
const STORAGE_KEY = 'grimbur.pendingSubmits.v1';
const MAX_PENDING = 10;

export type PendingSubmit =
  | { kind: 'daily'; result: DailyResult; name: string }
  | { kind: 'challenge'; code: string; result: ChallengeResult; name: string };

/** One entry per board: a newer result for the same day or code replaces the old one only when it is better. */
const keyOf = (e: PendingSubmit) => (e.kind === 'daily' ? `daily:${e.result.day}` : `challenge:${e.code}`);

async function read(): Promise<PendingSubmit[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as PendingSubmit[]) : [];
    return Array.isArray(list) ? list.filter(e => e && (e.kind === 'daily' || e.kind === 'challenge')) : [];
  } catch {
    return [];
  }
}

async function write(list: PendingSubmit[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-MAX_PENDING)));
  } catch {
    // Losing the queue only means the result is not resent; the run itself is already saved locally.
  }
}

/** Keeps a failed submission to try again later. */
export async function queuePendingSubmit(entry: PendingSubmit): Promise<void> {
  const list = await read();
  const key = keyOf(entry);
  const rest = list.filter(e => keyOf(e) !== key);
  const old = list.find(e => keyOf(e) === key);
  const better = !old || entry.result.score >= old.result.score;
  await write(better ? [...rest, entry] : list);
}

let flushing = false;

/**
 * Tries to send everything in the queue; what fails again stays queued. Safe to call often (one flight at a time),
 * cheap when the queue is empty.
 */
export async function flushPendingSubmits(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const list = await read();
    if (list.length === 0) return;
    const stillPending: PendingSubmit[] = [];
    for (const entry of list) {
      try {
        if (entry.kind === 'daily') await submitDailyScore(entry.result, entry.name);
        else await submitChallengeScore(entry.code, entry.result, entry.name);
      } catch (e) {
        // An invalid entry (rejected name, malformed result) would fail forever: only network-ish failures stay.
        const message = e instanceof Error ? e.message : '';
        if (message.includes('rejected') || message.includes('invalid') || message.includes('not a ')) continue;
        stillPending.push(entry);
      }
    }
    await write(stillPending);
  } finally {
    flushing = false;
  }
}
