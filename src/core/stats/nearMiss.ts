/**
 * "One more": a defeat that fell just short of the player's record. The end card then says how little was missing and
 * the retry button asks for one more run, the moment the next attempt is most tempting.
 *
 * - expedition and daily: the score reached at least NEAR_SHARE of the best (and the best is worth chasing);
 * - endless: the floor reached is at most NEAR_FLOORS below the deepest one.
 */
export const NEAR_SHARE = 0.7;
export const NEAR_FLOORS = 2;
/** A best below this is too small for "so close" to mean anything. */
export const NEAR_MIN_BEST = 500;

export type NearMiss = { kind: 'score' | 'floor'; gap: number };

export function nearMiss(run: { score: number; level: number; victory: boolean; endless: boolean; isNewBest: boolean; best: number | null | undefined }): NearMiss | null {
  const best = run.best ?? 0;
  if (run.victory || run.isNewBest || best <= 0) return null;
  if (run.endless) {
    const gap = best - run.level;
    return gap >= 1 && gap <= NEAR_FLOORS ? { kind: 'floor', gap } : null;
  }
  if (best < NEAR_MIN_BEST) return null;
  const gap = best - Math.trunc(run.score);
  return gap > 0 && run.score >= best * NEAR_SHARE ? { kind: 'score', gap } : null;
}
