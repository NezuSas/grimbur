import type { LocalStats, RunResult } from './runStats';
import { MAX_ASCENSION } from '../engine/ascension';
import { UPGRADES } from './forge';
import { BEASTS, type BeastId } from './bestiary';
import { masteryOf } from './mastery';
import { ENCOUNTERS } from '../engine/encounters';
import { PUZZLE_COUNT } from '../puzzles/puzzles';
import { MAX_STARS, puzzlesSolved, totalPuzzleStars } from './puzzleProgress';

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
  // The Grimbur
  | 'grimbur_slayer' | 'veteran_slayer' | 'grimbur_bane' | 'speedrunner' | 'lightning'
  // Difficulty
  | 'tempered' | 'ascended' | 'abyssal'
  // Habits
  | 'daily_devotee' | 'week_streak' | 'fortnight_streak' | 'hero_variety' | 'dedicated' | 'obsessed'
  // Endless descent
  | 'beyond' | 'deeper_still' | 'second_lair' | 'abyss_walker' | 'bottomless'
  // More
  | 'ten_runs'
  | 'fifty_runs'
  | 'two_fifty_runs'
  | 'five_hundred_runs'
  | 'depth_4'
  | 'depth_6'
  | 'depth_7'
  | 'depth_9'
  | 'gems_250'
  | 'gems_1000'
  | 'gems_2500'
  | 'gems_5000'
  | 'score_10000'
  | 'score_50000'
  | 'relics_7'
  | 'forge_2'
  | 'forge_6'
  | 'forge_10'
  | 'forge_15'
  | 'forge_20'
  | 'embers_100'
  | 'embers_1000'
  | 'embers_10000'
  | 'embers_25000'
  | 'wins_2'
  | 'wins_3'
  | 'wins_10'
  | 'wins_25'
  | 'wins_50'
  | 'streak_5'
  | 'streak_21'
  | 'streak_30'
  | 'streak_60'
  | 'streak_100'
  | 'endless_12'
  | 'endless_13'
  | 'endless_25'
  | 'endless_35'
  | 'endless_50'
  | 'depth_win_2'
  | 'depth_win_4'
  | 'daily_1'
  | 'daily_5'
  | 'daily_10'
  | 'daily_25'
  | 'daily_50'
  | 'daily_win_1'
  | 'daily_win_5'
  | 'swift'
  | 'blink'
  | 'trophies_10'
  | 'trophies_25'
  | 'trophies_50'
  | 'trophies_75'
  | 'trophies_100'
  | 'win_vael'
  | 'win_sera'
  | 'win_borin'
  | 'win_auric'
  | 'win_mira'
  | 'win_bram'
  | 'all_hero_wins'
  // The hunt (the bestiary)
  | 'hunt_25'
  | 'hunt_100'
  | 'hunt_500'
  | 'hunt_1500'
  | 'bestiary_all'
  | 'hunt_enemy'
  | 'hunt_sleeper'
  | 'hunt_stalker'
  | 'hunt_mimic'
  | 'hunt_thief'
  | 'hunt_brute'
  | 'hunt_warden'
  // Mastery ranks (any hero)
  | 'mastery_silver'
  | 'mastery_gold'
  | 'mastery_platinum'
  | 'mastery_legend'
  // Secret rooms
  | 'secret_1'
  | 'secret_10'
  | 'secret_50'
  // The encounter journal
  | 'enc_all'
  | 'enc_gambler'
  | 'enc_miner'
  // The cave's puzzles
  | 'puzzle_1'
  | 'puzzle_15'
  | 'puzzle_all'
  | 'puzzle_stars'
  | 'puzzle_daily_7'
  | 'puzzle_daily_30'
  | 'puzzle_streak_7'
  | 'puzzle_streak_30'
  | 'puzzle_endless_25'
  // The quick descent
  | 'quick_1'
  | 'quick_10';

/** Translation key of the shared description template, when one applies (`{n}` is the target). */
export type DescKind = 'dailyRuns' | 'dailyWins' | 'achCount' | 'heroWin' | 'winTime' | 'floor' | 'gems' | 'games' | 'score' | 'relics' | 'streak' | 'wins' | 'forge' | 'embers' | 'endless' | 'depthWin' | 'slain' | 'bestiary' | 'beast' | 'mastery' | 'secrets' | 'encounters' | 'puzzles' | 'puzzleStars' | 'puzzleDaily' | 'puzzleStreak' | 'puzzleEndless' | 'quickWins';

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
export const HERO_COUNT = 6;

/** The highest mastery level of any hero. */
const topMastery = (s: LocalStats) => Math.max(0, ...(s.heroXp ?? []).map(xp => masteryOf(xp).level));

/** Every creature defeated (or thief caught) over all runs. */
export const totalSlain = (s: LocalStats) => Object.values(s.bestiary?.slain ?? {}).reduce((sum: number, n) => sum + (n ?? 0), 0);
const slainOf = (b: BeastId) => (s: LocalStats) => s.bestiary?.slain?.[b] ?? 0;
/** A hunter's mark on one creature: `params.b` is its place in BEASTS (the description names it). */
const hunt = (id: AchievementId, icon: string, tier: AchievementTier, beast: BeastId, target: number): AchievementInfo => ({
  ...counted(id, icon, tier, 'beast', target, slainOf(beast)),
  params: { n: target, b: BEASTS.indexOf(beast) },
});

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
  inRun('warm_up', '🌡️', 'easy', 'score', 1000, r => r.score >= 1000 && (r.mode ?? 'expedition') !== 'endless'),
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

  // ── The Grimbur ──────────────────────────────────────────────────────────
  counted('grimbur_slayer', '🗡️', 'hard', 'wins', 1, s => s.victories),
  counted('veteran_slayer', '🛡️', 'hard', 'wins', 5, s => s.victories),
  counted('grimbur_bane', '🏆', 'legend', 'wins', 15, s => s.victories),
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
  inRun('abyssal', '🩸', 'legend', 'depthWin', MAX_ASCENSION, r => victoryAt(r, MAX_ASCENSION)),

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

  // ── More: ladders for every counter, per-hero and daily goals, speed, trophies ─────────
  counted('ten_runs', '🎲', 'easy', 'games', 10, s => s.gamesPlayed),
  counted('fifty_runs', '🧩', 'medium', 'games', 50, s => s.gamesPlayed),
  counted('two_fifty_runs', '🔁', 'hard', 'games', 250, s => s.gamesPlayed),
  counted('five_hundred_runs', '🏰', 'legend', 'games', 500, s => s.gamesPlayed),
  counted('depth_4', '🪨', 'easy', 'floor', 4, s => s.bestLevel),
  counted('depth_6', '🧱', 'medium', 'floor', 6, s => s.bestLevel),
  counted('depth_7', '🌑', 'medium', 'floor', 7, s => s.bestLevel),
  counted('depth_9', '🔦', 'medium', 'floor', 9, s => s.bestLevel),
  counted('gems_250', '🔷', 'medium', 'gems', 250, s => s.totalGems),
  counted('gems_1000', '🪩', 'hard', 'gems', 1000, s => s.totalGems),
  counted('gems_2500', '🏔️', 'hard', 'gems', 2500, s => s.totalGems),
  counted('gems_5000', '🌈', 'legend', 'gems', 5000, s => s.totalGems),
  inRun('score_10000', '🎆', 'hard', 'score', 10000, r => r.score >= 10000 && (r.mode ?? 'expedition') !== 'endless'),
  inRun('score_50000', '🌟', 'legend', 'score', 50000, r => r.score >= 50000 && (r.mode ?? 'expedition') !== 'endless'),
  inRun('relics_7', '🪬', 'hard', 'relics', 7, r => (r.relics ?? 0) >= 7),
  counted('forge_2', '🔧', 'easy', 'forge', 2, forgeLevels),
  counted('forge_6', '⚙️', 'medium', 'forge', 6, forgeLevels),
  counted('forge_10', '🏭', 'hard', 'forge', 10, forgeLevels),
  counted('forge_15', '🔱', 'hard', 'forge', 15, forgeLevels),
  counted('forge_20', '⭐', 'legend', 'forge', 20, forgeLevels),
  counted('embers_100', '🔆', 'easy', 'embers', 100, s => s.lifetimeEmbers),
  counted('embers_1000', '🧨', 'medium', 'embers', 1000, s => s.lifetimeEmbers),
  counted('embers_10000', '🌞', 'hard', 'embers', 10000, s => s.lifetimeEmbers),
  counted('embers_25000', '☀️', 'legend', 'embers', 25000, s => s.lifetimeEmbers),
  counted('wins_2', '🥈', 'hard', 'wins', 2, s => s.victories),
  counted('wins_3', '🥉', 'hard', 'wins', 3, s => s.victories),
  counted('wins_10', '🎖️', 'hard', 'wins', 10, s => s.victories),
  counted('wins_25', '🏵️', 'legend', 'wins', 25, s => s.victories),
  counted('wins_50', '💀', 'legend', 'wins', 50, s => s.victories),
  counted('streak_5', '🌤️', 'easy', 'streak', 5, s => s.streak),
  counted('streak_21', '🌙', 'hard', 'streak', 21, s => s.streak),
  counted('streak_30', '📆', 'hard', 'streak', 30, s => s.streak),
  counted('streak_60', '🌕', 'legend', 'streak', 60, s => s.streak),
  counted('streak_100', '💯', 'legend', 'streak', 100, s => s.streak),
  counted('endless_12', '🚶', 'medium', 'endless', 12, s => s.bestEndlessFloor),
  counted('endless_13', '🐈‍⬛', 'medium', 'endless', 13, s => s.bestEndlessFloor),
  counted('endless_25', '🧭', 'hard', 'endless', 25, s => s.bestEndlessFloor),
  counted('endless_35', '🪂', 'legend', 'endless', 35, s => s.bestEndlessFloor),
  counted('endless_50', '🎇', 'legend', 'endless', 50, s => s.bestEndlessFloor),
  inRun('depth_win_2', '🌪️', 'hard', 'depthWin', 2, r => victoryAt(r, 2)),
  inRun('depth_win_4', '🐲', 'legend', 'depthWin', 4, r => victoryAt(r, 4)),
  counted('daily_1', '🗺️', 'easy', 'dailyRuns', 1, s => s.dailyRuns),
  counted('daily_5', '📌', 'easy', 'dailyRuns', 5, s => s.dailyRuns),
  counted('daily_10', '📖', 'medium', 'dailyRuns', 10, s => s.dailyRuns),
  counted('daily_25', '📚', 'hard', 'dailyRuns', 25, s => s.dailyRuns),
  counted('daily_50', '🏯', 'legend', 'dailyRuns', 50, s => s.dailyRuns),
  counted('daily_win_1', '🎉', 'medium', 'dailyWins', 1, s => s.dailyWins),
  counted('daily_win_5', '🎩', 'hard', 'dailyWins', 5, s => s.dailyWins),
  { id: 'swift', icon: '🐇', tier: 'hard', desc: 'winTime', params: { n: 8 }, isMet: (_s, r) => r.victory === true && (r.mode ?? 'expedition') !== 'endless' && r.time !== undefined && r.time < 8 * 60 },
  { id: 'blink', icon: '💨', tier: 'legend', desc: 'winTime', params: { n: 5 }, isMet: (_s, r) => r.victory === true && (r.mode ?? 'expedition') !== 'endless' && r.time !== undefined && r.time < 5 * 60 },
  counted('trophies_10', '🎀', 'easy', 'achCount', 10, s => Object.keys(s.achievements).length),
  counted('trophies_25', '🥇', 'medium', 'achCount', 25, s => Object.keys(s.achievements).length),
  counted('trophies_50', '🗿', 'hard', 'achCount', 50, s => Object.keys(s.achievements).length),
  counted('trophies_75', '🎗️', 'legend', 'achCount', 75, s => Object.keys(s.achievements).length),
  counted('trophies_100', '🌠', 'legend', 'achCount', 100, s => Object.keys(s.achievements).length),
  { id: 'win_vael', icon: '🧙', tier: 'hard', desc: 'heroWin', params: { n: 0 }, isMet: s => (s.heroWins[0] ?? 0) >= 1 },
  { id: 'win_sera', icon: '🏹', tier: 'hard', desc: 'heroWin', params: { n: 1 }, isMet: s => (s.heroWins[1] ?? 0) >= 1 },
  { id: 'win_borin', icon: '🪖', tier: 'hard', desc: 'heroWin', params: { n: 2 }, isMet: s => (s.heroWins[2] ?? 0) >= 1 },
  { id: 'win_auric', icon: '🤑', tier: 'hard', desc: 'heroWin', params: { n: 3 }, isMet: s => (s.heroWins[3] ?? 0) >= 1 },
  { id: 'win_mira', icon: '🏮', tier: 'hard', desc: 'heroWin', params: { n: 4 }, isMet: s => (s.heroWins[4] ?? 0) >= 1 },
  { id: 'win_bram', icon: '💣', tier: 'hard', desc: 'heroWin', params: { n: 5 }, isMet: s => (s.heroWins[5] ?? 0) >= 1 },
  { id: 'all_hero_wins', icon: '🏛️', tier: 'legend', params: {}, isMet: s => s.heroWins.length >= HERO_COUNT && s.heroWins.every(n => n >= 1), progress: s => ({ current: s.heroWins.filter(n => n >= 1).length, target: HERO_COUNT }) },
  // ── The hunt ────────────────────────────────────────────────────────────
  counted('hunt_25', '🐾', 'easy', 'slain', 25, totalSlain),
  counted('hunt_100', '🪓', 'medium', 'slain', 100, totalSlain),
  counted('hunt_500', '🦴', 'hard', 'slain', 500, totalSlain),
  counted('hunt_1500', '🐺', 'legend', 'slain', 1500, totalSlain),
  counted('bestiary_all', '🦎', 'hard', 'bestiary', BEASTS.length, s => s.bestiary?.met.length ?? 0),
  hunt('hunt_enemy', '🪦', 'medium', 'enemy', 60),
  hunt('hunt_sleeper', '💤', 'medium', 'sleeper', 30),
  hunt('hunt_stalker', '👁️', 'hard', 'stalker', 30),
  hunt('hunt_mimic', '📦', 'hard', 'mimic', 20),
  hunt('hunt_thief', '🪤', 'hard', 'thief', 15),
  hunt('hunt_brute', '⚔️', 'hard', 'brute', 15),
  hunt('hunt_warden', '♨️', 'hard', 'warden', 10),
  // ── Mastery ranks ───────────────────────────────────────────────────────
  counted('mastery_silver', '🔘', 'hard', 'mastery', 20, topMastery),
  counted('mastery_gold', '🟡', 'hard', 'mastery', 30, topMastery),
  counted('mastery_platinum', '🔹', 'legend', 'mastery', 40, topMastery),
  counted('mastery_legend', '🟣', 'legend', 'mastery', 50, topMastery),
  // ── Secret rooms ────────────────────────────────────────────────────────
  counted('secret_1', '🗝️', 'easy', 'secrets', 1, s => s.secretsFound ?? 0),
  counted('secret_10', '🔑', 'medium', 'secrets', 10, s => s.secretsFound ?? 0),
  counted('secret_50', '📜', 'hard', 'secrets', 50, s => s.secretsFound ?? 0),
  // ── The encounter journal ───────────────────────────────────────────────
  counted('enc_all', '🛤️', 'hard', 'encounters', ENCOUNTERS.length, s => s.encounterBook?.seen.length ?? 0),
  { ...counted('enc_gambler', '🃏', 'medium', 'encounters', 5, s => s.encounterBook?.gamblesWon ?? 0), desc: undefined },
  { ...counted('enc_miner', '⛑️', 'medium', 'encounters', 3, s => s.encounterBook?.minersFreed ?? 0), desc: undefined },
  // ── The cave's puzzles ──────────────────────────────────────────────────
  counted('puzzle_1', '💡', 'easy', 'puzzles', 1, s => puzzlesSolved(s.puzzles)),
  counted('puzzle_15', '🔎', 'medium', 'puzzles', 15, s => puzzlesSolved(s.puzzles)),
  counted('puzzle_all', '🧠', 'hard', 'puzzles', PUZZLE_COUNT, s => puzzlesSolved(s.puzzles)),
  counted('puzzle_stars', '💫', 'legend', 'puzzleStars', PUZZLE_COUNT * MAX_STARS, s => totalPuzzleStars(s.puzzles)),
  counted('puzzle_daily_7', '🔍', 'medium', 'puzzleDaily', 7, s => s.puzzles?.dailySolved ?? 0),
  counted('puzzle_daily_30', '🎓', 'hard', 'puzzleDaily', 30, s => s.puzzles?.dailySolved ?? 0),
  counted('puzzle_streak_7', '🪔', 'medium', 'puzzleStreak', 7, s => s.puzzles?.bestStreak ?? 0),
  counted('puzzle_streak_30', '🔭', 'legend', 'puzzleStreak', 30, s => s.puzzles?.bestStreak ?? 0),
  counted('puzzle_endless_25', '🪐', 'hard', 'puzzleEndless', 25, s => s.puzzles?.endless?.solved ?? 0),
  // ── The quick descent ───────────────────────────────────────────────────
  counted('quick_1', '🏃', 'easy', 'quickWins', 1, s => s.quickWins ?? 0),
  counted('quick_10', '⏱️', 'medium', 'quickWins', 10, s => s.quickWins ?? 0),
];

/** Embers paid when an achievement is unlocked: a reason to go after them and spend them in the Forge. */
export const ACHIEVEMENT_REWARD: Record<AchievementTier, number> = { easy: 10, medium: 25, hard: 60, legend: 150 };

export const TIER_ORDER: Record<AchievementTier, number> = { easy: 0, medium: 1, hard: 2, legend: 3 };

/**
 * Achievements the player has not unlocked yet but just earned. Repeats until nothing new appears, because some
 * achievements count the others (the trophy ones).
 */
export function newAchievements(stats: LocalStats, run: RunResult): AchievementId[] {
  const known: Record<string, string> = { ...stats.achievements };
  const earned: AchievementId[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    const probe = { ...stats, achievements: known };
    for (const a of ACHIEVEMENTS) {
      if (a.id in known || !a.isMet(probe, run)) continue;
      known[a.id] = 'pending';
      earned.push(a.id);
      changed = true;
    }
  }
  return earned;
}

/** Embers an unlocked set of achievements pays. */
export const rewardFor = (ids: readonly AchievementId[]): number =>
  ids.reduce((sum, id) => sum + ACHIEVEMENT_REWARD[ACHIEVEMENTS.find(a => a.id === id)?.tier ?? 'easy'], 0);

/** Returns `stats` with the given achievements marked as unlocked on `dateKey` and their embers paid. */
export function withAchievements(stats: LocalStats, ids: readonly AchievementId[], dateKey: string): LocalStats {
  if (ids.length === 0) return stats;
  const achievements = { ...stats.achievements };
  for (const id of ids) achievements[id] = dateKey;
  const reward = rewardFor(ids);
  return { ...stats, achievements, embers: stats.embers + reward, lifetimeEmbers: stats.lifetimeEmbers + reward };
}

/** At most `max` names are listed on the game over; the rest becomes "and N more". */
export const MAX_LISTED_ACHIEVEMENTS = 3;
export function splitNames<T>(items: readonly T[], max = MAX_LISTED_ACHIEVEMENTS): { shown: T[]; more: number } {
  const limit = Math.max(1, Math.trunc(max) || 1);
  return { shown: items.slice(0, limit), more: Math.max(0, items.length - limit) };
}
