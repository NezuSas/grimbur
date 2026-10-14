import { GameState } from './types';

/** Regular guardians plus roaming stalkers still on the board. */
export const countGuardians = (s: Pick<GameState, 'entities'>) =>
  s.entities.filter(e => e.type === 'enemy' || e.type === 'stalker' || e.type === 'sleeper').length;

/** Hearts the Wumpus has left (0 when it is not on the floor). */
export const bossHearts = (s: Pick<GameState, 'entities'>) =>
  s.entities.reduce((sum, e) => (e.type === 'boss' ? sum + (e.hp ?? 0) : sum), 0);
