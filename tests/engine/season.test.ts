import { EMPTY_SEASON, SEASON_REWARDS, SEASON_TIERS, addSeasonRun, claimSeason, daysLeftInSeason, parseSeason, rolloverSeason, seasonClaimable, seasonPointsFor, syncSeason, tiersReached } from '../../src/core/stats/season';
import { EMPTY_STATS, mergeRun, parseStats } from '../../src/core/stats/runStats';
import { ownsCosmetic } from '../../src/core/cosmetics/cosmetics';

describe('seasons', () => {
  it('scores a run by its floors, a victory and the depth it was won at', () => {
    expect(seasonPointsFor({ level: 4 })).toBe(32);
    expect(seasonPointsFor({ level: 10, victory: true, ascension: 2 })).toBe(80 + 50 + 30);
    expect(seasonPointsFor({ level: 7 }, false)).toBe(0);
  });

  it('starts a fresh track every month and keeps the seasons completed', () => {
    const october = addSeasonRun(EMPTY_SEASON, '2026-10-31', 300);
    expect(october).toMatchObject({ key: '2026-10', points: 300 });
    const november = syncSeason({ ...october, completed: 2 }, '2026-11-01');
    expect(november).toEqual({ key: '2026-11', points: 0, claimed: 0, completed: 2, months: [] });
    expect(syncSeason(october, '2026-10-02')).toBe(october);
  });

  it('pays every reached tier once, and the last claim completes the season', () => {
    const s = addSeasonRun(EMPTY_SEASON, '2026-10-05', SEASON_TIERS[2]);
    expect(tiersReached(s.points)).toBe(3);
    const first = claimSeason(s);
    expect(first.embers).toBe(SEASON_REWARDS[0] + SEASON_REWARDS[1] + SEASON_REWARDS[2]);
    expect(claimSeason(first.state).embers).toBe(0);

    const full = claimSeason({ ...first.state, points: SEASON_TIERS[SEASON_TIERS.length - 1] });
    expect(full.state.completed).toBe(1);
    expect(seasonClaimable(full.state)).toBe(0);
  });

  it('counts the days left in the month', () => {
    expect(daysLeftInSeason('2026-10-31')).toBe(1);
    expect(daysLeftInSeason('2026-02-01')).toBe(28);
  });

  it('is filled by finished runs and survives a save', () => {
    const { stats } = mergeRun(EMPTY_STATS, { score: 900, level: 6, victory: false, day: '2026-10-20' } as never);
    expect(stats.season).toMatchObject({ key: '2026-10', points: 48 });
    expect(parseStats(JSON.stringify(stats)).season).toEqual(stats.season);
    expect(parseSeason({ key: 'bad', points: -3 })).toEqual(EMPTY_SEASON);
  });

  it('earns the season title once a track is completed', () => {
    expect(ownsCosmetic(EMPTY_STATS, 'title_season')).toBe(false);
    expect(ownsCosmetic({ ...EMPTY_STATS, season: { ...EMPTY_SEASON, completed: 1 } }, 'title_season')).toBe(true);
  });

  it('pays the reached but unclaimed tiers of last month when the month turns', () => {
    const october = addSeasonRun(EMPTY_SEASON, '2026-10-20', SEASON_TIERS[1]);
    const rolled = rolloverSeason(october, '2026-11-02');
    expect(rolled.embers).toBe(SEASON_REWARDS[0] + SEASON_REWARDS[1]);
    expect(rolled.state).toMatchObject({ key: '2026-11', points: 0, claimed: 0, completed: 0, months: [] });
    // Already claimed tiers are not paid twice; the same month changes nothing.
    expect(rolloverSeason(claimSeason(october).state, '2026-11-02').embers).toBe(0);
    expect(rolloverSeason(october, '2026-10-30')).toEqual({ state: october, embers: 0 });
    expect(rolloverSeason(EMPTY_SEASON, '2026-11-02').embers).toBe(0);
  });

  it('keeps the title of a finished but unclaimed month', () => {
    const full = addSeasonRun(EMPTY_SEASON, '2026-10-20', SEASON_TIERS[SEASON_TIERS.length - 1]);
    const rolled = rolloverSeason(full, '2026-11-01');
    expect(rolled.embers).toBe(SEASON_REWARDS.reduce((a, b) => a + b, 0));
    expect(rolled.state).toMatchObject({ key: '2026-11', completed: 1, months: ['2026-10'] });
    expect(syncSeason(full, '2026-11-01').months).toEqual(['2026-10']);
  });

  it("pays last month's unclaimed tiers with the first run of the new month", () => {
    const { stats: october } = mergeRun(EMPTY_STATS, { score: 900, level: 10, victory: true, ascension: 5, day: '2026-10-20' } as never);
    const owed = seasonClaimable(october.season);
    expect(owed).toBeGreaterThan(0);
    const { stats: november, payout } = mergeRun(october, { score: 100, level: 2, victory: false, day: '2026-11-03' } as never);
    expect(payout.season).toBe(owed);
    expect(november.embers - october.embers).toBe(payout.total);
    expect(november.season).toMatchObject({ key: '2026-11', claimed: 0, points: 16 });
  });
});
