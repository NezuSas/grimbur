import type { LocalStats, RunResult } from './runStats';

/**
 * Achievements are evaluated from the persisted stats plus the run that just ended. They are
 * pure data + predicates, so adding one is a single entry (and its two translations).
 */
export type AchievementId =
  | 'first_descent'
  | 'halfway'
  | 'deep_diver'
  | 'wumpus_slayer'
  | 'speedrunner'
  | 'relic_hoarder'
  | 'high_roller'
  | 'collector'
  | 'daily_devotee'
  | 'hero_variety';

export interface AchievementInfo {
  id: AchievementId;
  icon: string;
  /** Values interpolated into the translated description. */
  params: Record<string, number>;
  isMet(stats: LocalStats, run: RunResult): boolean;
}

export const SPEEDRUN_SECONDS = 10 * 60;
export const HOARDER_RELICS = 6;
export const HIGH_ROLLER_SCORE = 5000;
export const COLLECTOR_GEMS = 100;
export const DEVOTEE_DAYS = 3;
export const HERO_COUNT = 4;

export const ACHIEVEMENTS: readonly AchievementInfo[] = [
  { id: 'first_descent', icon: '🪜', params: { floor: 2 }, isMet: s => s.bestLevel >= 2 },
  { id: 'halfway', icon: '⛏️', params: { floor: 5 }, isMet: s => s.bestLevel >= 5 },
  { id: 'deep_diver', icon: '🕳️', params: { floor: 8 }, isMet: s => s.bestLevel >= 8 },
  { id: 'wumpus_slayer', icon: '👑', params: {}, isMet: s => s.victories >= 1 },
  {
    id: 'speedrunner',
    icon: '⚡',
    params: { minutes: SPEEDRUN_SECONDS / 60 },
    isMet: (_s, r) => r.victory === true && r.time !== undefined && r.time < SPEEDRUN_SECONDS,
  },
  {
    id: 'relic_hoarder',
    icon: '🏺',
    params: { count: HOARDER_RELICS },
    isMet: (_s, r) => (r.relics ?? 0) >= HOARDER_RELICS,
  },
  { id: 'high_roller', icon: '💰', params: { score: HIGH_ROLLER_SCORE }, isMet: (_s, r) => r.score >= HIGH_ROLLER_SCORE },
  { id: 'collector', icon: '💎', params: { count: COLLECTOR_GEMS }, isMet: s => s.totalGems >= COLLECTOR_GEMS },
  { id: 'daily_devotee', icon: '📅', params: { days: DEVOTEE_DAYS }, isMet: s => s.streak >= DEVOTEE_DAYS },
  { id: 'hero_variety', icon: '🎭', params: {}, isMet: s => s.heroesUsed.length >= HERO_COUNT },
];

/** Achievements the player has not unlocked yet but just earned. */
export function newAchievements(stats: LocalStats, run: RunResult): AchievementId[] {
  return ACHIEVEMENTS.filter(a => !(a.id in stats.achievements) && a.isMet(stats, run)).map(a => a.id);
}

/** Returns `stats` with the given achievements marked as unlocked on `dateKey`. */
export function withAchievements(stats: LocalStats, ids: readonly AchievementId[], dateKey: string): LocalStats {
  if (ids.length === 0) return stats;
  const achievements = { ...stats.achievements };
  for (const id of ids) achievements[id] = dateKey;
  return { ...stats, achievements };
}
