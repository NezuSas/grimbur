import type { LocalStats } from './runStats';

/** Spends embers (a revive): the new stats, or null when the amount is not valid or the purse is short. Lifetime embers (rank) are untouched. */
export function spendEmbers(stats: LocalStats, amount: number): LocalStats | null {
  const n = Math.trunc(amount);
  if (!Number.isFinite(n) || n <= 0 || stats.embers < n) return null;
  return { ...stats, embers: stats.embers - n };
}
