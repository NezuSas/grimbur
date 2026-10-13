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

  it('respects the board and coin caps', () => {
    const late = getDifficulty(500);
    expect(late.rows).toBe(10);
    expect(late.cols).toBe(20);
    expect(late.coins).toBe(8);
  });
});
