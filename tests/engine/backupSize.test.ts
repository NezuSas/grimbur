import { EMPTY_STATS, mergeDailyRun, mergeRun } from '../../src/core/stats/runStats';
import { MAX_CODE_LENGTH, decodeBackup, encodeBackup } from '../../src/core/stats/backup';

describe('a busy player still fits in a backup', () => {
  it('stays under the size a code (and the cloud copy) may have, and restores', () => {
    let s = EMPTY_STATS;
    const board = { rows: 10, cols: 16, player: 150, visited: Array.from({ length: 140 }, (_, i) => i), things: Array.from({ length: 40 }, (_, i) => [i * 3, 'enemy'] as [number, string]) };
    for (let i = 0; i < 60; i++) {
      s = mergeRun(s, { score: 5000 + i, level: 10, day: `2026-10-${String(1 + (i % 28)).padStart(2, '0')}`, heroIndex: i % 6, relicIds: ['quiver', 'lantern', 'phoenix', 'magnet', 'owl', 'thorns'], board, gems: 30, time: 600, cause: 'enemy', mode: 'expedition' }).stats;
    }
    const paths = Object.fromEntries(Array.from({ length: 10 }, (_, f) => [String(f + 1), Array.from({ length: 140 }, (_, i) => i)]));
    s = mergeDailyRun(s, '2026-11-01', { score: 99999, level: 10, ghost: { paths, fell: [10, 55] } }).stats;

    const code = encodeBackup(s, {});
    expect(code.length).toBeLessThan(MAX_CODE_LENGTH * 0.6);
    const back = decodeBackup(code);
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(back.stats.bestScore).toBe(s.bestScore);
      expect(back.stats.history).toHaveLength(s.history.length);
      // The pictures are left out: progress is what a backup keeps.
      expect(back.stats.history.every(h => h.board === undefined)).toBe(true);
      expect(back.stats.daily?.ghost).toBeUndefined();
    }
  });
});
