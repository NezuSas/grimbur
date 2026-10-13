import type { LocalStats, RunResult } from './runStats';
import { MAX_ASCENSION } from '../engine/ascension';
import { UPGRADES } from './forge';

/**
 * Achievements are evaluated from the persisted stats plus the run that just ended. They are
 * pure data + predicates, so adding one is a single entry (and its translations).
 *
 * `tier` says how hard it is (shown on the card); `progress` lets cumulative ones show a bar.
 */
export type AchievementTier = 'easy' | 'medium' | 'hard' | 'legend';

export type AchievementId =
  // Getting started
  | 'first_steps' | 'first_descent' | 'cave_dweller' | 'first_gems' | 'first_relic' | 'first_forge' | 'warm_up' | 'regular'
  // Going deeper
  | 'halfway' | 'deep_diver' | 'edge_of_lair'
  // Treasure
  | 'gem_hoard' | 'collector' | 'gem_dragon' | 'pocket_change' | 'high_roller' | 'big_game' | 'legendary_haul'
  // Builds
  | 'relic_trio' | 'relic_hoarder' | 'relic_master' | 'smith' | 'master_smith' | 'ember_collector' | 'ember_baron'
  // The Wumpus
  | 'wumpus_slayer' | 'veteran_slayer' | 'wumpus_bane' | 'speedrunner' | 'lightning'
  // Difficulty
  | 'tempered' | 'ascended' | 'abyssal'
  // Habits
  | 'daily_devotee' | 'week_streak' | 'fortnight_streak' | 'hero_variety' | 'dedicated' | 'obsessed'
  // Endless descent
  | 'beyond' | 'deeper_still' | 'second_lair' | 'abyss_walker' | 'bottomless';

/** Translation key of the shared description template, when one applies (`{n}` is the target). */
export type DescKind = 'floor' | 'gems' | 'games' | 'score' | 'relics' | 'streak' | 'wins' | 'forge' | 'embers' | 'endless' | 'depthWin';

export interface AchievementInfo {
  id: AchievementId;
  icon: string;
  tier: AchievementTier;
  /** Values interpolated into the translated description. */
  params: Record<string, number>;
  /** Shared description (`ach.d.<kind>`) used instead of a bespoke `ach.<id>.desc`. */
  desc?: DescKind;
  isMet(stats: LocalStats, run: RunResult): boolean;
  /** Current and target value for cumulative achievements. */
  progress?(stats: LocalStats): { current: number; target: number };
}

export const SPEEDRUN_SECONDS = 10 * 60;
export const LIGHTNING_SECONDS = 6 * 60;
export const HOARDER_RELICS = 6;
export const HIGH_ROLLER_SCORE = 5000;
export const COLLECTOR_GEMS = 100;
export const DEVOTEE_DAYS = 3;
export const HERO_COUNT = 4;

const forgeLevels = (s: LocalStats) => Object.values(s.forge).reduce((sum, n) => sum + n, 0);
const forgeTotal = UPGRADES.reduce((sum, u) => sum + u.costs.length, 0);
const victoryAt = (r: RunResult, depth: number) => r.victory === true && (r.mode ?? 'expedition') !== 'endless' && (r.ascension ?? 0) >= depth;

/** A cumulative achievement: the predicate and the progress bar come from one number. */
const counted = (
  id: AchievementId,
  icon: string,
  tier: AchievementTier,
  desc: DescKind,
  target: number,
  value: (s: LocalStats) => number,
): AchievementInfo => ({
  id,
  icon,
  tier,
  desc,
  params: { n: target },
  isMet: s => value(s) >= target,
  progress: s => ({ current: Math.min(value(s), target), target }),
});

/** An achievement earned by a single run. */
const inRun = (
  id: AchievementId,
  icon: string,
  tier: AchievementTier,
  desc: DescKind,
  target: number,
  met: (r: RunResult) => boolean,
): AchievementInfo => ({ id, icon, tier, desc, params: { n: target }, isMet: (_s, r) => met(r) });

export const ACHIEVEMENTS: readonly AchievementInfo[] = [
  // ── Getting started ─────────────────────────────────────────────────────
  counted('first_steps', '👣', 'easy', 'games', 1, s => s.gamesPlayed),
  counted('first_descent', '🪜', 'easy', 'floor', 2, s => s.bestLevel),
  counted('cave_dweller', '🕯️', 'easy', 'floor', 3, s => s.bestLevel),
  counted('first_gems', '✨', 'easy', 'gems', 10, s => s.totalGems),
  inRun('first_relic', '🔮', 'easy', 'relics', 1, r => (r.relics ?? 0) >= 1),
  counted('first_forge', '🔨', 'easy', 'forge', 1, forgeLevels),
  inRun('warm_up', '🔥', 'easy', 'score', 1000, r => r.score >= 1000 && (r.mode ?? 'expedition') !== 'endless'),
  counted('regular', '🎒', 'easy', 'games', 5, s => s.gamesPlayed),

  // ── Going deeper ────────────────────────────────────────────────────────
  counted('halfway', '⛏️', 'medium', 'floor', 5, s => s.bestLevel),
  counted('deep_diver', '🕳️', 'medium', 'floor', 8, s => s.bestLevel),
  counted('edge_of_lair', '🚪', 'medium', 'floor', 10, s => s.bestLevel),

  // ── Treasure ────────────────────────────────────────────────────────────
  counted('gem_hoard', '💠', 'easy', 'gems', 50, s => s.totalGems),
  counted('collector', '💎', 'medium', 'gems', COLLECTOR_GEMS, s => s.totalGems),
  counted('gem_dragon', '🐉', 'hard', 'gems', 500, s => s.totalGems),
  inRun('pocket_change', '🪙', 'easy', 'score', 2500, r => r.score >= 2500 && (r.mode ?? 'expedition') !== 'endless'),
  inRun('high_roller', '💰', 'medium', 'score', HIGH_ROLLER_SCORE, r => r.score >= HIGH_ROLLER_SCORE && (r.mode ?? 'expedition') !== 'endless'),
  inRun('big_game', '🎰', 'hard', 'score', 15000, r => r.score >= 15000 && (r.mode ?? 'expedition') !== 'endless'),
  inRun('legendary_haul', '👑', 'legend', 'score', 30000, r => r.score >= 30000 && (r.mode ?? 'expedition') !== 'endless'),

  // ── Builds ──────────────────────────────────────────────────────────────
  inRun('relic_trio', '🧿', 'easy', 'relics', 3, r => (r.relics ?? 0) >= 3),
  inRun('relic_hoarder', '🏺', 'medium', 'relics', HOARDER_RELICS, r => (r.relics ?? 0) >= HOARDER_RELICS),
  inRun('relic_master', '📿', 'hard', 'relics', 9, r => (r.relics ?? 0) >= 9),
  counted('smith', '⚒️', 'medium', 'forge', 4, forgeLevels),
  counted('master_smith', '🛠️', 'legend', 'forge', forgeTotal, forgeLevels),
  counted('ember_collector', '🌋', 'medium', 'embers', 500, s => s.lifetimeEmbers),
  counted('ember_baron', '☄️', 'hard', 'embers', 3000, s => s.lifetimeEmbers),

  // ── The Wumpus ──────────────────────────────────────────────────────────
  counted('wumpus_slayer', '🗡️', 'hard', 'wins', 1, s => s.victories),
  counted('veteran_slayer', '🛡️', 'hard', 'wins', 5, s => s.victories),
  counted('wumpus_bane', '🏆', 'legend', 'wins', 15, s => s.victories),
  {
    id: 'speedrunner',
    icon: '⚡',
    tier: 'hard',
    params: { minutes: SPEEDRUN_SECONDS / 60 },
    isMet: (_s, r) => r.victory === true && (r.mode ?? 'expedition') !== 'endless' && r.time !== undefined && r.time < SPEEDRUN_SECONDS,
  },
  {
    id: 'lightning',
    icon: '🌩️',
    tier: 'legend',
    params: { minutes: LIGHTNING_SECONDS / 60 },
    isMet: (_s, r) => r.victory === true && (r.mode ?? 'expedition') !== 'endless' && r.time !== undefined && r.time < LIGHTNING_SECONDS,
  },

  // ── Difficulty ──────────────────────────────────────────────────────────
  inRun('tempered', '🔰', 'hard', 'depthWin', 1, r => victoryAt(r, 1)),
  inRun('ascended', '🔥', 'legend', 'depthWin', 3, r => victoryAt(r, 3)),
  inRun('abyssal', '🌋', 'legend', 'depthWin', MAX_ASCENSION, r => victoryAt(r, MAX_ASCENSION)),

  // ── Habits ──────────────────────────────────────────────────────────────
  counted('daily_devotee', '📅', 'easy', 'streak', DEVOTEE_DAYS, s => s.streak),
  counted('week_streak', '🗓️', 'medium', 'streak', 7, s => s.streak),
  counted('fortnight_streak', '🏅', 'hard', 'streak', 14, s => s.streak),
  {
    id: 'hero_variety',
    icon: '🎭',
    tier: 'medium',
    params: {},
    isMet: s => s.heroesUsed.length >= HERO_COUNT,
    progress: s => ({ current: Math.min(s.heroesUsed.length, HERO_COUNT), target: HERO_COUNT }),
  },
  counted('dedicated', '🎮', 'medium', 'games', 25, s => s.gamesPlayed),
  counted('obsessed', '🌀', 'hard', 'games', 100, s => s.gamesPlayed),

  // ── Endless descent ─────────────────────────────────────────────────────
  counted('beyond', '🌌', 'medium', 'endless', 11, s => s.bestEndlessFloor),
  counted('deeper_still', '🧗', 'hard', 'endless', 15, s => s.bestEndlessFloor),
  counted('second_lair', '👹', 'hard', 'endless', 20, s => s.bestEndlessFloor),
  counted('abyss_walker', '🕸️', 'legend', 'endless', 30, s => s.bestEndlessFloor),
  counted('bottomless', '♾️', 'legend', 'endless', 40, s => s.bestEndlessFloor),
];

export const TIER_ORDER: Record<AchievementTier, number> = { easy: 0, medium: 1, hard: 2, legend: 3 };

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
