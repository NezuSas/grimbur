import { FLOATING_DEAD_ZONE, REPEAT_FIRST_MS, REPEAT_MS, canRepeatStep, clampPadCenter, floatingDirection } from '../../src/core/input/floatingPad';
import { initialState } from '../../src/core/engine/reducer';
import type { GameState } from '../../src/core/engine/types';

describe('floatingDirection', () => {
  const R = 60;
  const far = R * 0.8;

  it('reads nothing inside the dead zone', () => {
    const inside = R * FLOATING_DEAD_ZONE - 1;
    expect(floatingDirection(0, 0, R)).toBeNull();
    expect(floatingDirection(inside, -inside, R)).toBeNull();
  });

  it('reads the four sides', () => {
    expect(floatingDirection(far, 3, R)).toBe('RIGHT');
    expect(floatingDirection(-far, -3, R)).toBe('LEFT');
    expect(floatingDirection(2, far, R)).toBe('DOWN');
    expect(floatingDirection(-2, -far, R)).toBe('UP');
  });

  it('does nothing on a clean diagonal, and keeps the side it already had', () => {
    expect(floatingDirection(far, far, R)).toBeNull();
    expect(floatingDirection(far, far, R, 'RIGHT')).toBe('RIGHT');
    expect(floatingDirection(-far, far * 0.95, R, 'DOWN')).toBe('DOWN');
  });

  it('lets go of the side when the thumb comes back to the middle', () => {
    expect(floatingDirection(2, 2, R, 'RIGHT')).toBeNull();
  });

  it('repeats at a pace a player can follow', () => {
    expect(REPEAT_FIRST_MS).toBeGreaterThan(REPEAT_MS);
    expect(REPEAT_MS).toBeGreaterThanOrEqual(150);
  });
});

describe('clampPadCenter', () => {
  it('opens the pad under the thumb when there is room', () => {
    expect(clampPadCenter(100, 100, 200, 200, 40)).toEqual({ x: 100, y: 100 });
  });

  it('keeps the whole pad inside the zone near the edges', () => {
    expect(clampPadCenter(5, 195, 200, 200, 40)).toEqual({ x: 40, y: 160 });
    expect(clampPadCenter(400, -20, 200, 200, 40)).toEqual({ x: 160, y: 40 });
  });

  it('centres the pad when the zone is smaller than the pad', () => {
    expect(clampPadCenter(10, 10, 60, 60, 40)).toEqual({ x: 30, y: 30 });
  });
});

describe('canRepeatStep: holding the pad never walks blindly', () => {
  // 5x5 board, hero on tile 12 (the centre); tile 13 (right) explored, tile 11 (left) explored, tile 7 (up) not explored.
  const board = (over: Partial<GameState> = {}): GameState => ({
    ...initialState,
    rows: 5,
    cols: 5,
    playerIndex: 12,
    visited: [12, 13, 11, 17],
    entityMap: {},
    entities: [],
    isGameOver: false,
    isLevelUp: false,
    pendingDraft: null,
    ...over,
  });
  const none = new Set<number>();

  it('walks over explored, empty ground', () => {
    expect(canRepeatStep(board(), 'RIGHT', none)).toBe(true);
    expect(canRepeatStep(board(), 'LEFT', none)).toBe(true);
    expect(canRepeatStep(board(), 'DOWN', none)).toBe(true);
  });

  it('stops before unexplored tiles', () => {
    expect(canRepeatStep(board(), 'UP', none)).toBe(false);
  });

  it('stops before the edge of the board', () => {
    expect(canRepeatStep(board({ playerIndex: 14, visited: [14, 13] }), 'RIGHT', none)).toBe(false);
  });

  it('stops before a marked tile and before anything left on a tile', () => {
    expect(canRepeatStep(board(), 'RIGHT', new Set([13]))).toBe(false);
    expect(canRepeatStep(board({ entityMap: { 13: { type: 'coin' } as any } }), 'RIGHT', none)).toBe(false);
  });

  it('stops when the run is over or a choice is pending', () => {
    expect(canRepeatStep(board({ isGameOver: true }), 'RIGHT', none)).toBe(false);
    expect(canRepeatStep(board({ isLevelUp: true }), 'RIGHT', none)).toBe(false);
  });
});
