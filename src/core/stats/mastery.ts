import type { MetaEffects } from './forge';
import type { RunResult } from './runStats';

/**
 * Hero mastery: every finished run with a hero gives that hero experience, and each of its first ten levels adds a small,
 * lasting edge when playing that hero. Past ten it never stops (like the champion levels of big online games): every level
 * asks a little more and gives no more power, only a higher number to show. It is the power that keeps coming once the Forge is done, and it rewards
 * sticking with a favourite. Derived from `heroXp` only, so a restored backup restores it too.
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

/** What a mastery level adds (shown on the hero and applied to its runs). */
export type MasteryPerk =
  | { kind: 'gems'; percent: number }
  | { kind: 'explore'; percent: number }
  | { kind: 'detector' }
  | { kind: 'bomb' }
  | { kind: 'ability'; actions: number }
  | { kind: 'title' };

/** The perk unlocked at each level (index 0 = level 1, which is where every hero starts). */
export const MASTERY_PERKS: readonly (MasteryPerk | null)[] = [
  null,
  { kind: 'gems', percent: 5 },
  { kind: 'explore', percent: 10 },
  { kind: 'detector' },
  { kind: 'ability', actions: 1 },
  { kind: 'gems', percent: 10 },
  { kind: 'explore', percent: 10 },
  { kind: 'bomb' },
  { kind: 'ability', actions: 1 },
  { kind: 'title' },
];

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

/** The Forge's effects plus what a hero's mastery adds to its runs. */
export function withMastery(meta: MetaEffects, level: number): MetaEffects {
  const out = { ...meta };
  MASTERY_PERKS.slice(0, Math.max(0, Math.min(MAX_MASTERY, level))).forEach(perk => {
    if (!perk) return;
    if (perk.kind === 'gems') out.coinBonus += perk.percent / 100;
    else if (perk.kind === 'explore') out.exploreBonus += perk.percent / 100;
    else if (perk.kind === 'detector') out.startDetectors += 1;
    else if (perk.kind === 'bomb') out.startBombs += 1;
    else if (perk.kind === 'ability') out.abilityHaste += perk.actions;
  });
  return out;
}

/** The mastery level reached by going from `before` to `after` experience, or null when it did not change. */
export const masteryUp = (before: number, after: number): number | null => {
  const a = masteryOf(before).level;
  const b = masteryOf(after).level;
  return b > a ? b : null;
};
