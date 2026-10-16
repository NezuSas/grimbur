import { EMPTY_STATS, LocalStats, addAchievementEmbers, currentStreak, mergeDailyRun, mergeRun, parseStats, streakStatus } from '../../src/core/stats/runStats';
import { ACHIEVEMENTS, rewardFor, splitNames, newAchievements } from '../../src/core/stats/achievements';
import {
  EMBERS_PER_FLOOR,
  MILESTONE_EMBERS,
  dailyBonus,
  embersFor,
  milestoneEmbers,
} from '../../src/core/stats/forge';
import { closestAchievements, forgeGoal, heroGoal, newlyAffordable, nextGoals } from '../../src/core/stats/goals';
import { endlessProgress, isEndlessUnlocked, newUnlocks } from '../../src/core/stats/unlocks';
import { DAILY_EPOCH, buildDailyShareText, dailyNumber, dailyPips } from '../../src/core/stats/share';
import { decodeBackup, encodeBackup, DEFAULT_BACKUP_SETTINGS } from '../../src/core/stats/backup';

/** A veteran who is past every floor milestone, so tests about other payouts stay readable. */
const seasoned: LocalStats = { ...EMPTY_STATS, bestLevel: 10 };

describe('B1: the daily bonus uses the effective streak', () => {
  it('pays the base bonus when the stored streak is broken', () => {
    const stale: LocalStats = { ...seasoned, streak: 20, bestStreak: 20, lastDailyDate: '2026-10-01', lastBonusDate: '2026-10-01', lastPlayedDate: '2026-10-01' };
    const r = mergeRun(stale, { score: 0, level: 1, day: '2026-10-05' });
    expect(r.payout.daily).toBe(dailyBonus(0));
    expect(r.payout.daily).not.toBe(dailyBonus(20));
  });

  it('pays the streak bonus when the streak is alive', () => {
    const alive: LocalStats = { ...seasoned, streak: 4, bestStreak: 4, lastDailyDate: '2026-10-04', lastBonusDate: '2026-10-04', lastPlayedDate: '2026-10-04' };
    expect(mergeRun(alive, { score: 0, level: 1, day: '2026-10-05' }).payout.daily).toBe(dailyBonus(4));
  });
});

describe('B2: the embers breakdown adds up and is counted once', () => {
  it('total = run + milestone + daily + welcome back + achievements, and the balance grew by exactly that', () => {
    const run = { score: 3000, level: 3, day: '2026-10-05' };
    const merged = mergeRun(EMPTY_STATS, run);
    const achievements = newAchievements(merged.stats, run);
    expect(achievements.length).toBeGreaterThan(0);
    const payout = addAchievementEmbers(merged.payout, rewardFor(achievements));
    expect(payout.total).toBe(payout.run + payout.milestone + payout.daily + payout.welcomeBack + payout.achievements);
    expect(merged.stats.embers + payout.achievements - EMPTY_STATS.embers).toBe(payout.total);
  });
});

describe('B6: at most three names', () => {
  it('lists three and counts the rest', () => {
    expect(splitNames(['a', 'b'])).toEqual({ shown: ['a', 'b'], more: 0 });
    expect(splitNames(['a', 'b', 'c', 'd', 'e', 'f'])).toEqual({ shown: ['a', 'b', 'c'], more: 3 });
    expect(splitNames([])).toEqual({ shown: [], more: 0 });
  });
});

describe('B7: every achievement has its own icon', () => {
  it('has no duplicated icon', () => {
    const seen = new Map<string, string>();
    const dups: string[] = [];
    for (const a of ACHIEVEMENTS) {
      const other = seen.get(a.icon);
      if (other) dups.push(`${a.icon}: ${other}, ${a.id}`);
      seen.set(a.icon, a.id);
    }
    expect(dups).toEqual([]);
  });
});

describe('B4/B5: streak, best streak and the clock', () => {
  const day = (n: number) => `2026-10-${String(n).padStart(2, '0')}`;
  const play = (s: LocalStats, d: string) => mergeDailyRun(s, d, { score: 100, level: 2, day: d });

  it('keeps counting on consecutive days and remembers the best', () => {
    let s = EMPTY_STATS;
    for (let d = 1; d <= 4; d++) s = play(s, day(d)).stats;
    expect(s.streak).toBe(4);
    expect(s.bestStreak).toBe(4);
  });

  it('reports a lost streak with the best one, instead of silently resetting', () => {
    let s = EMPTY_STATS;
    for (let d = 1; d <= 4; d++) s = play(s, day(d)).stats;
    const status = streakStatus(s, day(8));
    expect(status).toMatchObject({ current: 0, lost: 4, best: 4 });
    const after = play(s, day(8));
    expect(after.streakEvent.lost).toBe(4);
    expect(after.stats.streak).toBe(1);
    expect(after.stats.bestStreak).toBe(4);
    expect(streakStatus(after.stats, day(8)).lost).toBe(0);
  });

  it('a streak of one day is not "lost"', () => {
    const s = play(EMPTY_STATS, day(1)).stats;
    expect(streakStatus(s, day(6)).lost).toBe(0);
  });

  it('survives the clock going back: nothing resets and nothing is paid twice', () => {
    let s = play(EMPTY_STATS, day(10)).stats;
    s = play(s, day(11)).stats;
    const back = mergeRun(s, { score: 100, level: 2, day: day(9) });
    expect(back.payout.daily).toBe(0); // the bonus of day 11 was already paid
    const again = mergeDailyRun(s, day(9), { score: 100, level: 2 });
    expect(again.stats.streak).toBe(2);
    expect(again.stats.lastDailyDate).toBe(day(11));
    expect(currentStreak(s, day(9))).toBe(2);
  });

  it('timezone travel forward by a day keeps a live streak alive and a long jump breaks it', () => {
    const s = play(EMPTY_STATS, day(10)).stats;
    expect(currentStreak(s, day(11))).toBe(1);
    expect(currentStreak(s, day(13))).toBe(0);
  });

  it('never throws on malformed keys', () => {
    expect(() => mergeDailyRun(EMPTY_STATS, 'garbage', { score: 1, level: 1 })).not.toThrow();
    expect(() => streakStatus({ ...EMPTY_STATS, lastDailyDate: '2026-10-01', streak: 3 }, 'x')).not.toThrow();
  });
});

describe('E: streak freezes', () => {
  const day = (n: number) => `2026-10-${String(n).padStart(2, '0')}`;
  const play = (s: LocalStats, d: string) => mergeDailyRun(s, d, { score: 100, level: 2, day: d });

  it('earns one every 7 days of streak, up to two', () => {
    let s = EMPTY_STATS;
    for (let d = 1; d <= 6; d++) s = play(s, day(d)).stats;
    expect(s.freezes).toBe(0);
    const seventh = play(s, day(7));
    expect(seventh.stats.freezes).toBe(1);
    expect(seventh.streakEvent.freezeEarned).toBe(true);
    s = seventh.stats;
    for (let d = 8; d <= 14; d++) s = play(s, day(d)).stats;
    expect(s.freezes).toBe(2);
    for (let d = 15; d <= 21; d++) s = play(s, day(d)).stats;
    expect(s.freezes).toBe(2); // capped
  });

  it('spends a freeze on exactly one missed day and keeps the streak', () => {
    const s: LocalStats = { ...EMPTY_STATS, streak: 8, bestStreak: 8, freezes: 1, lastDailyDate: day(10) };
    expect(currentStreak(s, day(12))).toBe(8);
    expect(streakStatus(s, day(12)).freezeWillSave).toBe(true);
    const r = play(s, day(12));
    expect(r.stats.streak).toBe(9);
    expect(r.stats.freezes).toBe(0);
    expect(r.streakEvent).toMatchObject({ freezeUsed: true, lost: 0 });
  });

  it('does not save a streak that missed two days, or one without a freeze', () => {
    const withFreeze: LocalStats = { ...EMPTY_STATS, streak: 8, bestStreak: 8, freezes: 2, lastDailyDate: day(10) };
    expect(currentStreak(withFreeze, day(13))).toBe(0);
    expect(play(withFreeze, day(13)).stats.streak).toBe(1);
    expect(play(withFreeze, day(13)).stats.freezes).toBe(2); // untouched
    const none: LocalStats = { ...withFreeze, freezes: 0 };
    expect(currentStreak(none, day(12))).toBe(0);
    expect(play(none, day(12)).streakEvent.lost).toBe(8);
  });
});

describe('E: welcome back', () => {
  const base: LocalStats = { ...seasoned, lastPlayedDate: '2026-10-01', lastBonusDate: '2026-10-01' };

  it('doubles the run embers after 3+ days away', () => {
    const run = { score: 1000, level: 4, day: '2026-10-04' };
    const r = mergeRun(base, run);
    expect(r.payout.welcomeBack).toBe(embersFor(run));
    expect(r.payout.total).toBe(r.payout.run + r.payout.daily + r.payout.welcomeBack);
  });

  it('is capped at +100 and not paid after only 2 days or on the same day twice', () => {
    expect(mergeRun(base, { score: 0, level: 10, victory: true, ascension: 4, day: '2026-10-09' }).payout.welcomeBack).toBe(100);
    expect(mergeRun(base, { score: 1000, level: 4, day: '2026-10-03' }).payout.welcomeBack).toBe(0);
    const once = mergeRun(base, { score: 1000, level: 4, day: '2026-10-09' }).stats;
    expect(mergeRun(once, { score: 1000, level: 4, day: '2026-10-09' }).payout.welcomeBack).toBe(0);
  });

  it('is not paid on the very first run, nor for an abandoned run', () => {
    expect(mergeRun(EMPTY_STATS, { score: 500, level: 2, day: '2026-10-09' }).payout.welcomeBack).toBe(0);
    expect(mergeRun(base, { score: 0, level: 1, day: '2026-10-09', progressed: false }).payout.total).toBe(0);
  });
});

describe('D: the embers economy', () => {
  it('pays 6 per floor, with the victory still 50 + 15 per depth', () => {
    expect(EMBERS_PER_FLOOR).toBe(6);
    expect(embersFor({ score: 0, level: 10, victory: true })).toBe(60 + 50);
    expect(embersFor({ score: 0, level: 10, victory: true, ascension: 2 })).toBe(60 + 50 + 30);
  });

  it('milestones pay once per new deepest floor, capped at floor 10', () => {
    expect(milestoneEmbers(0, 3)).toBe(3 * MILESTONE_EMBERS);
    expect(milestoneEmbers(3, 5)).toBe(2 * MILESTONE_EMBERS);
    expect(milestoneEmbers(5, 5)).toBe(0);
    expect(milestoneEmbers(5, 2)).toBe(0);
    expect(milestoneEmbers(8, 14)).toBe(2 * MILESTONE_EMBERS);
    expect(milestoneEmbers(10, 20)).toBe(0);
    expect(milestoneEmbers(NaN, NaN)).toBe(0);
  });

  it('is paid on the first time only (expedition and daily) and endless never pays it', () => {
    const first = mergeRun(EMPTY_STATS, { score: 0, level: 4, day: '2026-10-05' });
    expect(first.payout.milestone).toBe(40);
    const again = mergeRun(first.stats, { score: 0, level: 4, day: '2026-10-06' });
    expect(again.payout.milestone).toBe(0);
    const deeper = mergeDailyRun(again.stats, '2026-10-07', { score: 0, level: 6 });
    expect(deeper.payout.milestone).toBe(20);
    expect(mergeRun(EMPTY_STATS, { score: 0, level: 9, mode: 'endless', day: '2026-10-05' }).payout.milestone).toBe(0);
  });

  // Run embers (before first-time extras) for a table of typical outcomes, Fortune 0.
  it.each([
    ['dies on floor 3 with 3000 pts', { score: 3000, level: 3 }, 12 + 18],
    ['dies on floor 5 with 5000 pts', { score: 5000, level: 5 }, 20 + 30],
    ['wins at depth 0 with 12000 pts', { score: 12000, level: 10, victory: true }, 48 + 60 + 50],
    ['wins at depth 2 with 12000 pts', { score: 12000, level: 10, victory: true, ascension: 2 }, 48 + 60 + 50 + 30],
  ])('%s', (_name, run, expected) => {
    expect(embersFor(run)).toBe(expected);
    expect(mergeRun(seasoned, { ...run, day: '2026-10-05' }).payout.run).toBe(expected);
  });

  it('a first-time death on floor 3 pays run + 30 milestone + daily bonus', () => {
    const r = mergeRun(EMPTY_STATS, { score: 3000, level: 3, day: '2026-10-05' });
    expect(r.payout).toMatchObject({ run: 30, milestone: 30, daily: 15, welcomeBack: 0, total: 75 });
  });
});

describe('parseStats tolerates old saves', () => {
  const old = JSON.stringify({
    bestScore: 900,
    bestLevel: 4,
    gamesPlayed: 6,
    victories: 0,
    embers: 120,
    streak: 5,
    lastDailyDate: '2026-10-02',
    lastBonusDate: '2026-10-02',
    history: [],
  });

  it('fills the new fields from what an old save knows', () => {
    const s = parseStats(old);
    expect(s.bestStreak).toBe(5);
    expect(s.freezes).toBe(0);
    expect(s.lastPlayedDate).toBe('2026-10-02');
    expect(s.embers).toBe(120);
  });

  it('clamps nonsense in the new fields', () => {
    const s = parseStats(JSON.stringify({ streak: 3, bestStreak: -4, freezes: 99, lastPlayedDate: 'yesterday' }));
    expect(s.bestStreak).toBe(3);
    expect(s.freezes).toBe(2);
    expect(s.lastPlayedDate).toBeNull();
  });

  it('survives garbage', () => {
    expect(parseStats('{')).toEqual(EMPTY_STATS);
    expect(parseStats(null)).toEqual(EMPTY_STATS);
  });

  it('roundtrips the new fields through a backup code', () => {
    const stats: LocalStats = { ...EMPTY_STATS, streak: 9, bestStreak: 12, freezes: 2, lastPlayedDate: '2026-10-05', lastDailyDate: '2026-10-05', embers: 77, lifetimeEmbers: 77 };
    const result = decodeBackup(encodeBackup(stats, DEFAULT_BACKUP_SETTINGS));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.stats).toEqual(stats);
  });
});

describe('C: endless unlocks earlier', () => {
  it.each([
    [{ victories: 1 }, true],
    [{ bestLevel: 5 }, true],
    [{ gamesPlayed: 8 }, true],
    [{ bestLevel: 4, gamesPlayed: 7, victories: 0 }, false],
    [{}, false],
  ])('%j -> %s', (patch, expected) => {
    expect(isEndlessUnlocked({ ...EMPTY_STATS, ...patch })).toBe(expected);
  });

  it('shows progress towards the closest route', () => {
    expect(endlessProgress({ ...EMPTY_STATS, bestLevel: 3, gamesPlayed: 3 })).toEqual({ kind: 'floor', current: 3, target: 5 });
    expect(endlessProgress({ ...EMPTY_STATS, bestLevel: 2, gamesPlayed: 7 })).toEqual({ kind: 'games', current: 7, target: 8 });
    expect(endlessProgress(EMPTY_STATS)).toEqual({ kind: 'floor', current: 0, target: 5 });
  });
});

describe('G/B8: new unlocks', () => {
  it('reports heroes, a deeper depth and the endless mode', () => {
    const before: LocalStats = { ...EMPTY_STATS, bestLevel: 3, gamesPlayed: 3 };
    const after: LocalStats = { ...before, bestLevel: 5, gamesPlayed: 4, maxAscension: 1, victories: 1 };
    expect(newUnlocks(before, after)).toEqual({ heroes: [1, 3], depth: 1, endless: true });
  });

  it('reports nothing when nothing opened', () => {
    expect(newUnlocks(EMPTY_STATS, { ...EMPTY_STATS, gamesPlayed: 1 })).toEqual({ heroes: [], depth: null, endless: false });
  });

  it('a first victory at depth 0 opens depth 1', () => {
    const run = { score: 9000, level: 10, victory: true, day: '2026-10-05' };
    const after = mergeRun(EMPTY_STATS, run).stats;
    expect(newUnlocks(EMPTY_STATS, after).depth).toBe(1);
  });
});

describe('B: next goals', () => {
  it('recommends the cheapest forge item with the missing embers', () => {
    const g = forgeGoal({ ...EMPTY_STATS, embers: 20 });
    expect(g).toMatchObject({ kind: 'forge', affordable: false, cost: 40 });
    expect(g?.remaining).toBe(20);
    expect(g?.progress).toBeCloseTo(0.5);
  });

  it('flags a purchase that is affordable', () => {
    const g = forgeGoal({ ...EMPTY_STATS, embers: 500 });
    expect(g?.affordable).toBe(true);
    expect(g?.remaining).toBe(0);
  });

  it('finds the hero closest to opening and measures a victory by floors reached', () => {
    expect(heroGoal({ ...EMPTY_STATS, bestLevel: 3 })).toMatchObject({ hero: 1, metric: 'floor', current: 3, target: 4, remaining: 1 });
    expect(heroGoal({ ...EMPTY_STATS, bestLevel: 7 })).toMatchObject({ hero: 3, metric: 'victory', remaining: 1 });
    expect(heroGoal({ ...EMPTY_STATS, bestLevel: 10, victories: 1, dailyRuns: 5, lifetimeEmbers: 500 })).toBeNull();
  });

  it('picks the open achievement closest to done', () => {
    const stats: LocalStats = { ...EMPTY_STATS, gamesPlayed: 4, totalGems: 3, achievements: { first_steps: 'x' } };
    const [best] = closestAchievements(stats, 1);
    expect(best.progress).toBeGreaterThan(0.5);
    expect(best.id in stats.achievements).toBe(false);
  });

  it('puts what you can buy first, otherwise the nearest goal, and respects max', () => {
    const rich: LocalStats = { ...EMPTY_STATS, embers: 100, bestLevel: 1 };
    expect(nextGoals(rich, 2)[0]).toMatchObject({ kind: 'forge', affordable: true });
    expect(nextGoals(rich, 1)).toHaveLength(1);
    const near: LocalStats = { ...EMPTY_STATS, embers: 0, bestLevel: 3 };
    expect(nextGoals(near, 2)[0]).toMatchObject({ kind: 'hero', hero: 1 });
    expect(nextGoals(near, 0)).toEqual([]);
  });

  it('gives nothing for a bought-out veteran with no partial achievements', () => {
    const forge: Record<string, number> = {};
    for (const id of ['whetstone', 'ward', 'explorer', 'scribe', 'eagle_eye', 'purse', 'fortune', 'feather', 'start_lantern', 'start_trap_sense', 'start_iron_boots', 'start_frost', 'start_lucky_coin', 'start_long_bow', 'start_hunter', 'start_quiver', 'start_greed', 'start_bulwark', 'satchel', 'swift', 'second_wind']) forge[id] = 9;
    const maxed = parseStats(JSON.stringify({ forge, bestLevel: 10, victories: 1, dailyRuns: 5, lifetimeEmbers: 500 }));
    expect(forgeGoal(maxed)).toBeNull();
    expect(heroGoal(maxed)).toBeNull();
  });

  it('detects what a run made newly affordable', () => {
    const before: LocalStats = { ...EMPTY_STATS, embers: 30 };
    const after: LocalStats = { ...before, embers: 70 };
    expect(newlyAffordable(before, after)).toEqual(expect.arrayContaining(['purse', 'whetstone']));
    expect(newlyAffordable(after, after)).toEqual([]);
  });
});

describe('F: the daily share text', () => {
  it('numbers days from a fixed epoch', () => {
    expect(dailyNumber(DAILY_EPOCH)).toBe(1);
    expect(dailyNumber('2026-10-14')).toBe(14);
    expect(dailyNumber('2020-01-01')).toBe(1);
    expect(dailyNumber('nope')).toBe(1);
  });

  it('draws green for cleared floors, red for the death, black for the rest', () => {
    expect(dailyPips(4, 10, false)).toBe('🟩🟩🟩🟥⬛⬛⬛⬛⬛⬛');
    expect(dailyPips(1, 10, false)).toBe('🟥⬛⬛⬛⬛⬛⬛⬛⬛⬛');
  });

  it('crowns a victory', () => {
    expect(dailyPips(10, 10, true)).toBe('🟩🟩🟩🟩🟩🟩🟩🟩🟩👑');
  });

  it('is robust to odd input', () => {
    expect(dailyPips(99, 10, false)).toBe('🟩🟩🟩🟩🟩🟩🟩🟩🟩🟥');
    expect(dailyPips(NaN, 0, false)).toBe('🟥');
  });

  it('builds the whole message', () => {
    const text = buildDailyShareText({
      dateKey: '2026-10-14',
      level: 3,
      floors: 10,
      victory: false,
      title: n => `Wumpus Adventures Daily #${n}`,
      scoreText: '1,234 pts',
      streakText: '3-day streak',
      footer: 'Same cave for everyone.',
    });
    expect(text).toBe('Wumpus Adventures Daily #14\n🟩🟩🟥⬛⬛⬛⬛⬛⬛⬛\n1,234 pts · 🔥 3-day streak\nSame cave for everyone.');
  });

  it('omits the streak and footer when there are none', () => {
    const text = buildDailyShareText({ dateKey: '2026-10-01', level: 10, floors: 10, victory: true, title: n => `#${n}`, scoreText: '9 pts' });
    expect(text).toBe('#1\n🟩🟩🟩🟩🟩🟩🟩🟩🟩👑\n9 pts');
  });
});

describe('H: the countdown to the next daily', () => {
  const { formatCountdown } = require('../../src/core/stats/countdown');
  it('formats hours and minutes', () => {
    expect(formatCountdown(3 * 3_600_000 + 20 * 60_000)).toBe('3h 20m');
    expect(formatCountdown(2 * 3_600_000)).toBe('2h');
    expect(formatCountdown(42 * 60_000)).toBe('42m');
    expect(formatCountdown(30_000)).toBe('1m');
    expect(formatCountdown(0)).toBe('<1m');
    expect(formatCountdown(NaN)).toBe('<1m');
  });
});
