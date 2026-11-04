import { EMPTY_STATS, LocalStats, parseStats } from '../../src/core/stats/runStats';
import {
  COSMETICS,
  COSMETIC_KINDS,
  SHOT_KIND,
  buyCosmetic,
  collectionMilestonesReached,
  collectionProgress,
  cosmeticsOf,
  countsInCollection,
  equipCosmetic,
  equippedCosmetic,
  ownsCosmetic,
  parseCosmetics,
  type CosmeticId,
} from '../../src/core/cosmetics/cosmetics';
import { dailyDeals } from '../../src/core/cosmetics/dailyShop';
import { BOMB_LOOKS, ORB_LOOKS, TRAIL_LOOKS, shotLookFor } from '../../src/ui/cosmeticArt';

const rich = (embers = 100_000): LocalStats => ({ ...EMPTY_STATS, embers });
const ORBS: CosmeticId[] = ['orb_frost', 'orb_ember', 'orb_venom', 'orb_void', 'orb_stars', 'orb_royal'];
const BOMBS: CosmeticId[] = ['bomb_ember', 'bomb_frost', 'bomb_venom', 'bomb_storm', 'bomb_void', 'bomb_royal'];
const HEX = /^#[0-9A-F]{6}$/i;

describe('orb and bomb styles', () => {
  it('are two kinds of six, sold at the prices of the trails, each with a look drawn from two colours', () => {
    expect(COSMETIC_KINDS).toEqual(expect.arrayContaining(['orb', 'bomb']));
    expect(cosmeticsOf('orb').map(c => c.id)).toEqual(ORBS);
    expect(cosmeticsOf('bomb').map(c => c.id)).toEqual(BOMBS);
    const trailPrices = new Set(cosmeticsOf('trail').map(c => c.price));
    for (const c of [...cosmeticsOf('orb'), ...cosmeticsOf('bomb')]) {
      expect(c.price).toBeGreaterThan(0);
      expect(c.unlock).toBeUndefined();
      expect(trailPrices.has(c.price)).toBe(true);
    }
    for (const id of ORBS) {
      expect(ORB_LOOKS[id]!.core).toMatch(HEX);
      expect(ORB_LOOKS[id]!.glow).toMatch(HEX);
    }
    for (const id of BOMBS) {
      expect(BOMB_LOOKS[id]!.spark).toMatch(HEX);
      expect(BOMB_LOOKS[id]!.blast).toMatch(HEX);
    }
  });

  it('each weapon has its own slot', () => {
    expect(SHOT_KIND).toEqual({ bow: 'trail', orb: 'orb', bomb: 'bomb' });
  });

  it('are bought once and worn one per kind, beside an arrow trail', () => {
    let s = buyCosmetic(rich(5000), 'orb_void')!;
    expect(s.embers).toBe(5000 - 850);
    expect(buyCosmetic(s, 'orb_void')).toBeNull();
    s = buyCosmetic(buyCosmetic(buyCosmetic(s, 'orb_frost')!, 'bomb_storm')!, 'trail_fire')!;
    expect(equipCosmetic(s, 'trail', 'orb_void')).toBeNull();
    expect(equipCosmetic(s, 'bomb', 'orb_void')).toBeNull();
    expect(equipCosmetic(rich(), 'orb', 'orb_royal')).toBeNull();
    s = equipCosmetic(s, 'orb', 'orb_void')!;
    s = equipCosmetic(s, 'orb', 'orb_frost')!;
    s = equipCosmetic(equipCosmetic(s, 'bomb', 'bomb_storm')!, 'trail', 'trail_fire')!;
    expect(equippedCosmetic(s, 'orb')).toBe('orb_frost');
    expect(equippedCosmetic(s, 'bomb')).toBe('bomb_storm');
    expect(equippedCosmetic(s, 'trail')).toBe('trail_fire');
    expect(equippedCosmetic(equipCosmetic(s, 'orb', null)!, 'orb')).toBeNull();
  });

  it('survive a save round trip; a style in the wrong slot is dropped', () => {
    const s = equipCosmetic(equipCosmetic(buyCosmetic(buyCosmetic(rich(), 'orb_stars')!, 'bomb_royal')!, 'orb', 'orb_stars')!, 'bomb', 'bomb_royal')!;
    const back = parseStats(JSON.stringify(s));
    expect(back.cosmetics.owned).toEqual(['orb_stars', 'bomb_royal']);
    expect(equippedCosmetic(back, 'orb')).toBe('orb_stars');
    expect(equippedCosmetic(back, 'bomb')).toBe('bomb_royal');
    expect(parseCosmetics({ owned: ['orb_nope', 'bomb_void'], equipped: { orb: 'bomb_void', bomb: 'orb_frost', trail: 'orb_frost' } })).toEqual({
      owned: ['bomb_void'],
      equipped: {},
      deals: { date: null, bought: [] },
    });
  });

  it('the shot look follows the weapon: the trail for the bow, the orb or bomb style otherwise, null when none is worn', () => {
    expect(shotLookFor(null, 'bow')).toBeNull();
    expect(shotLookFor(rich(), 'orb')).toBeNull();
    let s = buyCosmetic(buyCosmetic(buyCosmetic(rich(), 'trail_frost')!, 'orb_ember')!, 'bomb_venom')!;
    // Owned but not worn: still the plain shot.
    expect(shotLookFor(s, 'bomb')).toBeNull();
    s = equipCosmetic(equipCosmetic(equipCosmetic(s, 'trail', 'trail_frost')!, 'orb', 'orb_ember')!, 'bomb', 'bomb_venom')!;
    expect(shotLookFor(s, 'bow')).toBe(TRAIL_LOOKS.trail_frost);
    expect(shotLookFor(s, 'orb')).toBe(ORB_LOOKS.orb_ember);
    expect(shotLookFor(s, 'bomb')).toBe(BOMB_LOOKS.bomb_venom);
  });

  it('can turn up among the daily deals, and a bought one leaves the shelf', () => {
    const days = Array.from({ length: 120 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));
    const hit = days.map(d => ({ d, deal: dailyDeals(rich(), d).find(x => x.item.kind === 'cosmetic' && /^(orb|bomb)_/.test(x.item.id)) })).find(x => x.deal);
    expect(hit).toBeDefined();
    const { d, deal } = hit!;
    if (deal!.item.kind !== 'cosmetic') throw new Error('expected a cosmetic');
    const owner = buyCosmetic(rich(), deal!.item.id)!;
    expect(dailyDeals(owner, d).map(x => x.key)).not.toContain(deal!.key);
  });
});

describe('the collection share leaves the weapon styles out', () => {
  it('they are not counted, so owning or lacking them never moves the share', () => {
    for (const c of COSMETICS) if (c.kind === 'orb' || c.kind === 'bomb') expect(countsInCollection(c)).toBe(false);
    const base = collectionProgress(rich());
    const counted = COSMETICS.filter(countsInCollection).length;
    expect(base.total).toBeGreaterThanOrEqual(counted);
    const withStyles: LocalStats = { ...rich(), cosmetics: { ...EMPTY_STATS.cosmetics, owned: [...ORBS, ...BOMBS] } };
    expect(collectionProgress(withStyles)).toEqual(base);
  });

  it('a player who had every older item keeps every milestone and its rewards', () => {
    const older = COSMETICS.filter(c => c.price > 0 && c.kind !== 'orb' && c.kind !== 'bomb').map(c => c.id);
    const quarter = Math.ceil(collectionProgress(rich()).total / 4);
    const s: LocalStats = { ...rich(), cosmetics: { ...EMPTY_STATS.cosmetics, owned: older.slice(0, quarter) } };
    expect(ownsCosmetic(s, 'title_collector')).toBe(true);
    expect(collectionMilestonesReached(s)).toBeGreaterThanOrEqual(1);
  });
});
