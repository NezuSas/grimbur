import { arrowPath, arrowReachOf, initialState } from '../../src/core/engine/reducer';
import type { GameState } from '../../src/core/engine/types';

const board = (over: Partial<GameState>): GameState => ({ ...initialState, rows: 5, cols: 5, playerIndex: 10, entityMap: {}, entities: [], ...over });

describe('arrowPath: the flight of an arrow', () => {
  it('crosses up to its reach and flies on when nothing is there', () => {
    const s = board({ perks: { ...initialState.perks, arrowReach: 2 } });
    expect(arrowPath(s, 'RIGHT')).toEqual({ tiles: [11, 12], targetIndex: -1 });
  });

  it('stops on the first guardian in its way', () => {
    const s = board({
      perks: { ...initialState.perks, arrowReach: 4 },
      entityMap: { 12: { type: 'enemy' } as any, 13: { type: 'enemy' } as any },
    });
    expect(arrowPath(s, 'RIGHT')).toEqual({ tiles: [11, 12], targetIndex: 12 });
  });

  it('is cut by the edge of the board', () => {
    const s = board({ playerIndex: 3, perks: { ...initialState.perks, arrowReach: 4 } });
    expect(arrowPath(s, 'RIGHT').tiles).toEqual([4]);
  });

  it('counts the bows in its reach, the same number the aim preview uses', () => {
    const base = board({ perks: { ...initialState.perks, arrowReach: 1 } });
    const withBows = { ...base, relics: ['long_bow', 'glass_bow'] as any };
    expect(arrowReachOf(withBows)).toBe(1 + 1 + 2);
  });
});
