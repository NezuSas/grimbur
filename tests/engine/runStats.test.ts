import { EMPTY_STATS, mergeRun, parseStats } from '../../src/core/stats/runStats';

describe('mergeRun', () => {
  it('flags and stores a new best score', () => {
    const { stats, isNewBestScore } = mergeRun(EMPTY_STATS, { score: 300, level: 2 });
    expect(isNewBestScore).toBe(true);
    expect(stats).toEqual({ bestScore: 300, bestLevel: 2, gamesPlayed: 1 });
  });

  it('keeps the previous bests when the run is worse, still counting the game', () => {
    const before = { bestScore: 900, bestLevel: 5, gamesPlayed: 3 };
    const { stats, isNewBestScore } = mergeRun(before, { score: 100, level: 1 });
    expect(isNewBestScore).toBe(false);
    expect(stats).toEqual({ bestScore: 900, bestLevel: 5, gamesPlayed: 4 });
  });

  it('does not call a tie a new best', () => {
    const before = { bestScore: 500, bestLevel: 1, gamesPlayed: 1 };
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
      bestScore: 0,
      bestLevel: 0,
      gamesPlayed: 4,
    });
  });
});
