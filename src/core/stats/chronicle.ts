import type { LocalStats } from './runStats';

/**
 * The Grimbur's chronicle: twelve fragments of the cave's story, one for each secret room found (in order, over all runs), read
 * in the manual. Derived from `secretsFound` only, so a restored backup restores it too.
 */
export const CHRONICLE_COUNT = 12;

/** How many fragments the player has read. */
export const chronicleCount = (stats: Pick<LocalStats, 'secretsFound'>): number => Math.min(CHRONICLE_COUNT, Math.max(0, Math.trunc(stats.secretsFound ?? 0)));

/** The newest fragment a run unveiled (1-based), or null when it found none. */
export const chronicleUp = (before: Pick<LocalStats, 'secretsFound'>, after: Pick<LocalStats, 'secretsFound'>): number | null => {
  const a = chronicleCount(before);
  const b = chronicleCount(after);
  return b > a ? b : null;
};
