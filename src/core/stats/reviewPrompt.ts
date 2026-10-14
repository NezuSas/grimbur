import { LocalStats, currentStreak } from './runStats';

/** Minimum finished runs before a rating request is considered. */
export const REVIEW_MIN_RUNS = 3;
export const REVIEW_MIN_STREAK = 3;
/** At most one request in this many days (the OS also rate-limits on its own). */
export const REVIEW_COOLDOWN_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

/** True when the latest finished run was an expedition victory played today. */
export function justWonExpedition(stats: LocalStats, today: string): boolean {
  const last = stats.history[stats.history.length - 1];
  return !!last && last.victory && last.mode === 'expedition' && last.day === today;
}

/**
 * Whether the cover screen may ask for a store rating now: a happy moment (a fresh victory or a streak),
 * a player who has actually played, never the first run, and not again within the cooldown.
 * `lastAskedAt` is the epoch ms of the previous request (0 = never).
 */
export function shouldRequestReview(stats: LocalStats, today: string, now: number, lastAskedAt: number): boolean {
  if (stats.gamesPlayed < REVIEW_MIN_RUNS) return false; // also covers the first run
  if (lastAskedAt > 0 && now - lastAskedAt < REVIEW_COOLDOWN_DAYS * DAY_MS && now >= lastAskedAt) return false;
  return justWonExpedition(stats, today) || currentStreak(stats, today) >= REVIEW_MIN_STREAK;
}
