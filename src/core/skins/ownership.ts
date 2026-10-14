import type { LocalStats } from '../stats/runStats';
import { SKINS, SKINS_BY_HERO, SkinId, isOffered, skinKey } from './skins';

export interface SkinStatus {
  owned: boolean;
  equipped: boolean;
  canBuy: boolean;
  price: number;
  /** The free play goal is already met (it is claimed after the next finished run). */
  unlockedByPlay: boolean;
  progress?: { have: number; need: number; kind: 'wins' | 'depthWin' };
}

const hasOwned = (stats: LocalStats, hero: number, skin: SkinId) =>
  skin === 'classic' ? isOffered(hero, skin) : stats.skins.owned.includes(skinKey(hero, skin));

/** Classic plus the bought/unlocked skins, in catalog order. */
export function ownedSkins(stats: LocalStats, hero: number): SkinId[] {
  return (SKINS_BY_HERO[hero] ?? []).filter(id => hasOwned(stats, hero, id));
}

export function equippedSkin(stats: LocalStats, hero: number): SkinId {
  const id = stats.skins.equipped[String(hero)];
  return id && ownedSkins(stats, hero).includes(id) ? id : 'classic';
}

function goal(stats: LocalStats, hero: number, skin: SkinId): SkinStatus['progress'] {
  const unlock = SKINS[skin].unlock;
  if (!unlock) return undefined;
  return unlock.kind === 'wins'
    ? { have: stats.heroWins[hero] ?? 0, need: unlock.count, kind: unlock.kind }
    : { have: stats.heroBestDepth[hero] ?? 0, need: unlock.depth, kind: unlock.kind };
}

export function skinStatus(stats: LocalStats, hero: number, skin: SkinId): SkinStatus {
  const info = SKINS[skin];
  const owned = hasOwned(stats, hero, skin);
  const g = goal(stats, hero, skin);
  const offered = isOffered(hero, skin);
  return {
    owned,
    equipped: owned && equippedSkin(stats, hero) === skin,
    canBuy: offered && !owned && info.price > 0 && stats.embers >= info.price,
    price: info.price,
    unlockedByPlay: offered && !!g && g.have >= g.need,
    ...(g && offered ? { progress: g } : {}),
  };
}

/** Spends embers and adds the skin; null when not offered to the hero, already owned or too expensive. */
export function buySkin(stats: LocalStats, hero: number, skin: SkinId): LocalStats | null {
  if (!isOffered(hero, skin) || hasOwned(stats, hero, skin)) return null;
  const price = SKINS[skin].price;
  if (stats.embers < price) return null;
  return { ...stats, embers: stats.embers - price, skins: { ...stats.skins, owned: [...stats.skins.owned, skinKey(hero, skin)] } };
}

/** Adds every skin whose free play goal is met (to be called after each finished run). */
export function claimUnlockedSkins(stats: LocalStats): { stats: LocalStats; claimed: { hero: number; skin: SkinId }[] } {
  const claimed: { hero: number; skin: SkinId }[] = [];
  const owned = [...stats.skins.owned];
  SKINS_BY_HERO.forEach((list, hero) => {
    for (const skin of list) {
      if (hasOwned(stats, hero, skin) || !skinStatus(stats, hero, skin).unlockedByPlay) continue;
      owned.push(skinKey(hero, skin));
      claimed.push({ hero, skin });
    }
  });
  return claimed.length ? { stats: { ...stats, skins: { ...stats.skins, owned } }, claimed } : { stats, claimed };
}

/** Wears an owned skin; null when it is not owned. */
export function equipSkin(stats: LocalStats, hero: number, skin: SkinId): LocalStats | null {
  if (!ownedSkins(stats, hero).includes(skin)) return null;
  return { ...stats, skins: { ...stats.skins, equipped: { ...stats.skins.equipped, [String(hero)]: skin } } };
}
