import {
  ACHIEVEMENTS,
  HERO_COUNT,
  SPEEDRUN_SECONDS,
  newAchievements,
  withAchievements,
} from '../../src/core/stats/achievements';
import { EMPTY_STATS, mergeDailyRun, mergeRun, parseStats } from '../../src/core/stats/runStats';

const unlockedBy = (run: Parameters<typeof mergeRun>[1], base = EMPTY_STATS) => {
  const merged = mergeRun(base, run).stats;
  return newAchievements(merged, run);
};

describe('achievements', () => {
  it('has unique ids and an icon each', () => {
    expect(new Set(ACHIEVEMENTS.map(a => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(ACHIEVEMENTS.every(a => a.icon.length > 0)).toBe(true);
  });

  it('awards depth achievements from the best floor reached', () => {
    expect(unlockedBy({ score: 10, level: 1 })).toEqual([]);
    expect(unlockedBy({ score: 10, level: 2 })).toEqual(['first_descent']);
    expect(unlockedBy({ score: 10, level: 5 })).toEqual(['first_descent', 'halfway']);
    expect(unlockedBy({ score: 10, level: 9 })).toEqual(['first_descent', 'halfway', 'deep_diver']);
  });

  it('awards the Wumpus slayer and the speedrunner only for victories (speed only when fast)', () => {
    const slow = unlockedBy({ score: 100, level: 10, victory: true, time: SPEEDRUN_SECONDS + 1 });
    expect(slow).toContain('wumpus_slayer');
    expect(slow).not.toContain('speedrunner');

    const fast = unlockedBy({ score: 100, level: 10, victory: true, time: SPEEDRUN_SECONDS - 1 });
    expect(fast).toContain('speedrunner');

    expect(unlockedBy({ score: 100, level: 10, victory: false, time: 5 })).not.toContain('speedrunner');
  });

  it('awards run-based achievements from the run summary', () => {
    expect(unlockedBy({ score: 5000, level: 1 })).toContain('high_roller');
    expect(unlockedBy({ score: 4999, level: 1 })).not.toContain('high_roller');
    expect(unlockedBy({ score: 1, level: 1, relics: 6 })).toContain('relic_hoarder');
    expect(unlockedBy({ score: 1, level: 1, relics: 5 })).not.toContain('relic_hoarder');
  });

  it('accumulates gems and heroes across runs', () => {
    let stats = EMPTY_STATS;
    for (const gems of [40, 40, 30]) stats = mergeRun(stats, { score: 1, level: 1, gems }).stats;
    expect(stats.totalGems).toBe(110);
    expect(newAchievements(stats, { score: 1, level: 1 })).toContain('collector');

    let heroes = EMPTY_STATS;
    for (const heroIndex of [0, 1, 1, 2, 3, 0]) heroes = mergeRun(heroes, { score: 1, level: 1, heroIndex }).stats;
    expect(heroes.heroesUsed).toEqual([0, 1, 2, 3]);
    expect(heroes.heroesUsed).toHaveLength(HERO_COUNT);
    expect(newAchievements(heroes, { score: 1, level: 1 })).toContain('hero_variety');
  });

  it('awards the daily streak achievement after three consecutive days', () => {
    let stats = EMPTY_STATS;
    for (const day of ['2026-10-10', '2026-10-11']) {
      stats = mergeDailyRun(stats, day, { score: 1, level: 1 }).stats;
      expect(newAchievements(stats, { score: 1, level: 1 })).not.toContain('daily_devotee');
    }
    stats = mergeDailyRun(stats, '2026-10-12', { score: 1, level: 1 }).stats;
    expect(newAchievements(stats, { score: 1, level: 1 })).toContain('daily_devotee');
  });

  it('never re-awards an unlocked achievement and records the day', () => {
    const run = { score: 10, level: 2 };
    const merged = mergeRun(EMPTY_STATS, run).stats;
    const first = newAchievements(merged, run);
    const stored = withAchievements(merged, first, '2026-10-12');

    expect(stored.achievements).toEqual({ first_descent: '2026-10-12' });
    expect(newAchievements(stored, run)).toEqual([]);
    expect(withAchievements(stored, [], '2026-10-13')).toBe(stored);
  });

  it('persisted data survives a round trip and bad data is sanitised', () => {
    const run = { score: 10, level: 5, gems: 7, heroIndex: 2 };
    const merged = mergeRun(EMPTY_STATS, run).stats;
    const stored = withAchievements(merged, newAchievements(merged, run), '2026-10-12');
    expect(parseStats(JSON.stringify(stored))).toEqual(stored);

    const messy = parseStats('{"totalGems":-5,"heroesUsed":[2,"x",2,99,1],"achievements":{"a":"2026-10-12","b":5,"c":"nope"}}');
    expect(messy.totalGems).toBe(0);
    expect(messy.heroesUsed).toEqual([1, 2]);
    expect(messy.achievements).toEqual({ a: '2026-10-12' });
  });
});
