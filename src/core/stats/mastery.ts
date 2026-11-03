import type { RunResult } from './runStats';

/**
 * Hero mastery: every finished run with a hero gives that hero experience, kept for good (a level is a total to reach,
 * nothing is spent). It is prestige only, like the champion mastery of big online games: it never changes a run, so playing
 * one hero a lot is no edge over anyone. Level ten earns the hero's title; past it the levels never stop, each asking a
 * little more. Derived from `heroXp` only, so a restored backup restores it too.
 */
export const MASTERY_XP: readonly number[] = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
/** The level that completes the edges (and earns the hero's title); mastery goes on past it with no cap. */
export const MAX_MASTERY = MASTERY_XP.length;
/** Experience of the first level past MAX_MASTERY, and how much more each following one asks. */
export const XP_PAST_TOP = 800;
export const XP_PAST_TOP_STEP = 50;

/** Total experience at which `level` starts (1-based, any level). */
export function masteryThreshold(level: number): number {
  const l = Math.max(1, Math.trunc(level));
  if (l <= MAX_MASTERY) return MASTERY_XP[l - 1];
  const extra = l - MAX_MASTERY; // levels past the top
  return MASTERY_XP[MAX_MASTERY - 1] + extra * XP_PAST_TOP + (XP_PAST_TOP_STEP * (extra - 1) * extra) / 2;
}

/** Experience per floor reached (counted up to the tenth) and for a victory, plus per depth won at. */
export const XP_PER_FLOOR = 10;
export const XP_VICTORY = 60;
export const XP_PER_DEPTH = 20;

/** Experience a finished run gives its hero (a run that never started gives none). */
export function masteryXpFor(run: Pick<RunResult, 'level' | 'victory' | 'ascension'>, progressed = true): number {
  if (!progressed) return 0;
  const floors = Math.min(10, Math.max(1, Math.trunc(Number.isFinite(run.level) ? run.level : 1)));
  const won = run.victory ? XP_VICTORY + XP_PER_DEPTH * Math.max(0, Math.trunc(run.ascension ?? 0)) : 0;
  return floors * XP_PER_FLOOR + won;
}

export interface MasteryInfo {
  level: number;
  xp: number;
  from: number;
  /** Where the next level starts (there always is one). */
  to: number;
  progress: number;
}

export function masteryOf(xp: number): MasteryInfo {
  const earned = Math.max(0, Math.trunc(Number.isFinite(xp) ? xp : 0));
  let level = 1;
  while (earned >= masteryThreshold(level + 1)) level++;
  const from = masteryThreshold(level);
  const to = masteryThreshold(level + 1);
  return { level, xp: earned, from, to, progress: Math.min(1, (earned - from) / (to - from)) };
}

/** The mastery level reached by going from `before` to `after` experience, or null when it did not change. */
export const masteryUp = (before: number, after: number): number | null => {
  const a = masteryOf(before).level;
  const b = masteryOf(after).level;
  return b > a ? b : null;
};

/**
 * Mastery ranks: past the title, a hero's mastery climbs bronze, silver, gold, platinum and legend. Nothing is reset and
 * nothing changes a run: a rank is a colour on the hero (the roster ring, the medal) and a card when it is reached, so a
 * long-time favourite always has a next mark to chase.
 */
export type MasteryTierId = 'bronze' | 'silver' | 'gold' | 'platinum' | 'legend';
export interface MasteryTier {
  id: MasteryTierId;
  level: number;
  color: string;
}
export const MASTERY_TIERS: readonly MasteryTier[] = [
  { id: 'bronze', level: 10, color: '#D08A4E' },
  { id: 'silver', level: 20, color: '#CFD8DC' },
  { id: 'gold', level: 30, color: '#D9B45A' },
  { id: 'platinum', level: 40, color: '#8FC0C5' },
  { id: 'legend', level: 50, color: '#E040FB' },
];

/** The highest rank a mastery level has reached (null below the first). */
export function masteryTier(level: number): MasteryTier | null {
  let tier: MasteryTier | null = null;
  for (const t of MASTERY_TIERS) if (level >= t.level) tier = t;
  return tier;
}

/** The next rank to reach from a level (null once legend is reached). */
export const nextMasteryTier = (level: number): MasteryTier | null => MASTERY_TIERS.find(t => level < t.level) ?? null;

/** The rank reached by going from level `before` to level `after`, or null when no new rank was crossed. */
export function tierCrossed(before: number, after: number): MasteryTier | null {
  const a = masteryTier(before);
  const b = masteryTier(after);
  return b && b.id !== a?.id ? b : null;
}
