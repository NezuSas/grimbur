import { gameReducer } from '../../src/core/engine/reducer';
import { generateBoard } from '../../src/core/engine/generator';
import { getDifficulty } from '../../src/core/difficulty/difficulty';
import { getNearbyHazards } from '../../src/core/engine/proximity';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { coin, createState } from '../helpers/state';
import { GameEntity } from '../../src/core/engine/types';
import { RelicId } from '../../src/core/engine/relics';

const stalker = (index: number): GameEntity => ({ index, type: 'stalker' });
const move = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => ({ type: 'MOVE', direction }) as const;
const find = (s: ReturnType<typeof createState>) => s.entities.find(e => e.type === 'stalker');
const EVERY = GAME_CONFIG.stalker.moveEvery;
const dist = (a: number, b: number, cols: number) =>
  Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs((a % cols) - (b % cols));

describe('difficulty and generation', () => {
  it('introduces stalkers from the configured floor and caps them', () => {
    expect(getDifficulty(GAME_CONFIG.stalker.minFloor - 1).stalkers).toBe(0);
    expect(getDifficulty(GAME_CONFIG.stalker.minFloor).stalkers).toBe(1);
    expect(getDifficulty(10).stalkers).toBe(1);
    expect(getDifficulty(11).stalkers).toBe(2);
    expect(getDifficulty(500).stalkers).toBe(2);
  });

  it('places exactly the announced number of stalkers, away from the spawn', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const level of [7, 8, 9]) {
        const board = generateBoard(level, seed * 17);
        const stalkers = board.entities.filter(e => e.type === 'stalker');
        expect(stalkers).toHaveLength(getDifficulty(level).stalkers);
        for (const s of stalkers) expect(dist(s.index, 0, board.cols)).toBeGreaterThan(2);
      }
    }
  });
});

describe('a stalker hunts', () => {
  it('steps toward the player once every N actions, not before', () => {
    let state = createState({ entities: [stalker(60), coin(100)], coins: 1 });
    const start = find(state)!.index;

    for (let i = 0; i < EVERY - 1; i++) state = gameReducer(state, move(i % 2 === 0 ? 'RIGHT' : 'LEFT'));
    expect(find(state)!.index).toBe(start); // it waits

    const before = dist(start, state.playerIndex, 15);
    state = gameReducer(state, move('RIGHT'));
    expect(find(state)!.index).not.toBe(start); // its turn: it steps
    expect(dist(find(state)!.index, state.playerIndex, 15)).toBeLessThan(before + 2);
  });

  it('counts as a guardian in the clues', () => {
    const state = createState({ entities: [stalker(1), coin(100)], coins: 1 });
    expect(getNearbyHazards(0, state.rows, state.cols, state.entityMap)).toMatchObject({ enemyCount: 1 });
  });

  it('is deadly to touch, absorbed by a shield, and reported as the cause of death', () => {
    const dead = gameReducer(createState({ entities: [stalker(1), coin(100)], coins: 1 }), move('RIGHT'));
    expect(dead.isGameOver).toBe(true);
    expect(dead.deathCause).toBe('stalker');

    const shielded = gameReducer({ ...createState({ entities: [stalker(1), coin(100)], coins: 1 }), shield: true }, move('RIGHT'));
    expect(shielded.isGameOver).toBe(false);
    expect(shielded.entityMap[1]).toBeUndefined();
  });

  it('winds up for one of its own actions before it can strike', () => {
    // Adjacent below the spawn. It acts every EVERY actions: wind-up on the first, strike on the second.
    let state = createState({ entities: [stalker(15), coin(100)], coins: 1, attack: 99 });
    state = { ...state, facingDir: 'UP' }; // shots go nowhere
    for (let i = 0; i < EVERY * 2 - 1; i++) state = gameReducer(state, { type: 'ATTACK' });
    expect(state.isGameOver).toBe(false);
    expect(find(state)!.charge).toBe(1);
    state = gameReducer(state, { type: 'ATTACK' });
    expect(state.isGameOver).toBe(true);
    expect(state.deathCause).toBe('stalker');
  });

  it('one arrow kills it and pays like a guardian', () => {
    const state = createState({ entities: [stalker(1), coin(100)], coins: 1, attack: 3 });
    const next = gameReducer({ ...state, score: 0 }, { type: 'ATTACK' });
    expect(find(next)).toBeUndefined();
    expect(next.score).toBeGreaterThan(0);
    expect(next.enemyCombo).toBe(1);
  });

  it('only steps onto empty tiles and never duplicates an index', () => {
    let state = createState({ entities: [stalker(30), coin(31), coin(45), coin(100)], coins: 3 });
    for (let i = 0; i < 18 && !state.isGameOver; i++) {
      state = gameReducer(state, move(i % 2 === 0 ? 'DOWN' : 'RIGHT'));
      for (const e of state.entities) expect(state.entityMap[e.index]).toBe(e);
      expect(new Set(state.entities.map(e => e.index)).size).toBe(state.entities.length);
    }
  });

  it('the Frost Charm slows stalkers too', () => {
    const run = (relics: RelicId[]) => {
      let state = { ...createState({ entities: [stalker(60), coin(100)], coins: 1 }), relics };
      const start = find(state)!.index;
      for (let i = 0; i < EVERY; i++) state = gameReducer(state, move(i % 2 === 0 ? 'RIGHT' : 'LEFT'));
      return find(state)!.index !== start;
    };
    expect(run([])).toBe(true);
    expect(run(['frost'])).toBe(false);
  });

  it('vortexes never drop the player next to nothing but empty tiles (stalkers are lethal tiles)', () => {
    const state = createState({ rows: 1, cols: 4, entities: [{ index: 1, type: 'pit' }, stalker(2), coin(3)], coins: 1 });
    const next = gameReducer(state, move('RIGHT'));
    expect(next.entityMap[next.playerIndex]?.type).not.toBe('stalker');
  });
});
