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

    expect(bought?.forge.whetstone).toBe(1);
    expect(stats.forge.whetstone).toBe(1); // the purchase survived the overlapping run save
    expect(stats.gamesPlayed).toBe(2); // and so did the run
  });
});
