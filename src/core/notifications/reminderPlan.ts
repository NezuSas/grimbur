/**
 * When the daily-challenge reminder should fire. Pure, so the rules can be tested:
 *  - one reminder at a time, never a repeating schedule (a player who stops opening the app is not nagged every day);
 *  - it comes in the evening of the local day, when the daily is still open;
 *  - if the daily is already done today, the next reminder is tomorrow evening;
 *  - if the evening has already passed today, the next one is tomorrow evening.
 */
export const REMINDER_HOUR = 19;
export const REMINDER_MINUTE = 0;

export type ReminderKind = 'streak' | 'daily';

export interface ReminderPlan {
  /** When to show it (local time). */
  at: Date;
  /** `streak` when a running streak is at stake, `daily` otherwise. */
  kind: ReminderKind;
  /** Days of streak that the reminder mentions (0 for `daily`). */
  streak: number;
}

const evening = (day: Date): Date => new Date(day.getFullYear(), day.getMonth(), day.getDate(), REMINDER_HOUR, REMINDER_MINUTE, 0, 0);

/**
 * @param now         the current time
 * @param dailyDone   the daily challenge of today has been played
 * @param streak      current streak in days (0 when none)
 */
export function planReminder(now: Date, dailyDone: boolean, streak: number): ReminderPlan {
  const today = evening(now);
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
  const useToday = !dailyDone && now.getTime() < today.getTime();
  const at = useToday ? today : tomorrow;
  // Tomorrow's reminder always finds the streak "at risk": the player has not played that day yet.
  const days = Math.max(0, Math.trunc(streak) || 0);
  return { at, kind: days > 0 ? 'streak' : 'daily', streak: days };
}
