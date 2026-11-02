import { dailySeed, daysBetween, msUntilNextDay, shiftDayKey } from '../engine/seed';
import { LEGEND_TIER, generatePuzzle, type Puzzle } from './puzzles';

/**
 * The Grimbur's weekly challenge: one Legend-sized board a week (Monday to Sunday), the same for everyone. Only the first try
 * counts: it starts when the board is opened, one mistake ends it, no hints, and leaving it half done counts as a failed try.
 * Solving it on that first try pays embers and puts the time on the friends' board; afterwards it can be practised freely.
 */
export const WEEKLY_EMBERS = 40;
/** The first week of the challenge (a Monday): it numbers them. */
export const WEEKLY_EPOCH = '2026-11-02';

/** The Monday (yyyy-mm-dd) of the week of a day. */
export function weekOf(dateKey: string): string {
  const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
  return shiftDayKey(dateKey, -((day + 6) % 7));
}

/** The challenge's number: #1 on the first week. */
export const weeklyNumber = (week: string): number => Math.max(1, Math.floor(daysBetween(WEEKLY_EPOCH, week) / 7) + 1);

/** The week's board. */
export const weeklyPuzzle = (week: string): Puzzle => ({ ...generatePuzzle(dailySeed(`weekly:${week}`), LEGEND_TIER), biome: 'lair' });

/** Milliseconds until the week ends (Sunday's midnight, local time). */
export function msUntilWeekEnd(today: string, now: Date = new Date()): number {
  const day = new Date(`${today}T12:00:00Z`).getUTCDay();
  const daysAfterToday = (7 - day) % 7;
  return msUntilNextDay(now) + daysAfterToday * 86_400_000;
}
