import { MAX_ASCENSION } from '../../src/core/engine/ascension';
import { newAchievements } from '../../src/core/stats/achievements';
import { EMPTY_STATS, mergeDailyRun, mergeRun, parseStats } from '../../src/core/stats/runStats';

const win = (ascension: number, base = EMPTY_STATS) =>
  mergeRun(base, { score: 100, level: 10, victory: true, ascension }).stats;

describe('unlocking depths', () => {
  it('starts with only the normal depth', () => {
    expect(EMPTY_STATS.maxAscension).toBe(0);
  });

  it('a victory unlocks the next depth, a defeat does not', () => {
    expect(win(0).maxAscension).toBe(1);
    expect(mergeRun(EMPTY_STATS, { score: 5, level: 9, victory: false, ascension: 0 }).stats.maxAscension).toBe(0);
  });

  it('winning at the deepest unlocked depth moves the ceiling up, replaying an easier one never lowers it', () => {
    let stats = win(0);
    stats = win(1, stats);
    stats = win(2, stats);
    expect(stats.maxAscension).toBe(3);
    expect(win(0, stats).maxAscension).toBe(3);
  });

  it('never exceeds the last depth', () => {
    expect(win(MAX_ASCENSION).maxAscension).toBe(MAX_ASCENSION);
    expect(win(99).maxAscension).toBe(MAX_ASCENSION);
  });

  it('daily runs never unlock depths (they are always played at depth 0)', () => {
    const stats = mergeDailyRun(EMPTY_STATS, '2026-10-12', { score: 1, level: 10, victory: true }).stats;
    expect(stats.maxAscension).toBe(0);
  });

  it('is restored safely from storage', () => {
    expect(parseStats('{"maxAscension":3}').maxAscension).toBe(3);
    expect(parseStats('{"maxAscension":99}').maxAscension).toBe(MAX_ASCENSION);
    expect(parseStats('{"maxAscension":-2}').maxAscension).toBe(0);
    expect(parseStats('{"maxAscension":"x"}').maxAscension).toBe(0);
  });
});

describe('depth achievements', () => {
  it('"Into the fire" needs a victory on depth 3 or deeper', () => {
    const run = (ascension: number, victory = true) => ({ score: 1, level: 10, victory, ascension });
    expect(newAchievements(win(3), run(3))).toContain('ascended');
    expect(newAchievements(win(2), run(2))).not.toContain('ascended');
    expect(newAchievements(EMPTY_STATS, run(3, false))).not.toContain('ascended');
  });

  it('"Abyssal" needs the last depth', () => {
    const run = { score: 1, level: 10, victory: true, ascension: MAX_ASCENSION };
    expect(newAchievements(win(MAX_ASCENSION), run)).toContain('abyssal');
    expect(newAchievements(win(4), { ...run, ascension: 4 })).not.toContain('abyssal');
  });
});
