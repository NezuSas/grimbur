const store = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => store.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  },
}));

import { SKINS, SKIN_IDS, SKINS_BY_HERO } from '../../src/core/skins/skins';
import { buySkin, claimUnlockedSkins, equipSkin, equippedSkin, ownedSkins, skinStatus } from '../../src/core/skins/ownership';
import { EMPTY_STATS, LocalStats, mergeRun, parseStats } from '../../src/core/stats/runStats';
import { HERO_COUNT } from '../../src/core/stats/achievements';
import { decodeBackup, encodeBackup } from '../../src/core/stats/backup';
import { buySkinFor, equipSkinFor, getLocalStats, recordDailyRun, recordRun } from '../../src/services/localStats';

const rich = (embers = 5000): LocalStats => ({ ...EMPTY_STATS, embers });

describe('skin catalog', () => {
  it('is sane', () => {
    expect(new Set(SKIN_IDS).size).toBe(SKIN_IDS.length);
    for (const id of SKIN_IDS) {
      const s = SKINS[id];
      expect(s.id).toBe(id);
      if (s.tier === 'free') expect(s.price).toBe(0);
      else expect(s.price).toBeGreaterThan(0);
      if (s.premium) expect(s.tier).toBe('legendary');
    }
    expect(SKINS.shadow.premium && SKINS.gilded.premium).toBe(true);
    expect(SKINS.shadow.productId).toBe('skin_shadow');
  });

  it('offers each hero every skin except the one matching its colour', () => {
    expect(SKINS_BY_HERO).toHaveLength(HERO_COUNT);
    expect(SKINS_BY_HERO[0]).toEqual(['classic', 'ember', 'verdant', 'royal', 'shadow', 'gilded']);
    expect(SKINS_BY_HERO[1]).not.toContain('ember');
    expect(SKINS_BY_HERO[2]).not.toContain('verdant');
    expect(SKINS_BY_HERO[3]).not.toContain('gilded');
    expect(SKINS_BY_HERO[4]).toEqual([...SKIN_IDS]); // Mira: magenta is none of the themes
    expect(SKINS_BY_HERO[5]).not.toContain('ember'); // Bram: copper-orange
    expect(SKINS_BY_HERO[5]).toHaveLength(SKIN_IDS.length - 1);
    for (const list of SKINS_BY_HERO) expect(list[0]).toBe('classic');
  });
});

describe('parseStats and skins', () => {
  it('gives old saves no skins and depth 0', () => {
    const s = parseStats(JSON.stringify({ bestScore: 5, embers: 10 }));
    expect(s.skins).toEqual({ owned: [], equipped: {} });
    expect(s.heroBestDepth).toEqual(new Array(HERO_COUNT).fill(0));
  });

  it('survives garbage', () => {
    for (const skins of [null, 5, 'x', [], { owned: 'x', equipped: 3 }]) {
      expect(parseStats(JSON.stringify({ skins })).skins).toEqual({ owned: [], equipped: {} });
    }
    const s = parseStats(JSON.stringify({
      heroBestDepth: [99, -1, 'a'],
      skins: {
        owned: ['0:ember', '0:ember', '0:classic', '1:ember', '9:royal', 'x', 7, '2:nope', '3:gilded', '1:shadow', '0:royal'],
        equipped: { '0': 'ember', '1': 'shadow', '2': 'royal', '9': 'ember', x: 'ember', '3': 5 },
      },
    }));
    expect(s.skins.owned.sort()).toEqual(['0:ember', '0:royal', '1:shadow']);
    expect(s.skins.equipped).toEqual({ '0': 'ember', '1': 'shadow' }); // equipped must be owned
    expect(s.heroBestDepth).toEqual([5, 0, 0, 0, 0, 0]);
  });
});

describe('ownership', () => {
  it('everybody owns classic, never stored', () => {
    expect(ownedSkins(EMPTY_STATS, 0)).toEqual(['classic']);
    expect(equippedSkin(EMPTY_STATS, 0)).toBe('classic');
    expect(ownedSkins(EMPTY_STATS, 99)).toEqual([]);
  });

  it('buys, spends embers and stays immutable', () => {
    const before = rich(1000);
    const frozen = JSON.stringify(before);
    const after = buySkin(before, 0, 'ember');
    expect(after?.embers).toBe(1000 - SKINS.ember.price);
    expect(ownedSkins(after as LocalStats, 0)).toEqual(['classic', 'ember']);
    expect(ownedSkins(after as LocalStats, 1)).toEqual(['classic']);
    expect(JSON.stringify(before)).toBe(frozen);
  });

  it('refuses invalid purchases', () => {
    expect(buySkin(rich(10), 0, 'ember')).toBeNull(); // too poor
    const once = buySkin(rich(), 0, 'ember') as LocalStats;
    expect(buySkin(once, 0, 'ember')).toBeNull(); // double buy
    expect(buySkin(rich(), 1, 'ember')) .toBeNull(); // not offered
    expect(buySkin(rich(), 0, 'classic')).toBeNull();
    expect(buySkin(rich(), 7, 'royal')).toBeNull();
  });

  it('equips only owned skins', () => {
    expect(equipSkin(rich(), 0, 'ember')).toBeNull();
    const owned = buySkin(rich(), 0, 'ember') as LocalStats;
    const worn = equipSkin(owned, 0, 'ember') as LocalStats;
    expect(equippedSkin(worn, 0)).toBe('ember');
    expect(equippedSkin(worn, 1)).toBe('classic');
    expect(equippedSkin(equipSkin(worn, 0, 'classic') as LocalStats, 0)).toBe('classic');
    expect(equippedSkin(owned, 0)).toBe('classic');
  });

  it('reports status, price and progress', () => {
    const s = skinStatus(rich(299), 0, 'ember');
    expect(s).toMatchObject({ owned: false, equipped: false, canBuy: false, price: 300, unlockedByPlay: false });
    expect(skinStatus(rich(300), 0, 'ember').canBuy).toBe(true);
    expect(skinStatus(rich(), 1, 'ember').canBuy).toBe(false);
    expect(skinStatus(EMPTY_STATS, 0, 'classic')).toMatchObject({ owned: true, equipped: true, canBuy: false });
    expect(skinStatus(EMPTY_STATS, 0, 'shadow').progress).toEqual({ have: 0, need: 3, kind: 'wins' });
    expect(skinStatus(EMPTY_STATS, 0, 'gilded').progress).toEqual({ have: 0, need: 2, kind: 'depthWin' });
    expect(skinStatus(EMPTY_STATS, 0, 'ember').progress).toBeUndefined();
  });

  it('claims skins whose goal is met, once', () => {
    const wins = { ...EMPTY_STATS, heroWins: [3, 2, 0, 0] };
    const { stats, claimed } = claimUnlockedSkins(wins);
    expect(claimed).toEqual([{ hero: 0, skin: 'shadow' }]);
    expect(ownedSkins(stats, 0)).toContain('shadow');
    expect(claimUnlockedSkins(stats).claimed).toEqual([]);
    expect(wins.skins.owned).toEqual([]);
    const deep = claimUnlockedSkins({ ...EMPTY_STATS, heroBestDepth: [0, 0, 0, 2] });
    expect(deep.claimed).toEqual([]); // hero 3 is not offered gilded
    expect(claimUnlockedSkins({ ...EMPTY_STATS, heroBestDepth: [0, 2, 0, 0] }).claimed).toEqual([{ hero: 1, skin: 'gilded' }]);
  });

  it('a bought skin is not claimed again', () => {
    const bought = buySkin({ ...rich(), heroWins: [3, 0, 0, 0] }, 0, 'shadow') as LocalStats;
    expect(claimUnlockedSkins(bought).claimed).toEqual([]);
  });
});

describe('heroBestDepth', () => {
  it('tracks the deepest expedition win per hero only', () => {
    let s = mergeRun(EMPTY_STATS, { score: 1, level: 10, victory: true, heroIndex: 1, ascension: 3, day: '2026-01-01' }).stats;
    s = mergeRun(s, { score: 1, level: 10, victory: true, heroIndex: 1, ascension: 1, day: '2026-01-01' }).stats;
    s = mergeRun(s, { score: 1, level: 10, victory: false, heroIndex: 2, ascension: 4, day: '2026-01-01' }).stats;
    s = mergeRun(s, { score: 1, level: 10, victory: true, heroIndex: 0, ascension: 4, mode: 'daily', day: '2026-01-01' }).stats;
    expect(s.heroBestDepth).toEqual([0, 3, 0, 0, 0, 0]);
  });
});

describe('backup with skins', () => {
  it('roundtrips and sanitises tampered skins', () => {
    const stats = equipSkin(buySkin(rich(), 0, 'royal') as LocalStats, 0, 'royal') as LocalStats;
    const decoded = decodeBackup(encodeBackup({ ...stats, heroBestDepth: [2, 0, 0, 0] }, {}));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.stats.skins).toEqual(stats.skins);
      expect(decoded.stats.heroBestDepth[0]).toBe(2);
    }
    const evil = { ...stats, skins: { owned: ['1:ember', '0:bogus'], equipped: { '0': 'royal' } } };
    const bad = decodeBackup(encodeBackup(evil as unknown as LocalStats, {}));
    if (bad.ok) expect(bad.stats.skins).toEqual({ owned: [], equipped: {} });
    expect(bad.ok).toBe(true);
    expect(decodeBackup(encodeBackup(stats, {}).slice(0, -2) + 'zz').ok).toBe(false);
  });
});

describe('services', () => {
  beforeEach(() => store.clear());

  it('buys and equips through storage', async () => {
    await recordRun({ score: 80000, level: 10, victory: true, heroIndex: 0, day: '2026-01-01', ascension: 0 });
    store.set('grimbur.stats.v1', JSON.stringify({ ...(await getLocalStats()), embers: 400 }));
    expect(await equipSkinFor(0, 'ember')).toBeNull();
    const bought = await buySkinFor(0, 'ember');
    expect(bought?.embers).toBe(100);
    expect(await buySkinFor(0, 'ember')).toBeNull();
    expect((await equipSkinFor(0, 'ember'))?.skins.equipped['0']).toBe('ember');
    expect(equippedSkin(await getLocalStats(), 0)).toBe('ember');
  });

  it('recordRun and recordDailyRun report newSkins when a goal is reached', async () => {
    const first = await recordRun({ score: 100, level: 3, victory: false, heroIndex: 0, day: '2026-01-01' });
    expect(first.newSkins).toEqual([]);
    for (let i = 0; i < 2; i++) await recordRun({ score: 100, level: 10, victory: true, heroIndex: 0, day: '2026-01-02' });
    const third = await recordRun({ score: 100, level: 10, victory: true, heroIndex: 0, day: '2026-01-03' });
    expect(third.newSkins).toEqual([{ hero: 0, skin: 'shadow' }]);
    expect(ownedSkins(third.stats, 0)).toContain('shadow');
    expect((await recordRun({ score: 1, level: 1, heroIndex: 0, day: '2026-01-04' })).newSkins).toEqual([]);

    const daily = await recordDailyRun({ score: 100, level: 10, victory: true, heroIndex: 1 }, '2026-01-05');
    expect(daily.newSkins).toEqual([]);
    for (let i = 0; i < 2; i++) await recordDailyRun({ score: 100, level: 10, victory: true, heroIndex: 1 }, '2026-01-05');
    expect((await getLocalStats()).skins.owned).toContain('1:shadow');
  });

  it('unlocks gilded by winning on depth 2', async () => {
    const r = await recordRun({ score: 100, level: 10, victory: true, heroIndex: 2, ascension: 2, day: '2026-01-01' });
    expect(r.newSkins).toEqual([{ hero: 2, skin: 'gilded' }]);
  });
});
