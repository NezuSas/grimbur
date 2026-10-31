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
