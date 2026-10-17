/**
 * The daily and weekly boards. A daily result is one document per player per day (`<day>_<playerId>`), so replaying the day only
 * improves it; the same document also carries the ISO week, which is what the weekly board reads (the best results of the week).
 * The limits mirror `firestore.rules`.
 */

/** `2026-10-17` (a local calendar day, as the daily challenge keys it). */
export const DAY_PATTERN = /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const WEEK_PATTERN = /^20\d\d-W(0[1-9]|[1-4]\d|5[0-3])$/;
/** A player id: 16 characters of the recovery-key alphabet (see core/cloud/cloudKey.ts). */
export const PLAYER_ID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{16}$/;
/** The daily challenge is a ten-floor expedition. */
export const DAILY_MAX_LEVEL = 10;

const parseDay = (dayKey: string): Date | null => {
  if (!DAY_PATTERN.test(dayKey)) return null;
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
};

/** The ISO week (Monday to Sunday, week 1 holds the first Thursday) of a day, as `2026-W42`; null for something that is not a day. */
export function weekKey(dayKey: string): string | null {
  const date = parseDay(dayKey);
  if (!date) return null;
  const weekday = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - weekday + 3); // the Thursday of this week decides the year
  const year = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstWeekday = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstWeekday + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** The id of a player's document for a day. */
export const dailyDocId = (dayKey: string, playerId: string): string => `${dayKey}_${playerId}`;

export interface DailySubmission {
  day: string;
  week: string;
  pid: string;
  name: string;
  level: number;
  score: number;
  coins: number;
  characterIndex: number;
  time: number;
}

/** What is wrong with a daily result (empty when it is fine). Name rules live in validation.ts. */
export function validateDaily(row: DailySubmission): string[] {
  const problems: string[] = [];
  if (!DAY_PATTERN.test(row.day)) problems.push('day');
  if (row.week !== weekKey(row.day)) problems.push('week');
  if (!PLAYER_ID_PATTERN.test(row.pid)) problems.push('player');
  if (!Number.isInteger(row.level) || row.level < 1 || row.level > DAILY_MAX_LEVEL) problems.push('level');
  if (!Number.isInteger(row.score) || row.score < 0 || row.score > row.level * 20000) problems.push('score');
  if (!Number.isInteger(row.coins) || row.coins < 0 || row.coins > row.level * 8) problems.push('coins');
  if (!Number.isInteger(row.characterIndex) || row.characterIndex < 0 || row.characterIndex > 5) problems.push('hero');
  if (!Number.isInteger(row.time) || row.time < (row.level - 1) * 5 + 1 || row.time > 86400) problems.push('time');
  return problems;
}
