/**
 * The player's rank: a long, always-growing ladder built on the embers ever earned (`lifetimeEmbers`, which never goes down
 * when embers are spent). Nothing extra is stored: the rank is derived, so it can never get out of step with the rest of the
 * progress, and a restored backup restores it too.
 */
export const RANK_THRESHOLDS: readonly number[] = [0, 40, 120, 260, 480, 800, 1250, 1900, 2800, 4000, 5800, 8500];

export const MAX_RANK = RANK_THRESHOLDS.length;

export interface RankInfo {
  /** 1-based rank (1 = the first). */
  level: number;
  /** Embers earned so far and the embers at which this rank / the next one starts. */
  earned: number;
  from: number;
  to: number | null;
  /** 0..1 of the way to the next rank (1 at the top). */
  progress: number;
  /** Embers still missing for the next rank (0 at the top). */
  remaining: number;
}

export function rankOf(lifetimeEmbers: number): RankInfo {
  const earned = Math.max(0, Math.trunc(Number.isFinite(lifetimeEmbers) ? lifetimeEmbers : 0));
  let index = 0;
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) if (earned >= RANK_THRESHOLDS[i]) index = i;
  const from = RANK_THRESHOLDS[index];
  const to = index + 1 < RANK_THRESHOLDS.length ? RANK_THRESHOLDS[index + 1] : null;
  return {
    level: index + 1,
    earned,
    from,
    to,
    progress: to === null ? 1 : Math.min(1, (earned - from) / (to - from)),
    remaining: to === null ? 0 : Math.max(0, to - earned),
  };
}

/** The rank reached by going from `before` to `after` embers, or null when it did not change. */
export const rankUp = (before: number, after: number): number | null => {
  const a = rankOf(before).level;
  const b = rankOf(after).level;
  return b > a ? b : null;
};
