import { daysBetween } from '../engine/seed';

/**
 * The daily chest: opened once a day from the cover, a small gift for simply coming back. Consecutive days climb a
 * seven-day calendar (each day pays a little more, the seventh a big one and a streak freeze); a missed day starts the
 * calendar over. It is separate from the first-run-of-the-day bonus, which still needs a run.
 */
export interface ChestState {
  /** The local day the chest was last opened. */
  last: string | null;
  /** The calendar day (1..CHEST_DAYS) of that opening; 0 before the first one. */
  day: number;
}

export const EMPTY_CHEST: ChestState = { last: null, day: 0 };
export const CHEST_DAYS = 7;
/** Embers of each calendar day. */
export const CHEST_EMBERS: readonly number[] = [15, 20, 25, 30, 40, 50, 100];
/** The seventh day also gives a streak freeze (when the pocket is not full). */
export const CHEST_FREEZE_DAY = 7;

/** Whether today's chest is waiting, and which calendar day it would be. */
export function chestStatus(state: ChestState, today: string): { ready: boolean; day: number } {
  if (state.last !== null && today <= state.last) return { ready: false, day: state.day };
  const consecutive = state.last !== null && daysBetween(state.last, today) === 1;
  const day = consecutive ? (state.day % CHEST_DAYS) + 1 : 1;
  return { ready: true, day };
}

/** Opens today's chest: the new state and what it gave; null when it was already opened today. */
export function openChest(state: ChestState, today: string, freezes: number, maxFreezes: number): { state: ChestState; embers: number; freeze: boolean; day: number } | null {
  const { ready, day } = chestStatus(state, today);
  if (!ready) return null;
  const freeze = day === CHEST_FREEZE_DAY && freezes < maxFreezes;
  return { state: { last: today, day }, embers: CHEST_EMBERS[day - 1], freeze, day };
}

export function parseChest(raw: unknown): ChestState {
  if (!raw || typeof raw !== 'object') return EMPTY_CHEST;
  const r = raw as { last?: unknown; day?: unknown };
  const last = typeof r.last === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.last) ? r.last : null;
  const day = typeof r.day === 'number' && Number.isInteger(r.day) && r.day >= 1 && r.day <= CHEST_DAYS ? r.day : 0;
  return last ? { last, day: day || 1 } : EMPTY_CHEST;
}
