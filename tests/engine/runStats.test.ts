import { EMPTY_STATS, currentStreak, mergeDailyRun, mergeRun, parseStats } from '../../src/core/stats/runStats';

describe('mergeRun', () => {
  it('flags and stores a new best score', () => {
    const { stats, isNewBestScore } = mergeRun(EMPTY_STATS, { score: 300, level: 2 });
    expect(isNewBestScore).toBe(true);
    expect(stats).toMatchObject({ bestScore: 300, bestLevel: 2, gamesPlayed: 1 });
  });

  it('keeps the previous bests when the run is worse, still counting the game', () => {
    const before = { ...EMPTY_STATS, bestScore: 900, bestLevel: 5, gamesPlayed: 3 };
    const { stats, isNewBestScore } = mergeRun(before, { score: 100, level: 1 });
    expect(isNewBestScore).toBe(false);
    expect(stats).toMatchObject({ bestScore: 900, bestLevel: 5, gamesPlayed: 4 });
  });

  it('does not call a tie a new best', () => {
    const before = { ...EMPTY_STATS, bestScore: 500, bestLevel: 1, gamesPlayed: 1 };
    expect(mergeRun(before, { score: 500, level: 1 }).isNewBestScore).toBe(false);
  });
});

describe('parseStats', () => {
  it('falls back to empty stats for missing or corrupt data', () => {
    expect(parseStats(null)).toEqual(EMPTY_STATS);
    expect(parseStats('not json')).toEqual(EMPTY_STATS);
  });

  it('sanitises invalid fields', () => {
    expect(parseStats('{"bestScore":"x","bestLevel":-3,"gamesPlayed":4}')).toEqual({
      ...EMPTY_STATS,
      gamesPlayed: 4,
    });
  });
});

describe('daily progress and streak', () => {
  it('starts a streak on the first daily run', () => {
    const { stats, isNewDailyBest } = mergeDailyRun(EMPTY_STATS, '2026-10-12', { score: 500, level: 3 });
    expect(isNewDailyBest).toBe(true);
    expect(stats.daily).toEqual({ date: '2026-10-12', bestScore: 500, bestLevel: 3, attempts: 1 });
    expect(stats.streak).toBe(1);
  });

  it('keeps the best of the day and counts attempts without growing the streak twice', () => {
    let { stats } = mergeDailyRun(EMPTY_STATS, '2026-10-12', { score: 500, level: 3 });
    const second = mergeDailyRun(stats, '2026-10-12', { score: 300, level: 2 });
    expect(second.isNewDailyBest).toBe(false);
    expect(second.stats.daily).toEqual({ date: '2026-10-12', bestScore: 500, bestLevel: 3, attempts: 2 });
    expect(second.stats.streak).toBe(1);
  });

  it('extends the streak on consecutive days and resets the daily best', () => {
    const day1 = mergeDailyRun(EMPTY_STATS, '2026-10-12', { score: 500, level: 3 }).stats;
    const day2 = mergeDailyRun(day1, '2026-10-13', { score: 100, level: 1 });
    expect(day2.stats.streak).toBe(2);
    expect(day2.stats.daily).toEqual({ date: '2026-10-13', bestScore: 100, bestLevel: 1, attempts: 1 });
    expect(day2.isNewDailyBest).toBe(true);
  });

  it('resets the streak after a missed day', () => {
    const day1 = mergeDailyRun(EMPTY_STATS, '2026-10-12', { score: 500, level: 3 }).stats;
    const later = mergeDailyRun(day1, '2026-10-15', { score: 50, level: 1 });
    expect(later.stats.streak).toBe(1);
  });

  it('keeps the personal best score separate but counts depth and games for unlocks', () => {
    const base = { ...EMPTY_STATS, bestScore: 900, bestLevel: 5, gamesPlayed: 7 };
    const { stats } = mergeDailyRun(base, '2026-10-12', { score: 5000, level: 9 });
    expect(stats.bestScore).toBe(900);
    expect(stats.bestLevel).toBe(9);
    expect(stats.gamesPlayed).toBe(8);
  });

  it('currentStreak shows a streak only while it is still alive', () => {
    const stats = mergeDailyRun(EMPTY_STATS, '2026-10-12', { score: 1, level: 1 }).stats;
    expect(currentStreak(stats, '2026-10-12')).toBe(1);
    expect(currentStreak(stats, '2026-10-13')).toBe(1);
    expect(currentStreak(stats, '2026-10-14')).toBe(0);
    expect(currentStreak(EMPTY_STATS, '2026-10-14')).toBe(0);
  });

  it('parses stored daily data defensively', () => {
    const raw = '{"bestScore":10,"streak":3,"lastDailyDate":"2026-10-12","daily":{"date":"2026-10-12","bestScore":7,"bestLevel":2,"attempts":4}}';
    expect(parseStats(raw).daily).toEqual({ date: '2026-10-12', bestScore: 7, bestLevel: 2, attempts: 4 });
    expect(parseStats('{"daily":{"date":"nope"},"lastDailyDate":5}')).toMatchObject({ daily: null, lastDailyDate: null });
  });
});
