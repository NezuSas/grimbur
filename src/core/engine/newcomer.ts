import type { GameMode } from './seed';

/**
 * A newcomer meets the cave's extras one at a time instead of all on the first day: the plain floors first, then secret rooms,
 * then encounters. Only expeditions are gated; the daily, friend challenges and duels must stay the same cave for everyone.
 */
export const SECRETS_FROM_RUN = 1;
export const ENCOUNTERS_FROM_RUN = 2;

export interface RunFeatures {
  secrets: boolean;
  encounters: boolean;
}

export const ALL_FEATURES: RunFeatures = { secrets: true, encounters: true };

/** What a run may hold, from the runs the player has finished before it. */
export function featuresFor(gamesPlayed: number, mode: GameMode, shared: boolean): RunFeatures {
  if (shared || mode !== 'expedition') return ALL_FEATURES;
  return { secrets: gamesPlayed >= SECRETS_FROM_RUN, encounters: gamesPlayed >= ENCOUNTERS_FROM_RUN };
}
