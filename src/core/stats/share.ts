import { dayNumber } from '../engine/seed';

/** Day #1 of the daily challenge. Fixed forever: every shared result says "#N" counted from here. */
export const DAILY_EPOCH = '2026-10-01';

/** The number of the daily on `dateKey` (#1 on the epoch; never below 1, even for older or malformed keys). */
export function dailyNumber(dateKey: string): number {
  const n = dayNumber(dateKey) - dayNumber(DAILY_EPOCH) + 1;
  return Number.isFinite(n) ? Math.max(1, n) : 1;
}

export const PIP_CLEARED = '🟩';
export const PIP_DEATH = '🟥';
export const PIP_UNREACHED = '⬛';
export const PIP_GRIMBUR = '👑';

/**
 * One pip per floor: green for each floor cleared, red for the floor the hero died on, a crown when the Grimbur
 * (the last floor) was slain, black for the floors never reached.
 */
export function dailyPips(level: number, floors: number, victory: boolean): string {
  const total = Math.max(1, Math.trunc(floors) || 1);
  const reached = Math.min(total, Math.max(1, Math.trunc(level) || 1));
  const pips: string[] = [];
  for (let floor = 1; floor <= total; floor++) {
    if (victory) pips.push(floor === total ? PIP_GRIMBUR : PIP_CLEARED);
    else if (floor < reached) pips.push(PIP_CLEARED);
    else if (floor === reached) pips.push(PIP_DEATH);
    else pips.push(PIP_UNREACHED);
  }
  return pips.join('');
}

export interface DailyShareInput {
  dateKey: string;
  level: number;
  floors: number;
  victory: boolean;
  /** Translated pieces: the line under the pips ("1,234 pts"), the streak ("3-day streak", may be empty), the title and the invitation. */
  title: (number: number) => string;
  scoreText: string;
  streakText?: string;
  footer?: string;
}

/** The Wordle-style text of a daily result. Pure and translation-free: the caller supplies the wording. */
export function buildDailyShareText(input: DailyShareInput): string {
  const lines = [
    input.title(dailyNumber(input.dateKey)),
    dailyPips(input.level, input.floors, input.victory),
    [input.scoreText, input.streakText ? `🔥 ${input.streakText.trim()}` : ''].filter(Boolean).join(' · '),
  ];
  if (input.footer) lines.push(input.footer);
  return lines.join('\n');
}
