import { generateBoard, getSafeZoneIndices } from '../../src/core/engine/generator';
import { getDifficulty } from '../../src/core/difficulty/difficulty';

const LEVELS = Array.from({ length: 40 }, (_, i) => i + 1);

describe('generateBoard', () => {
  it('is deterministic for a given level and seed', () => {
    expect(generateBoard(5, 1234)).toEqual(generateBoard(5, 1234));
  });

  it.each(LEVELS)('level %i: keeps entities unique, in bounds and out of the safe zone', (level) => {
    for (let seed = 1; seed <= 15; seed++) {
      const board = generateBoard(level, seed * 7919);
      const total = board.rows * board.cols;
      const safe = new Set(getSafeZoneIndices(board.rows, board.cols, 0, 0, 3));
      const indices = board.entities.map(e => e.index);

      expect(new Set(indices).size).toBe(indices.length);
      for (const index of indices) {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(total);
        expect(safe.has(index)).toBe(false);
      }
    }
  });

  it.each(LEVELS)('level %i: coin count matches the coin entities and is completable', (level) => {
    for (let seed = 1; seed <= 15; seed++) {
      const board = generateBoard(level, seed * 104729);
      const placed = board.entities.filter(e => e.type === 'coin').length;

      expect(board.coins).toBe(placed);
      expect(board.coins).toBeGreaterThan(0);
    }
  });

  it('places the extras announced by the difficulty curve', () => {
    const board = generateBoard(8, 99);
    const diff = getDifficulty(8);
    const count = (type: string) => board.entities.filter(e => e.type === type).length;

    expect(count('trap')).toBe(diff.traps);
    expect(count('shield')).toBe(diff.shields);
    expect(count('ammo')).toBe(diff.ammoPickups);
  });

  it('matches the difficulty curve for board size and ammo', () => {
    const board = generateBoard(9, 1);
    const diff = getDifficulty(9);

    expect(board.rows).toBe(diff.rows);
    expect(board.cols).toBe(diff.cols);
    expect(board.attack).toBe(diff.attackCharges);
  });
});

describe('getSafeZoneIndices', () => {
  it('uses Manhattan distance around the spawn', () => {
    const indices = getSafeZoneIndices(5, 5, 0, 0, 1);
    expect(indices.sort((a, b) => a - b)).toEqual([0, 1, 5]);
  });
});
