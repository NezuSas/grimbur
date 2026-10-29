import { EMPTY_STATS, LocalStats, parseStats } from '../../src/core/stats/runStats';
import { COSMETICS, buyCosmetic, equipCosmetic, equippedCosmetic, hasFullWardrobe, ownsCosmetic, parseCosmetics } from '../../src/core/cosmetics/cosmetics';
import { DEAL_DISCOUNT, buyDeal, dailyDeals, dealPrice } from '../../src/core/cosmetics/dailyShop';
import { SKINS_BY_HERO, skinKey } from '../../src/core/skins/skins';

const rich = (embers = 100_000): LocalStats => ({ ...EMPTY_STATS, embers });

describe('cosmetics', () => {
  it('sells an item once, spending its price', () => {
    const bought = buyCosmetic(rich(1000), 'trail_fire')!;
    expect(bought.embers).toBe(600);
    expect(ownsCosmetic(bought, 'trail_fire')).toBe(true);
    expect(buyCosmetic(bought, 'trail_fire')).toBeNull();
    expect(buyCosmetic(rich(100), 'trail_fire')).toBeNull();
  });

  it('never sells an earn-only item, which arrives with its achievement', () => {
    expect(buyCosmetic(rich(), 'frame_crown')).toBeNull();
    expect(ownsCosmetic(rich(), 'frame_crown')).toBe(false);
    const earned = { ...rich(), achievements: { grimbur_bane: '2026-10-29' } };
    expect(ownsCosmetic(earned, 'frame_crown')).toBe(true);
    expect(ownsCosmetic(earned, 'title_bane')).toBe(true);
  });

  it('a full wardrobe of any one hero earns the wardrobe frame and title', () => {
    const owned = SKINS_BY_HERO[1].filter(s => s !== 'classic').map(s => skinKey(1, s));
    const stats = { ...rich(), skins: { owned, equipped: {} } };
    expect(hasFullWardrobe(stats)).toBe(true);
    expect(ownsCosmetic(stats, 'frame_wardrobe')).toBe(true);
    expect(ownsCosmetic(rich(), 'title_wardrobe')).toBe(false);
  });

  it('equips only owned items in their own slot, and can empty a slot', () => {
    const s = buyCosmetic(rich(), 'frame_gold')!;
    expect(equipCosmetic(s, 'trail', 'frame_gold')).toBeNull();
    expect(equipCosmetic(rich(), 'frame', 'frame_silver')).toBeNull();
    const worn = equipCosmetic(s, 'frame', 'frame_gold')!;
    expect(equippedCosmetic(worn, 'frame')).toBe('frame_gold');
    expect(equippedCosmetic(equipCosmetic(worn, 'frame', null)!, 'frame')).toBeNull();
  });

  it('survives a save round trip and drops anything unknown', () => {
    const s = equipCosmetic(buyCosmetic(rich(), 'board_magma')!, 'board', 'board_magma')!;
    const back = parseStats(JSON.stringify(s));
    expect(back.cosmetics.owned).toEqual(['board_magma']);
    expect(equippedCosmetic(back, 'board')).toBe('board_magma');
    expect(parseCosmetics({ owned: ['nope', 'frame_crown', 'trail_fire'], equipped: { trail: 'frame_gold' } })).toEqual({
      owned: ['trail_fire'],
      equipped: {},
      deals: { date: null, bought: [] },
    });
    expect(parseStats(JSON.stringify({ embers: 5 })).cosmetics).toEqual(EMPTY_STATS.cosmetics);
  });

  it('every item is either sold or earnable', () => {
    for (const c of COSMETICS) expect(c.price > 0 || !!c.unlock).toBe(true);
  });
});

describe('daily shop', () => {
  const day = '2026-10-29';

  it('offers one outfit and two cosmetics, the same all day, at a discount', () => {
    const deals = dailyDeals(rich(), day);
    expect(deals).toHaveLength(3);
    expect(deals[0].item.kind).toBe('skin');
    expect(deals.slice(1).every(d => d.item.kind === 'cosmetic')).toBe(true);
    expect(dailyDeals(rich(), day)).toEqual(deals);
    for (const d of deals) expect(d.price).toBe(dealPrice(d.fullPrice));
    expect(dealPrice(1000)).toBe(1000 * (1 - DEAL_DISCOUNT));
  });

  it('changes from one day to the next', () => {
    const keys = (d: string) => dailyDeals(rich(), d).map(x => x.key).join();
    const days = ['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'].map(keys);
    expect(new Set(days).size).toBeGreaterThan(1);
  });

  it('a deal is bought at its deal price and stays on the shelf, marked, without reshuffling', () => {
    const before = dailyDeals(rich(5000), day);
    const deal = before[1];
    const after = buyDeal(rich(5000), day, deal.key)!;
    expect(after.embers).toBe(5000 - deal.price);
    const shelf = dailyDeals(after, day);
    expect(shelf.map(d => d.key)).toEqual(before.map(d => d.key));
    expect(shelf.find(d => d.key === deal.key)!.bought).toBe(true);
    expect(buyDeal(after, day, deal.key)).toBeNull();
  });

  it('an outfit deal adds the outfit for the deal price', () => {
    const deal = dailyDeals(rich(5000), day)[0];
    const after = buyDeal(rich(5000), day, deal.key)!;
    expect(after.embers).toBe(5000 - deal.price);
    if (deal.item.kind === 'skin') expect(after.skins.owned).toContain(skinKey(deal.item.hero, deal.item.skin));
  });

  it('refuses what is not on today\'s shelf or cannot be paid', () => {
    expect(buyDeal(rich(), day, 'cos:frame_crown')).toBeNull();
    const deal = dailyDeals(rich(0), day)[1];
    expect(buyDeal(rich(0), day, deal.key)).toBeNull();
  });

  it('skips what the player already owns', () => {
    const first = dailyDeals(rich(), day)[1];
    if (first.item.kind !== 'cosmetic') throw new Error('expected a cosmetic');
    const owner = buyCosmetic(rich(), first.item.id)!;
    expect(dailyDeals(owner, day).map(d => d.key)).not.toContain(first.key);
  });
});

describe('public look', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { lookOf, parseLook, lookProblems } = require('../../src/core/cosmetics/look');

  it('carries only the filled slots of what the player wears', () => {
    expect(lookOf(rich())).toEqual({});
    const s = equipCosmetic(buyCosmetic(rich(), 'frame_gold')!, 'frame', 'frame_gold')!;
    expect(lookOf(s)).toEqual({ frame: 'frame_gold' });
    expect(lookOf(null)).toEqual({});
  });

  it('reads only known frames and titles off somebody else\'s row', () => {
    expect(parseLook({ frame: 'frame_crown', title: 'title_bane' })).toEqual({ frame: 'frame_crown', title: 'title_bane' });
    expect(parseLook({ frame: 'title_bane', title: 'frame_zzz' })).toEqual({});
    expect(parseLook(undefined)).toEqual({});
  });

  it('flags look fields the server would refuse', () => {
    expect(lookProblems({})).toEqual([]);
    expect(lookProblems({ frame: 'frame_gold', title: 'title_slayer' })).toEqual([]);
    expect(lookProblems({ frame: 'crown', title: 7 })).toEqual(['frame', 'title']);
  });
});
