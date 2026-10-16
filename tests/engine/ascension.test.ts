import { MAX_ASCENSION, clampAscension, modifiersFor } from '../../src/core/engine/ascension';
import { generateBoard } from '../../src/core/engine/generator';
import { gameReducer, initialState } from '../../src/core/engine/reducer';
import { getDifficulty } from '../../src/core/difficulty/difficulty';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { coin, createState, trap } from '../helpers/state';
import { GameAction } from '../../src/core/engine/types';

const count = (entities: { type: string }[], type: string) => entities.filter(e => e.type === type).length;

describe('modifiers', () => {
  it('stack from depth to depth', () => {
    expect(modifiersFor(0)).toEqual({ arrowPenalty: 0, stalkerFloor: GAME_CONFIG.stalker.minFloor, bossHpBonus: 0, enemyBonus: 0, pitBonus: 0, trapPenaltyMultiplier: 1, extraTraps: 0, stalkerBonus: 0, hunterHaste: 0, draftSize: 3 });
    expect(modifiersFor(1).arrowPenalty).toBe(1);
    expect(modifiersFor(2).stalkerFloor).toBe(5);
    expect(modifiersFor(3).bossHpBonus).toBe(1);
    expect(modifiersFor(4)).toMatchObject({ trapPenaltyMultiplier: 2, extraTraps: 1, arrowPenalty: 1, bossHpBonus: 1 });
    expect(modifiersFor(5).draftSize).toBe(2);
  });

  it('clamps nonsense depths', () => {
    expect(clampAscension(-3)).toBe(0);
    expect(clampAscension(99)).toBe(MAX_ASCENSION);
    expect(clampAscension(Number.NaN)).toBe(0);
    expect(clampAscension(2.9)).toBe(2);
  });
});

describe('generation at depth', () => {
  it('depth 2 always puts a stalker on floor 5 (depth 0 only sometimes; never before floor 4)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(count(generateBoard(3, seed * 13).entities, 'stalker')).toBe(0);
      expect(count(generateBoard(5, seed * 13).entities, 'stalker')).toBeLessThanOrEqual(1);
      expect(count(generateBoard(5, seed * 13, { ascension: 2 }).entities, 'stalker')).toBeGreaterThanOrEqual(1);
    }
  });

  it('depth 4 adds one trap per floor from floor 3', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const base = getDifficulty(6).traps;
      expect(count(generateBoard(6, seed * 7, { ascension: 4 }).entities, 'trap')).toBe(base + 1);
      expect(count(generateBoard(2, seed * 7, { ascension: 4 }).entities, 'trap')).toBe(0);
    }
  });

  it('depth 3 gives the Wumpus an extra heart', () => {
    const floors = GAME_CONFIG.expedition.floors;
    expect(generateBoard(floors, 5, { boss: true }).entities.find(e => e.type === 'boss')!.hp).toBe(GAME_CONFIG.boss.hp);
    expect(generateBoard(floors, 5, { boss: true, ascension: 3 }).entities.find(e => e.type === 'boss')!.hp).toBe(GAME_CONFIG.boss.hp + 1);
  });

  it('still produces valid, in-bounds boards at every depth', () => {
    for (let depth = 0; depth <= MAX_ASCENSION; depth++) {
      for (const level of [1, 3, 5, 7, 9]) {
        const board = generateBoard(level, level * 31 + depth, { ascension: depth });
        const total = board.rows * board.cols;
        const indices = board.entities.map(e => e.index);
        expect(new Set(indices).size).toBe(indices.length);
        expect(indices.every(i => i >= 0 && i < total)).toBe(true);
      }
    }
  });
});

describe('rules at depth', () => {
  it('RESET remembers the depth and defaults to 0', () => {
    expect(createState().ascension).toBe(0);
    const state = gameReducer(initialState, {
      type: 'RESET', character: { playerName: 'T' } as never, rows: 5, cols: 8, entities: [coin(39)], coins: 1, attack: 3, seed: 1, ascension: 4,
    });
    expect(state.ascension).toBe(4);
  });

  it('depth 4 doubles the trap penalty', () => {
    const base = { ...createState({ entities: [trap(1), coin(100)] }), score: 1000 };
    const normal = gameReducer(base, { type: 'MOVE', direction: 'RIGHT' }).score;
    const deep = gameReducer({ ...base, ascension: 4 }, { type: 'MOVE', direction: 'RIGHT' }).score;
    expect(normal - deep).toBe(Math.abs(GAME_CONFIG.scoring.trapPenalty));
  });

  it('depth 5 offers only two relics per draft', () => {
    const levelUp: GameAction = { type: 'LEVEL_UP', payload: { rows: 5, cols: 8, entities: [], coins: 1, attack: 3, seed: 9 } };
    const normal = gameReducer({ ...createState(), isLevelUp: true }, levelUp);
    const deep = gameReducer({ ...createState(), isLevelUp: true, ascension: 5 }, levelUp);
    expect(normal.pendingDraft).toHaveLength(3);
    expect(deep.pendingDraft).toHaveLength(2);
  });
});
