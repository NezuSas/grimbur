import { gameReducer } from '../../src/core/engine/reducer';
import { generateBoard } from '../../src/core/engine/generator';
import { Direction, GameAction, GameState } from '../../src/core/engine/types';
import { createState } from '../helpers/state';

const DIRECTIONS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

/** Small deterministic RNG so failures are reproducible. */
function lcg(seed: number) {
  let v = seed;
  return () => (v = (v * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

function assertInvariants(state: GameState) {
  const total = state.rows * state.cols;

  expect(state.playerIndex).toBeGreaterThanOrEqual(0);
  expect(state.playerIndex).toBeLessThan(total);
  expect(new Set(state.visited).size).toBe(state.visited.length);
  expect(state.visited).toContain(state.playerIndex);
  expect(state.coins).toBeGreaterThanOrEqual(0);
  expect(state.attack).toBeGreaterThanOrEqual(0);
  expect(state.score).toBeGreaterThanOrEqual(0);
  expect(state.level).toBeGreaterThanOrEqual(1);

  // entities and the O(1) lookup map must never drift apart
  expect(Object.keys(state.entityMap)).toHaveLength(state.entities.length);
  for (const entity of state.entities) {
    expect(state.entityMap[entity.index]).toBe(entity);
  }
}

describe('Engine stress', () => {
  it.each([1, 4, 9, 15])('random play on generated level %i keeps invariants', (level) => {
    for (let sim = 0; sim < 40; sim++) {
      const rand = lcg(level * 1000 + sim);
      const board = generateBoard(level, level * 1000 + sim + 1);
      let state: GameState = {
        ...createState({
          rows: board.rows,
          cols: board.cols,
          entities: board.entities,
          coins: board.coins,
          attack: board.attack,
          seed: sim + 1,
        }),
        level,
      };

      for (let step = 0; step < 200 && !state.isGameOver && !state.isLevelUp; step++) {
        const action: GameAction =
          rand() > 0.2
            ? { type: 'MOVE', direction: DIRECTIONS[Math.floor(rand() * 4)] }
            : { type: 'ATTACK' };
        state = gameReducer(state, action);
        assertInvariants(state);
      }
    }
  });
});

describe('Engine stress: Grimbur lair', () => {
  it('random play keeps invariants while the boss hunts', () => {
    for (let sim = 0; sim < 60; sim++) {
      const rand = lcg(7000 + sim);
      const board = generateBoard(10, 500 + sim, { boss: true });
      let state: GameState = {
        ...createState({
          rows: board.rows,
          cols: board.cols,
          entities: board.entities,
          coins: board.coins,
          attack: 40,
          seed: sim + 1,
        }),
        level: 10,
      };

      for (let step = 0; step < 250 && !state.isGameOver && !state.isLevelUp; step++) {
        const action: GameAction =
          rand() > 0.25
            ? { type: 'MOVE', direction: DIRECTIONS[Math.floor(rand() * 4)] }
            : { type: 'ATTACK' };
        state = gameReducer(state, action);
        assertInvariants(state);
        expect(state.entities.filter(e => e.type === 'boss').length).toBeLessThanOrEqual(1);
      }
    }
  });
});

