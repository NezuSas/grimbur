import type { GameState } from './types';
import { provenMarks } from './solver';
import { neighbour } from './worldHelpers';

/**
 * Why the hero died, judged from what the screen showed just before the fatal action, so a defeat teaches something:
 * - `hunter`: a stalker or the Grimbur struck (they warn with a "!" one action before);
 * - `proven`: the clues already proved that tile dangerous;
 * - `avoidable`: the tile was a guess, but `safe` other tiles next to the explored ground were provably safe;
 * - `forced`: nothing was provably safe any more: a true guess (a shot, the detector or a bomb could have helped).
 */
export type DeathReview =
  | { kind: 'hunter'; by: 'stalker' | 'boss' }
  | { kind: 'proven' }
  | { kind: 'avoidable'; safe: number; tiles: number[] }
  | { kind: 'forced' };

export function reviewDeath(state: Pick<GameState, 'isGameOver' | 'isVictory' | 'deathCause' | 'playerIndex' | 'lastBreath'>): DeathReview | null {
  const before = state.lastBreath;
  if (!state.isGameOver || state.isVictory || !before || !state.deathCause) return null;
  if (state.deathCause === 'stalker') return { kind: 'hunter', by: 'stalker' };
  // The lieutenant ('brute') and the Magma Colossus ('warden') hunt and warn exactly like the Grimbur: not a gamble on a tile.
  if (state.deathCause === 'boss' || state.deathCause === 'brute' || state.deathCause === 'warden') return { kind: 'hunter', by: 'boss' };

  const { rows, cols } = before;
  const marks = provenMarks(rows, cols, before.entities, before.visited);
  if (marks.get(state.playerIndex) === 'danger') return { kind: 'proven' };

  // Unexplored tiles the hero could have walked onto (next to explored ground) that the clues proved safe.
  const explored = new Set(before.visited);
  const frontier = new Set<number>();
  for (const v of before.visited) {
    for (const dir of ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const) {
      const n = neighbour(v, dir, rows, cols);
      if (n !== -1 && !explored.has(n) && marks.get(n) === 'safe') frontier.add(n);
    }
  }
  frontier.delete(state.playerIndex);
  return frontier.size > 0 ? { kind: 'avoidable', safe: frontier.size, tiles: [...frontier].sort((a, b) => a - b) } : { kind: 'forced' };
}
