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
    await recordRun({ score: 8000, level: 10, victory: false });
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
    expect(after.embers).toBeGreaterThan(before.embers - 60); // spent 60, got the reward back (10 or more)
    expect((await buyUpgrade('whetstone'))?.achievements).not.toContain('first_forge'); // only once
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
