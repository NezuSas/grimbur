import { gameReducer } from '../../src/core/engine/reducer';
import { reviewDeath } from '../../src/core/engine/deathReview';
import type { GameEntity } from '../../src/core/engine/types';
import { coin, createState, enemy } from '../helpers/state';

// A 3x5 board (tiles 0-4 on top, 5-9 in the middle, 10-14 below); the hero starts at 0.
const board = (entities: GameEntity[], visited: number[], playerIndex = 0) => ({
  ...createState({ rows: 3, cols: 5, entities }),
  visited,
  playerIndex,
});
const step = (s: ReturnType<typeof board>, direction: 'RIGHT' | 'DOWN') => gameReducer(s, { type: 'MOVE', direction });

describe('reviewDeath: the lesson of a defeat', () => {
  it('says nothing while the hero lives', () => {
    expect(reviewDeath(createState())).toBeNull();
  });

  it('calls a step onto a tile the clues proved dangerous', () => {
    // Tile 0 reads 1 and its only unexplored neighbour is 1: the guardian can only be there.
    const dead = step(board([enemy(1), coin(14)], [0, 5, 10]), 'RIGHT');
    expect(dead.isGameOver).toBe(true);
    expect(reviewDeath(dead)).toEqual({ kind: 'proven' });
  });

  it('follows a chain of deductions', () => {
    // Tile 5 reads 0, so 6 is safe; tile 1 reads 1 with 2 and 6 unexplored, so the guardian is on 2.
    expect(reviewDeath(step(board([enemy(2), coin(14)], [0, 1, 5], 1), 'RIGHT'))).toEqual({ kind: 'proven' });
  });

  it('counts the provably safe tiles left when the step was a guess', () => {
    // Tile 0 reads 0, so 1 and 5 are safe. From 1 (reading 1: 2 or 6) the hero guesses 6, while 5 was still proven safe.
    const at1 = step(board([enemy(6), coin(14)], [0]), 'RIGHT');
    expect(at1.isGameOver).toBe(false);
    const dead = gameReducer(at1, { type: 'MOVE', direction: 'DOWN' });
    expect(dead.isGameOver).toBe(true);
    expect(reviewDeath(dead)).toEqual({ kind: 'avoidable', safe: 1 });
  });

  it('owns up to a forced guess', () => {
    // Tile 0 reads 1 with 1 and 5 both unexplored: nothing is provable.
    expect(reviewDeath(step(board([enemy(5), coin(14)], [0]), 'DOWN'))).toEqual({ kind: 'forced' });
  });

  it('names the hunter that struck', () => {
    const struck = { ...createState(), isGameOver: true, deathCause: 'stalker' as const, lastBreath: createState() };
    expect(reviewDeath(struck)).toEqual({ kind: 'hunter', by: 'stalker' });
  });
});
