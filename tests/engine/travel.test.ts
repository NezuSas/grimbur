import { travelPath } from '../../src/core/engine/travel';
import { GameEntity } from '../../src/core/engine/types';

const map = (...entities: GameEntity[]) => Object.fromEntries(entities.map(e => [e.index, e]));

describe('travelPath', () => {
  // 3 x 4 board, indices:
  //  0  1  2  3
  //  4  5  6  7
  //  8  9 10 11
  it('walks the shortest explored route', () => {
    const path = travelPath([0, 1, 2, 3], {}, 0, 3, 3, 4);
    expect(path).toEqual(['RIGHT', 'RIGHT', 'RIGHT']);
  });

  it('never steps on fog', () => {
    expect(travelPath([0, 1, 3], {}, 0, 3, 3, 4)).toBeNull();
  });

  it('goes around tiles that still hold something', () => {
    const entities = map({ index: 1, type: 'trap' });
    const path = travelPath([0, 1, 2, 4, 5, 6], entities, 0, 2, 3, 4);
    expect(path).toEqual(['DOWN', 'RIGHT', 'RIGHT', 'UP']);
  });

  it('refuses to target the current tile, fog or an occupied tile', () => {
    expect(travelPath([0, 1], {}, 0, 0, 3, 4)).toBeNull();
    expect(travelPath([0, 1], {}, 0, 5, 3, 4)).toBeNull();
    expect(travelPath([0, 1], map({ index: 1, type: 'pit' }), 0, 1, 3, 4)).toBeNull();
  });

  it('does not wrap around the edges of a row', () => {
    // 3 and 4 are neighbours in the flat array but not on the board.
    expect(travelPath([3, 4], {}, 3, 4, 3, 4)).toBeNull();
  });
});
