import { gameReducer } from '../../src/core/engine/reducer';
import { generateBoard } from '../../src/core/engine/generator';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { getNearbyHazards } from '../../src/core/engine/proximity';
import { boss, coin, createState, enemy, pit } from '../helpers/state';

const move = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => ({ type: 'MOVE', direction }) as const;
const manhattan = (a: number, b: number, cols: number) =>
  Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs((a % cols) - (b % cols));
const bossOf = (s: ReturnType<typeof createState>) => s.entities.find(e => e.type === 'boss');

describe('boss floor generation', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])('seed %i: one Wumpus, far from the spawn, no gems', (seed) => {
    const board = generateBoard(GAME_CONFIG.expedition.floors, seed * 977, { boss: true });
    const bosses = board.entities.filter(e => e.type === 'boss');

    expect(bosses).toHaveLength(1);
    expect(bosses[0].hp).toBe(GAME_CONFIG.boss.hp);
    expect(board.coins).toBe(0);
    expect(board.entities.some(e => e.type === 'coin')).toBe(false);
    expect(manhattan(bosses[0].index, 0, board.cols)).toBeGreaterThanOrEqual(GAME_CONFIG.boss.minSpawnDistance);
  });

  it('normal floors never contain a boss', () => {
    expect(generateBoard(5, 11).entities.some(e => e.type === 'boss')).toBe(false);
  });
});

describe('fighting the Wumpus', () => {
  it('takes hp damage per arrow and dies on the last hit, winning the expedition', () => {
    let state = createState({ entities: [boss(1)], coins: 0, attack: 5 });
    state = { ...state, score: 100 };

    state = gameReducer(state, { type: 'ATTACK' });
    expect(bossOf(state)?.hp).toBe(2);
    expect(state.score).toBe(100 + GAME_CONFIG.boss.hitScore);
    expect(state.isVictory).toBe(false);

    state = gameReducer(state, { type: 'ATTACK' });
    expect(bossOf(state)?.hp).toBe(1);

    const before = state.score;
    state = gameReducer(state, { type: 'ATTACK' });
    expect(bossOf(state)).toBeUndefined();
    expect(state.isVictory).toBe(true);
    expect(state.isLevelUp).toBe(true);
    expect(state.score).toBeGreaterThanOrEqual(before + GAME_CONFIG.boss.killScore);
  });

  it('does not clear the floor by moving while the Wumpus lives, even with no gems', () => {
    const state = createState({ entities: [boss(60)], coins: 0 });
    const next = gameReducer(state, move('RIGHT'));

    expect(next.isLevelUp).toBe(false);
    expect(next.isGameOver).toBe(false);
  });

  it('is lethal to touch, but a shield bounces the player back instead', () => {
    const deadly = gameReducer(createState({ entities: [boss(1)], coins: 0 }), move('RIGHT'));
    expect(deadly.isGameOver).toBe(true);
    expect(deadly.deathCause).toBe('boss');

    const shielded = gameReducer({ ...createState({ entities: [boss(1)], coins: 0 }), shield: true }, move('RIGHT'));
    expect(shielded.isGameOver).toBe(false);
    expect(shielded.shield).toBe(false);
    expect(shielded.playerIndex).toBe(0);
    expect(bossOf(shielded)?.index).toBe(1);
  });
});

describe('the Wumpus hunts', () => {
  it('steps one tile closer after every second player move only', () => {
    let state = createState({ entities: [boss(60)], coins: 0 }); // row 4, col 0
    const start = bossOf(state)!.index;

    state = gameReducer(state, move('RIGHT'));
    expect(bossOf(state)!.index).toBe(start); // 1st move: boss waits

    const distanceBefore = manhattan(bossOf(state)!.index, state.playerIndex, 15);
    state = gameReducer(state, move('RIGHT'));
    expect(bossOf(state)!.index).not.toBe(start); // 2nd move: boss steps
    expect(manhattan(bossOf(state)!.index, state.playerIndex, 15)).toBeLessThan(distanceBefore + 1);
  });

  it('kills a player it reaches, unless a shield absorbs the touch', () => {
    // A charged Wumpus is next to the spawn; the player steps away and back (2 moves => the boss acts).
    let state = createState({ entities: [{ ...boss(1), charge: 1 }], coins: 0 });
    state = gameReducer(state, move('DOWN'));
    expect(state.isGameOver).toBe(false);
    state = gameReducer(state, move('UP'));
    expect(state.isGameOver).toBe(true);
    expect(state.deathCause).toBe('boss');

    let shielded = { ...createState({ entities: [{ ...boss(1), charge: 1 }], coins: 0 }), shield: true };
    shielded = gameReducer(shielded, move('DOWN'));
    shielded = gameReducer(shielded, move('UP'));
    expect(shielded.isGameOver).toBe(false);
    expect(shielded.shield).toBe(false);
    expect(bossOf(shielded)!.index).toBe(1);
  });

  it('goes around obstacles and never steps onto another entity', () => {
    let state = createState({ entities: [boss(5), pit(4), coin(100)], coins: 1 });
    state = gameReducer(state, move('DOWN'));
    state = gameReducer(state, move('DOWN'));
    const b = bossOf(state)!;

    expect(b.index).not.toBe(4);
    expect(state.entityMap[b.index]).toBe(b);
    expect(state.entities.filter(e => e.index === b.index)).toHaveLength(1);
  });

  it('keeps entity list and lookup map consistent while moving', () => {
    let state = createState({ entities: [boss(90), coin(100)], coins: 1 });
    for (let i = 0; i < 12 && !state.isGameOver; i++) {
      state = gameReducer(state, move(i % 2 === 0 ? 'RIGHT' : 'DOWN'));
      for (const e of state.entities) expect(state.entityMap[e.index]).toBe(e);
      expect(Object.keys(state.entityMap)).toHaveLength(state.entities.length);
    }
  });

  it('roars like a guardian in the proximity clues', () => {
    const state = createState({ entities: [boss(1), coin(100)], coins: 1 });
    expect(getNearbyHazards(0, state.rows, state.cols, state.entityMap)).toMatchObject({ enemy: true, enemyCount: 1 });
  });
});

describe('the Wumpus next to ordinary guardians', () => {
  it('arrows still kill ordinary guardians', () => {
    const state = createState({ entities: [enemy(1), boss(100)], coins: 0, attack: 3 });
    const next = gameReducer(state, { type: 'ATTACK' });
    expect(next.entityMap[1]).toBeUndefined();
    expect(bossOf(next)).toBeDefined();
  });
});
