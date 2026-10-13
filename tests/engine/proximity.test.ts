import { getNearbyHazards } from '../../src/core/engine/proximity';
import { GameEntity } from '../../src/core/engine/types';
import { enemy, pit } from '../helpers/state';

const toMap = (entities: GameEntity[]) =>
  Object.fromEntries(entities.map(e => [e.index, e])) as Record<number, GameEntity>;

describe('getNearbyHazards', () => {
  it('detects orthogonal neighbours', () => {
    // 5x5 board, player at 12 (centre)
    expect(getNearbyHazards(12, 5, 5, toMap([enemy(7)]))).toEqual({ enemy: true, pit: false });
    expect(getNearbyHazards(12, 5, 5, toMap([pit(13)]))).toEqual({ enemy: false, pit: true });
  });

  it('ignores diagonals and distant cells', () => {
    expect(getNearbyHazards(12, 5, 5, toMap([enemy(6), pit(0)]))).toEqual({ enemy: false, pit: false });
  });

  it('does not wrap around row edges', () => {
    // Player at the right edge (index 4); index 5 is the first cell of the next row.
    expect(getNearbyHazards(4, 5, 5, toMap([enemy(5)]))).toEqual({ enemy: false, pit: false });
    // Player at the left edge (index 5); index 4 is the last cell of the previous row.
    expect(getNearbyHazards(5, 5, 5, toMap([pit(4)]))).toEqual({ enemy: false, pit: false });
  });

  it('stays inside the board vertically', () => {
    expect(getNearbyHazards(2, 3, 5, toMap([enemy(12)]))).toEqual({ enemy: false, pit: false });
  });
});
