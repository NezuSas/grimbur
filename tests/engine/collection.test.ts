import { EMPTY_STATS, LocalStats } from '../../src/core/stats/runStats';
import { SKINS_BY_HERO } from '../../src/core/skins/skins';
import { buySkin } from '../../src/core/skins/ownership';
import {
  COLLECTION_FILTERS,
  affordableOutfits,
  collectionBadge,
  collectionCount,
  heroCollectionCount,
  visibleSkins,
} from '../../src/core/skins/collection';

const rich: LocalStats = { ...EMPTY_STATS, embers: 5000 };

describe('collection', () => {
  it('counts every hero classic as owned from the start', () => {
    const total = SKINS_BY_HERO.reduce((n, s) => n + s.length, 0);
    expect(collectionCount(EMPTY_STATS)).toEqual({ owned: SKINS_BY_HERO.length, total });
    expect(heroCollectionCount(EMPTY_STATS, 0).owned).toBe(1);
    expect(heroCollectionCount(EMPTY_STATS, 0).total).toBe(SKINS_BY_HERO[0].length);
  });

  it('counts what was bought', () => {
    const bought = buySkin(rich, 0, 'ember');
    expect(bought).not.toBeNull();
    expect(collectionCount(bought!).owned).toBe(SKINS_BY_HERO.length + 1);
    expect(heroCollectionCount(bought!, 0).owned).toBe(2);
  });

  it('filters by owned, missing and premium, always in catalog order', () => {
    const bought = buySkin(rich, 0, 'royal')!;
    expect(visibleSkins(bought, 0, 'all')).toEqual(SKINS_BY_HERO[0]);
    expect(visibleSkins(bought, 0, 'owned')).toEqual(['classic', 'royal']);
    expect(visibleSkins(bought, 0, 'missing')).toEqual(SKINS_BY_HERO[0].filter(s => s !== 'classic' && s !== 'royal'));
    expect(visibleSkins(bought, 0, 'premium')).toEqual(['shadow', 'gilded']);
    // the filters together cover everything exactly once
    const own = visibleSkins(bought, 0, 'owned');
    const miss = visibleSkins(bought, 0, 'missing');
    expect([...own, ...miss].sort()).toEqual([...SKINS_BY_HERO[0]].sort());
    expect(COLLECTION_FILTERS).toEqual(['all', 'owned', 'missing', 'premium']);
  });

  it('lists what can be paid for right now, and shows a badge only then', () => {
    expect(affordableOutfits(EMPTY_STATS)).toEqual([]);
    expect(collectionBadge(EMPTY_STATS)).toBe(false);
    const some = { ...EMPTY_STATS, embers: 300 };
    const list = affordableOutfits(some);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every(o => o.skin !== 'classic' && o.skin !== 'shadow' && o.skin !== 'gilded')).toBe(true);
    expect(collectionBadge(some)).toBe(true);
  });

  it('shows the badge when a play goal is met and not claimed yet, even with no embers', () => {
    const wins = { ...EMPTY_STATS, heroWins: [3, 0, 0, 0] };
    expect(collectionBadge(wins)).toBe(true);
  });
});
