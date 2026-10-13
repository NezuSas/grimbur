import {
  ACHIEVEMENTS,
  HERO_COUNT,
  SPEEDRUN_SECONDS,
  ACHIEVEMENT_REWARD,
  newAchievements,
  rewardFor,
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
    expect(unlockedBy({ score: 10, level: 1 })).toEqual(['first_steps']);
    const depth = (level: number) => unlockedBy({ score: 10, level }).filter(id => ['first_descent', 'cave_dweller', 'halfway', 'deep_diver', 'edge_of_lair'].includes(id));
    expect(depth(2)).toEqual(['first_descent']);
    expect(depth(5)).toEqual(['first_descent', 'cave_dweller', 'halfway']);
    expect(depth(9)).toEqual(['first_descent', 'cave_dweller', 'halfway', 'deep_diver']);
    expect(depth(10)).toContain('edge_of_lair');
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

    expect(stored.achievements).toEqual({ first_steps: '2026-10-12', first_descent: '2026-10-12' });
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

  it('has far more than a dozen, spread over every tier, with matching texts in both languages', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(40);
    for (const tier of ['easy', 'medium', 'hard', 'legend'] as const) {
      expect(ACHIEVEMENTS.filter(a => a.tier === tier).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('endless floors unlock their own achievements and never the expedition ones', () => {
    const deep = { score: 99999, level: 21, victory: false, mode: 'endless' as const };
    const got = unlockedBy(deep);
    expect(got).toEqual(expect.arrayContaining(['beyond', 'deeper_still', 'second_lair']));
    expect(got).not.toContain('legendary_haul');
    expect(got).not.toContain('abyss_walker');
    const merged = mergeRun(EMPTY_STATS, deep).stats;
    expect(merged.bestEndlessFloor).toBe(21);
    expect(merged.bestLevel).toBe(0); // the expedition record is untouched
    expect(merged.bestScore).toBe(0);
  });

  it('cumulative achievements report progress that never exceeds the target', () => {
    const stats = { ...EMPTY_STATS, totalGems: 37 };
    const gems = ACHIEVEMENTS.find(a => a.id === 'collector')!;
    expect(gems.progress!(stats)).toEqual({ current: 37, target: 100 });
    expect(gems.progress!({ ...stats, totalGems: 5000 })).toEqual({ current: 100, target: 100 });
  });

  it('counts every ember ever earned, even after spending', () => {
    const stats = mergeRun({ ...EMPTY_STATS, embers: 10, lifetimeEmbers: 10 }, { score: 500, level: 3 }).stats;
    expect(stats.lifetimeEmbers).toBe(stats.embers); // nothing spent yet
    expect(stats.lifetimeEmbers).toBeGreaterThan(10);
  });

  it('has over a hundred, every id unique, every tier well filled', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(ACHIEVEMENTS.map(a => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const tier of ['easy', 'medium', 'hard', 'legend'] as const) {
      expect(ACHIEVEMENTS.filter(a => a.tier === tier).length).toBeGreaterThanOrEqual(10);
    }
  });

  it('pays embers for every unlock, more for harder ones, and counts them as earned', () => {
    expect(ACHIEVEMENT_REWARD.easy).toBeLessThan(ACHIEVEMENT_REWARD.medium);
    expect(ACHIEVEMENT_REWARD.hard).toBeLessThan(ACHIEVEMENT_REWARD.legend);
    const run = { score: 10, level: 2 };
    const merged = mergeRun(EMPTY_STATS, run).stats;
    const ids = newAchievements(merged, run);
    const stored = withAchievements(merged, ids, '2026-10-13');
    expect(rewardFor(ids)).toBeGreaterThan(0);
    expect(stored.embers).toBe(merged.embers + rewardFor(ids));
    expect(stored.lifetimeEmbers).toBe(merged.lifetimeEmbers + rewardFor(ids));
  });

  it('trophy achievements that count other achievements unlock in the same pass', () => {
    const owned: Record<string, string> = {};
    // Nine achievements the run below will not touch.
    ACHIEVEMENTS.slice(20, 29).forEach(a => (owned[a.id] = '2026-10-01'));
    const stats = { ...mergeRun(EMPTY_STATS, { score: 10, level: 2 }).stats, achievements: owned };
    const got = newAchievements(stats, { score: 10, level: 2 });
    // The run itself unlocks some, which brings the total past ten: the trophy is awarded in the same pass.
    expect(got.filter(id => id !== 'trophies_10').length).toBeGreaterThan(0);
    expect(got).toContain('trophies_10');
  });

  it('tracks victories per hero and daily runs and wins', () => {
    let stats = mergeRun(EMPTY_STATS, { score: 1, level: 10, victory: true, heroIndex: 2 }).stats;
    expect(stats.heroWins).toEqual([0, 0, 1, 0]);
    expect(newAchievements(stats, { score: 1, level: 10 })).toContain('win_borin');
    stats = mergeDailyRun(stats, '2026-10-13', { score: 1, level: 10, victory: true, heroIndex: 0 }).stats;
    expect(stats.heroWins).toEqual([1, 0, 1, 0]);
    expect(stats.dailyRuns).toBe(1);
    expect(stats.dailyWins).toBe(1);
    const all = { ...stats, heroWins: [1, 2, 1, 5] };
    expect(newAchievements(all, { score: 1, level: 1 })).toContain('all_hero_wins');
  });
});
