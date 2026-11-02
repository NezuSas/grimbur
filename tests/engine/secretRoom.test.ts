import { SECRET_ARROWS, SECRET_FROM, SECRET_GEMS, generateBoard, secretScore } from '../../src/core/engine/generator';
import { gameReducer } from '../../src/core/engine/reducer';
import { getNearbyHazards } from '../../src/core/engine/proximity';
import { coin, createState } from '../helpers/state';

const secretsOf = (entities: { type: string }[]) => entities.filter(e => e.type === 'secret').length;

describe('secret rooms', () => {
  it('appear on some floors from the second one, at most one each, never on the first or in the lair', () => {
    let found = 0;
    for (let seed = 1; seed <= 200; seed++) {
      expect(secretsOf(generateBoard(1, seed).entities)).toBe(0);
      expect(secretsOf(generateBoard(10, seed, { boss: true }).entities)).toBe(0);
      const n = secretsOf(generateBoard(SECRET_FROM + 1, seed).entities);
      expect(n).toBeLessThanOrEqual(1);
      found += n;
    }
    // About a third of the floors (SECRET_CHANCE), never all and never none.
    expect(found).toBeGreaterThan(40);
    expect(found).toBeLessThan(120);
  });

  it('never land on another entity or the start, and are not counted by the clues', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const board = generateBoard(4, seed);
      const at = board.entities.find(e => e.type === 'secret');
      if (!at) continue;
      expect(board.entities.filter(e => e.index === at.index)).toHaveLength(1);
      expect(at.index).not.toBe(board.playerIndex);
      const map = Object.fromEntries(board.entities.map(e => [e.index, e]));
      const withSecret = getNearbyHazards(at.index + 1, board.rows, board.cols, map);
      const { [at.index]: _gone, ...without } = map;
      expect(withSecret).toEqual(getNearbyHazards(at.index + 1, board.rows, board.cols, without));
    }
  });

  it('is kept apart from the entities, so nothing on the board (no monster, no thief) can walk around it', () => {
    const board = Array.from({ length: 200 }, (_, i) => generateBoard(4, i + 1)).find(b => b.entities.some(e => e.type === 'secret'))!;
    const state = gameReducer(createState(), { type: 'RESET', character: { playerName: 'T' } as never, rows: board.rows, cols: board.cols, entities: board.entities, coins: board.coins, attack: board.attack, seed: 1 });
    expect(state.entities.some(e => e.type === 'secret')).toBe(false);
    expect(state.secret).toBe(board.entities.find(e => e.type === 'secret')!.index);
  });

  it('pays its cache when the hero walks in, without ending the floor', () => {
    const base = { ...createState({ entities: [coin(30)] }), secret: 1, level: 3, gems: 0, attack: 2, score: 0 };
    const next = gameReducer(base, { type: 'MOVE', direction: 'RIGHT' });
    expect(next.gems).toBe(SECRET_GEMS);
    expect(next.attack).toBe(2 + SECRET_ARROWS);
    expect(next.score).toBeGreaterThanOrEqual(secretScore(3));
    expect(next.secretsFound).toBe(1);
    expect(next.lastPickup).toBe('secret');
    expect(next.secret).toBeNull();
    expect(next.isLevelUp).toBe(false);
  });
});

describe('the glint of a secret room', () => {
  it('is on the four tiles beside it, inside the board', () => {
    const { secretDraftTiles } = jest.requireActual('../../src/core/engine/worldHelpers') as typeof import('../../src/core/engine/worldHelpers');
    expect(secretDraftTiles(9, 5, 8).sort((a, b) => a - b)).toEqual([1, 8, 10, 17]);
    expect(secretDraftTiles(0, 5, 8).sort((a, b) => a - b)).toEqual([1, 8]);
    expect(secretDraftTiles(null, 5, 8)).toEqual([]);
  });
});
