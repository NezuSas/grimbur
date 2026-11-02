import { EMPTY_STATS, mergeDailyRun, parseGhostPath, parseStats } from '../../src/core/stats/runStats';

const ghost = (tiles: number[]) => ({ paths: { '1': tiles }, fell: [1, tiles[tiles.length - 1]] as [number, number] });

describe("your daily ghost", () => {
  it("keeps the path of today's best attempt only", () => {
    const day = '2026-11-01';
    const first = mergeDailyRun(EMPTY_STATS, day, { score: 1000, level: 2, ghost: ghost([0, 1, 2]) }).stats;
    expect(first.daily?.ghost?.paths['1']).toEqual([0, 1, 2]);
    const worse = mergeDailyRun(first, day, { score: 500, level: 1, ghost: ghost([0, 9]) }).stats;
    expect(worse.daily?.ghost?.paths['1']).toEqual([0, 1, 2]);
    const better = mergeDailyRun(worse, day, { score: 1500, level: 3, ghost: ghost([0, 5, 6]) }).stats;
    expect(better.daily?.ghost?.paths['1']).toEqual([0, 5, 6]);
    // A new day starts without one.
    const tomorrow = mergeDailyRun(better, '2026-11-02', { score: 10, level: 1 }).stats;
    expect(tomorrow.daily?.ghost).toBeUndefined();
  });

  it('reads a stored ghost defensively and survives a save round trip', () => {
    expect(parseGhostPath(null)).toBeUndefined();
    expect(parseGhostPath({ paths: { '1': [0, 1, -3, 'x', 2], bad: [1] }, fell: [1, 'no'] })).toEqual({ paths: { '1': [0, 1, 2] } });
    const stats = mergeDailyRun(EMPTY_STATS, '2026-11-01', { score: 900, level: 2, ghost: ghost([0, 4]) }).stats;
    expect(parseStats(JSON.stringify(stats)).daily?.ghost).toEqual(ghost([0, 4]));
  });
});
