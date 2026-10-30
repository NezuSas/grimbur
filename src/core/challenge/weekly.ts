import { makeChallengeCode } from './code';
import { weekKeyOf } from '../stats/missions';

/** Seeds a challenge code holds (29 bits, see code.ts). */
const SEED_RANGE = 2 ** 29;
/** The weekly challenge takes turns between these depths, so each week plays by a different rule. */
export const WEEKLY_DEPTHS = [1, 2, 3, 4] as const;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The challenge of the week: one cave for everyone from Monday to Sunday, at a depth that changes every week, played fair
 * (no Forge, no mastery) and ranked on its own board. It is an ordinary challenge code, so it uses the challenge boards that
 * already exist.
 */
export function weeklyChallenge(day: string): { week: string; depth: number; code: string } {
  const week = weekKeyOf(day);
  const [y, m, d] = week.split('-').map(Number);
  const index = Math.floor(Date.UTC(y, m - 1, d) / (7 * 86_400_000));
  const depth = WEEKLY_DEPTHS[((index % WEEKLY_DEPTHS.length) + WEEKLY_DEPTHS.length) % WEEKLY_DEPTHS.length];
  return { week, depth, code: makeChallengeCode(hash(`grimbur-week:${week}`) % SEED_RANGE, depth) };
}
