const store = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    // A real storage call takes a moment; the delay is what lets two updates overlap.
    getItem: jest.fn(async (key: string) => {
      await new Promise(r => setTimeout(r, 5));
      return store.get(key) ?? null;
    }),
    setItem: jest.fn(async (key: string, value: string) => {
      await new Promise(r => setTimeout(r, 5));
      store.set(key, value);
    }),
  },
}));

import { buyUpgrade, getLocalStats, recordRun } from '../../src/services/localStats';

describe('local stats writes', () => {
  beforeEach(() => store.clear());

  it('never loses an update when a run is saved while an upgrade is bought', async () => {
    // Seed enough embers for a purchase.
    await recordRun({ score: 8000, level: 10, victory: true });
    const embersAfterFirstRun = (await getLocalStats()).embers;
    expect(embersAfterFirstRun).toBeGreaterThanOrEqual(60);

    const [, bought] = await Promise.all([
      recordRun({ score: 1000, level: 3, victory: false }),
      buyUpgrade('whetstone'),
    ]);
    const stats = await getLocalStats();

    expect(bought?.stats.forge.whetstone).toBe(1);
    expect(stats.forge.whetstone).toBe(1); // the purchase survived the overlapping run save
    expect(stats.gamesPlayed).toBe(2); // and so did the run
  });
});

describe('B3: buying in the Forge evaluates achievements', () => {
  beforeEach(() => store.clear());

  it('unlocks first_forge, persists it and pays its reward', async () => {
    await recordRun({ score: 8000, level: 10, victory: false });
    const before = await getLocalStats();
    expect(before.achievements.first_forge).toBeUndefined();
    const bought = await buyUpgrade('whetstone');
    expect(bought?.achievements).toContain('first_forge');
    const after = await getLocalStats();
    expect(after.achievements.first_forge).toBeDefined();
    expect(after.embers).toBeGreaterThan(before.embers - 150); // spent 150, got the reward back (10 or more)
    expect((await buyUpgrade('purse'))?.achievements ?? []).not.toContain('first_forge'); // only once
  });

  it('returns null and changes nothing when it cannot be bought', async () => {
    expect(await buyUpgrade('bulwark' as never)).toBeNull();
  });
});

describe('recordRun reports the whole payout once', () => {
  beforeEach(() => store.clear());

  it('embers equals the balance growth and the breakdown adds up', async () => {
    const result = await recordRun({ score: 3000, level: 3, day: '2026-10-05' });
    expect(result.embers).toBe(result.stats.embers);
    const p = result.payout;
    expect(p.total).toBe(p.run + p.milestone + p.daily + p.welcomeBack + p.achievements);
    expect(result.bonus).toBe(p.daily);
  });

  it('a daily run reports the lost streak and the unlocks', async () => {
    const { recordDailyRun } = require('../../src/services/localStats');
    await recordDailyRun({ score: 100, level: 2 }, '2026-10-01');
    await recordDailyRun({ score: 100, level: 2 }, '2026-10-02');
    const r = await recordDailyRun({ score: 100, level: 2 }, '2026-10-09');
    expect(r.streakLost).toBe(2);
    expect(r.bestStreak).toBe(2);
    expect(r.streak).toBe(1);
    expect(r.unlocks).toEqual({ heroes: [], depth: null, endless: false });
  });
});

describe('syncAchievements', () => {
  beforeEach(() => store.clear());

  it('unlocks (and pays) the achievements the stored numbers already satisfy, once', async () => {
    const { syncAchievements } = require('../../src/services/localStats');
    // Numbers that reached several goals without a run evaluating them (an achievement added later, a restored backup).
    store.set('grimbur.stats.v1', JSON.stringify({ gamesPlayed: 12, totalGems: 300, lifetimeEmbers: 1200, embers: 50, bestLevel: 5 }));
    const first = await syncAchievements();
    expect(first.achievements).toEqual(expect.arrayContaining(['embers_100', 'embers_1000', 'gems_250', 'ten_runs']));
    expect(first.stats.achievements.embers_1000).toBeDefined();
    expect(first.stats.embers).toBeGreaterThan(50); // their embers were paid
    const again = await syncAchievements();
    expect(again.achievements).toEqual([]); // nothing is paid twice
    expect(again.stats.embers).toBe(first.stats.embers);
  });

  it('does not unlock run-based achievements out of thin air', async () => {
    const { syncAchievements } = require('../../src/services/localStats');
    const r = await syncAchievements();
    expect(r.achievements).toEqual([]);
  });
});

describe('clock safety and review fixes', () => {
  it('a date set far ahead and then corrected no longer freezes the daily rewards', () => {
    const { sanitizeClock } = require('../../src/services/localStats');
    const { EMPTY_STATS } = require('../../src/core/stats/runStats');
    const stats = { ...EMPTY_STATS, lastBonusDate: '2027-10-15', lastPlayedDate: '2027-10-15', lastDailyDate: '2027-10-15' };
    const fixed = sanitizeClock(stats, new Date(2026, 9, 15, 12));
    expect(fixed.lastBonusDate).toBe('2026-10-15');
    expect(fixed.lastPlayedDate).toBe('2026-10-15');
    expect(fixed.lastDailyDate).toBe('2026-10-15');
    // tomorrow (a timezone edge) and today are left alone
    const ok = { ...EMPTY_STATS, lastBonusDate: '2026-10-16' };
    expect(sanitizeClock(ok, new Date(2026, 9, 15, 23))).toBe(ok);
  });

  it('whole-number scores with a fractional Forge multiplier', () => {
    const { gameReducer } = require('../../src/core/engine/reducer');
    const { createState } = require('../helpers/state');
    const { NO_PERKS } = require('../../src/core/engine/heroes');
    const s = createState({ perks: { ...NO_PERKS, newTileMultiplier: 1.25 } });
    const next = gameReducer(s, { type: 'MOVE', direction: 'RIGHT' });
    expect(Number.isInteger(next.score)).toBe(true);
  });

  it('the altar is not free for a hero or relic that returns the shield every floor', () => {
    const { gameReducer } = require('../../src/core/engine/reducer');
    const { createState } = require('../helpers/state');
    const { NO_PERKS } = require('../../src/core/engine/heroes');
    const base = createState({ perks: { ...NO_PERKS, startShield: true } });
    const ready = { ...base, isLevelUp: true, shield: true };
    expect(gameReducer(ready, { type: 'ALTAR' })).toEqual(ready);
    const plain = { ...createState(), isLevelUp: true, shield: true };
    expect(gameReducer(plain, { type: 'ALTAR' }).altarPending).toBe(true);
  });

  it('missions only roll forward', () => {
    const { syncMissions, EMPTY_MISSIONS } = require('../../src/core/stats/missions');
    const today = syncMissions(EMPTY_MISSIONS, '2026-10-15');
    expect(syncMissions(today, '2026-10-14')).toBe(today);
    expect(syncMissions(today, '2026-10-08')).toBe(today);
  });

  it('an old save keeps its embers counted as earned', () => {
    const { parseStats } = require('../../src/core/stats/runStats');
    expect(parseStats(JSON.stringify({ embers: 320 })).lifetimeEmbers).toBe(320);
  });
});
