import { besideOf, failWarning } from '../../src/core/puzzles/hintReason';
import type { GameEntity } from '../../src/core/engine/types';

// A 3x3 board: row 0 explored (0, 1, 2); a vortex at 4 and a guardian at 5 below it.
const entities: GameEntity[] = [{ index: 4, type: 'pit' }, { index: 5, type: 'enemy' }, { index: 8, type: 'coin' }];

describe('the mistake explained', () => {
  it('names the explored neighbour whose clue warned of the hazard, and what it sensed', () => {
    expect(failWarning(3, 3, entities, [0, 1, 2], 4)).toEqual({ from: 1, side: 'up', guardians: 0, vortices: 1 });
    // Tile 2 senses the guardian below it (5): the warning for a step on 5 comes from above.
    expect(failWarning(3, 3, entities, [0, 1, 2], 5)).toEqual({ from: 2, side: 'up', guardians: 1, vortices: 0 });
  });

  it('says nothing when no explored neighbour sensed anything (a pure guess)', () => {
    expect(failWarning(3, 3, entities, [0], 7)).toBeNull();
  });

  it('finds the tile on a side', () => {
    expect(besideOf(4, 'up', 3)).toBe(1);
    expect(besideOf(4, 'down', 3)).toBe(7);
    expect(besideOf(4, 'left', 3)).toBe(3);
    expect(besideOf(4, 'right', 3)).toBe(5);
  });
});
