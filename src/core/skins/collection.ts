import type { LocalStats } from '../stats/runStats';
import { SKINS, SKINS_BY_HERO, SkinId } from './skins';
import { ownedSkins, skinStatus } from './ownership';

/** What the collection screen can show: everything, only what the player has, only what is missing, or only premium. */
export type CollectionFilter = 'all' | 'owned' | 'missing' | 'premium';
export const COLLECTION_FILTERS: readonly CollectionFilter[] = ['all', 'owned', 'missing', 'premium'];

/** Outfits owned (classic counts) and in total, over every hero. */
export function collectionCount(stats: LocalStats): { owned: number; total: number } {
  let owned = 0;
  let total = 0;
  SKINS_BY_HERO.forEach((skins, hero) => {
    total += skins.length;
    owned += ownedSkins(stats, hero).length;
  });
  return { owned, total };
}

/** The same for one hero. */
export function heroCollectionCount(stats: LocalStats, hero: number): { owned: number; total: number } {
  return { owned: ownedSkins(stats, hero).length, total: (SKINS_BY_HERO[hero] ?? []).length };
}

/** The outfits of a hero that the filter lets through, in catalog order. */
export function visibleSkins(stats: LocalStats, hero: number, filter: CollectionFilter): SkinId[] {
  const all = SKINS_BY_HERO[hero] ?? [];
  const owned = new Set(ownedSkins(stats, hero));
  switch (filter) {
    case 'owned':
      return all.filter(id => owned.has(id));
    case 'missing':
      return all.filter(id => !owned.has(id));
    case 'premium':
      return all.filter(id => SKINS[id].premium);
    default:
      return all.slice();
  }
}

/** Outfits the player does not own yet and can pay for right now. */
export function affordableOutfits(stats: LocalStats): { hero: number; skin: SkinId }[] {
  const found: { hero: number; skin: SkinId }[] = [];
  SKINS_BY_HERO.forEach((skins, hero) => {
    for (const skin of skins) if (skinStatus(stats, hero, skin).canBuy) found.push({ hero, skin });
  });
  return found;
}

/** A dot on the collection icon: something can be bought, or a play goal is met and waiting to be claimed. */
export function collectionBadge(stats: LocalStats): boolean {
  if (affordableOutfits(stats).length > 0) return true;
  return SKINS_BY_HERO.some((skins, hero) => skins.some(skin => { const s = skinStatus(stats, hero, skin); return !s.owned && s.unlockedByPlay; }));
}
