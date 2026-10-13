import { getDifficulty } from '../../src/core/difficulty/difficulty';

describe('getDifficulty', () => {
  it('never shrinks as the level grows', () => {
    let prev = getDifficulty(1);
    for (let level = 2; level <= 60; level++) {
      const cur = getDifficulty(level);
      expect(cur.rows).toBeGreaterThanOrEqual(prev.rows);
      expect(cur.cols).toBeGreaterThanOrEqual(prev.cols);
      expect(cur.coins).toBeGreaterThanOrEqual(prev.coins);
      expect(cur.enemies).toBeGreaterThanOrEqual(prev.enemies);
      prev = cur;
    }
  });

  it('keeps hazards well below the number of free cells at every level', () => {
    for (let level = 1; level <= 300; level++) {
      const d = getDifficulty(level);
      const freeCells = d.rows * d.cols - 13; // safe radius 2 covers at most 13 cells
      const placed = d.enemies + d.stalkers + d.pits + d.coins + d.traps + d.shields + d.ammoPickups;
      expect(placed).toBeLessThan(freeCells * 0.5);
    }
  });

  it('introduces traps and power-ups progressively', () => {
    expect(getDifficulty(1).traps).toBe(0);
    expect(getDifficulty(1).shields).toBe(0);
    expect(getDifficulty(2).shields).toBe(1);
    expect(getDifficulty(3).traps).toBeGreaterThan(0);
    expect(getDifficulty(500).traps).toBe(4);
  });

  it('respects the board and coin caps', () => {
    const late = getDifficulty(500);
    expect(late.rows).toBe(10);
    expect(late.cols).toBe(20);
    expect(late.coins).toBe(8);
  });
});
