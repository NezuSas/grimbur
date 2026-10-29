import type { LocalStats } from '../stats/runStats';
import { createPRNG } from '../random/prng';
import { dailySeed } from '../engine/seed';
import { SKINS, SKINS_BY_HERO, type SkinId } from '../skins/skins';
import { buySkin, skinStatus } from '../skins/ownership';
import { COSMETICS, buyCosmetic, ownsCosmetic, type CosmeticId } from './cosmetics';

/** The share of the price the daily deals take off. */
export const DEAL_DISCOUNT = 0.3;
/** One outfit and two other cosmetics a day. */
const SKIN_DEALS = 1;
const COSMETIC_DEALS = 2;

export type DealItem = { kind: 'skin'; hero: number; skin: SkinId } | { kind: 'cosmetic'; id: CosmeticId };
export interface Deal {
  key: string;
  item: DealItem;
  fullPrice: number;
  price: number;
  /** Bought today (it stays on the shelf, marked, instead of being replaced). */
  bought: boolean;
}

export const dealKey = (item: DealItem): string => (item.kind === 'skin' ? `skin:${item.hero}:${item.skin}` : `cos:${item.id}`);
export const dealPrice = (fullPrice: number): number => Math.max(10, Math.round((fullPrice * (1 - DEAL_DISCOUNT)) / 10) * 10);

function shuffled<T>(list: readonly T[], seed: number): T[] {
  const rand = createPRNG(seed);
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const boughtToday = (stats: LocalStats, day: string): string[] => (stats.cosmetics.deals.date === day ? stats.cosmetics.deals.bought : []);

/**
 * Today's deals, the same all day for this player: the catalog is shuffled by the day, and what the player already
 * owns is skipped (except what they bought from today's shelf, which stays shown as bought so buying never reshuffles).
 */
export function dailyDeals(stats: LocalStats, day: string): Deal[] {
  const today = boughtToday(stats, day);
  const seed = dailySeed(`shop:${day}`);
  const skins: DealItem[] = [];
  SKINS_BY_HERO.forEach((list, hero) => list.forEach(skin => SKINS[skin].price > 0 && skins.push({ kind: 'skin', hero, skin })));
  const cosmetics: DealItem[] = COSMETICS.filter(c => c.price > 0).map(c => ({ kind: 'cosmetic', id: c.id }));
  const available = (item: DealItem) =>
    today.includes(dealKey(item)) || (item.kind === 'skin' ? !skinStatus(stats, item.hero, item.skin).owned : !ownsCosmetic(stats, item.id));
  const pick = (pool: DealItem[], n: number, salt: number) => shuffled(pool, seed + salt).filter(available).slice(0, n);
  return [...pick(skins, SKIN_DEALS, 0), ...pick(cosmetics, COSMETIC_DEALS, 7)].map(item => {
    const fullPrice = item.kind === 'skin' ? SKINS[item.skin].price : COSMETICS.find(c => c.id === item.id)!.price;
    const key = dealKey(item);
    return { key, item, fullPrice, price: dealPrice(fullPrice), bought: today.includes(key) };
  });
}

/** Buys one of today's deals at its deal price; null when it is not on today's shelf, already bought or too dear. */
export function buyDeal(stats: LocalStats, day: string, key: string): LocalStats | null {
  const deal = dailyDeals(stats, day).find(d => d.key === key);
  if (!deal || deal.bought) return null;
  const item = deal.item;
  let next: LocalStats | null;
  if (item.kind === 'skin') {
    const paid = buySkin({ ...stats, embers: stats.embers - deal.price + deal.fullPrice }, item.hero, item.skin);
    next = paid && stats.embers >= deal.price ? paid : null;
  } else {
    next = buyCosmetic(stats, item.id, deal.price);
  }
  if (!next) return null;
  return { ...next, cosmetics: { ...next.cosmetics, deals: { date: day, bought: [...boughtToday(stats, day), key] } } };
}
