import type { AchievementId } from '../stats/achievements';
import type { LocalStats } from '../stats/runStats';
import { SKINS_BY_HERO } from '../skins/skins';
import { ownedSkins } from '../skins/ownership';

/**
 * Cosmetics beyond outfits. All of them are looks only: an arrow trail, a frame and a title shown to other players
 * (rankings, duels) and a board theme. None of them changes the game, so none of them can buy ranking power.
 */
export type CosmeticKind = 'trail' | 'frame' | 'title' | 'board';
export const COSMETIC_KINDS: readonly CosmeticKind[] = ['trail', 'frame', 'title', 'board'];

export type CosmeticId =
  | 'trail_fire' | 'trail_frost' | 'trail_storm' | 'trail_shadow' | 'trail_stars'
  | 'frame_bronze' | 'frame_silver' | 'frame_gold' | 'frame_frost' | 'frame_ember' | 'frame_abyss' | 'frame_crown' | 'frame_wardrobe'
  | 'title_explorer' | 'title_gemhunter' | 'title_tactician' | 'title_slayer' | 'title_bane' | 'title_abyss' | 'title_smith'
  | 'title_endless' | 'title_devoted' | 'title_wardrobe'
  | 'board_cave' | 'board_crystal' | 'board_magma' | 'board_lair';

export type CosmeticTier = 'rare' | 'epic' | 'legendary';

/** A free way to earn it: an achievement, or every outfit of any one hero (a full wardrobe). */
export type CosmeticUnlock = { kind: 'achievement'; id: AchievementId } | { kind: 'wardrobe' };

export interface CosmeticInfo {
  id: CosmeticId;
  kind: CosmeticKind;
  tier: CosmeticTier;
  /** Price in embers; 0 = never sold, only earned. */
  price: number;
  unlock?: CosmeticUnlock;
}

const item = (id: CosmeticId, kind: CosmeticKind, tier: CosmeticTier, price: number, unlock?: CosmeticUnlock): CosmeticInfo =>
  ({ id, kind, tier, price, ...(unlock ? { unlock } : {}) });
const ach = (id: AchievementId): CosmeticUnlock => ({ kind: 'achievement', id });

export const COSMETICS: readonly CosmeticInfo[] = [
  item('trail_fire', 'trail', 'rare', 400),
  item('trail_frost', 'trail', 'rare', 400),
  item('trail_storm', 'trail', 'epic', 650),
  item('trail_shadow', 'trail', 'epic', 800, ach('veteran_slayer')),
  item('trail_stars', 'trail', 'legendary', 1200),

  item('frame_bronze', 'frame', 'rare', 250),
  item('frame_silver', 'frame', 'rare', 500),
  item('frame_gold', 'frame', 'epic', 1000),
  item('frame_frost', 'frame', 'epic', 700),
  item('frame_ember', 'frame', 'epic', 0, ach('ember_baron')),
  item('frame_abyss', 'frame', 'legendary', 0, ach('abyssal')),
  item('frame_crown', 'frame', 'legendary', 0, ach('grimbur_bane')),
  item('frame_wardrobe', 'frame', 'legendary', 0, { kind: 'wardrobe' }),

  item('title_explorer', 'title', 'rare', 300),
  item('title_gemhunter', 'title', 'rare', 450),
  item('title_tactician', 'title', 'epic', 700),
  item('title_slayer', 'title', 'epic', 0, ach('grimbur_slayer')),
  item('title_bane', 'title', 'legendary', 0, ach('grimbur_bane')),
  item('title_abyss', 'title', 'legendary', 0, ach('abyssal')),
  item('title_smith', 'title', 'legendary', 0, ach('master_smith')),
  item('title_endless', 'title', 'epic', 0, ach('deeper_still')),
  item('title_devoted', 'title', 'epic', 0, ach('fortnight_streak')),
  item('title_wardrobe', 'title', 'legendary', 0, { kind: 'wardrobe' }),

  item('board_cave', 'board', 'rare', 350),
  item('board_crystal', 'board', 'rare', 350),
  item('board_magma', 'board', 'rare', 350),
  item('board_lair', 'board', 'epic', 600),
];

const BY_ID = new Map(COSMETICS.map(c => [c.id, c]));
export const cosmeticInfo = (id: CosmeticId): CosmeticInfo => BY_ID.get(id)!;
export const isCosmeticId = (v: unknown): v is CosmeticId => typeof v === 'string' && BY_ID.has(v as CosmeticId);
export const cosmeticsOf = (kind: CosmeticKind): CosmeticInfo[] => COSMETICS.filter(c => c.kind === kind);

/** A hero whose every offered outfit is owned. */
export const hasFullWardrobe = (stats: LocalStats): boolean =>
  SKINS_BY_HERO.some((list, hero) => list.length > 1 && ownedSkins(stats, hero).length === list.length);

const goalMet = (stats: LocalStats, unlock?: CosmeticUnlock): boolean =>
  !!unlock && (unlock.kind === 'wardrobe' ? hasFullWardrobe(stats) : !!stats.achievements[unlock.id]);

/** Bought, or earned (its goal is met: earned items never need claiming). */
export const ownsCosmetic = (stats: LocalStats, id: CosmeticId): boolean =>
  stats.cosmetics.owned.includes(id) || goalMet(stats, cosmeticInfo(id).unlock);

export const equippedCosmetic = (stats: LocalStats, kind: CosmeticKind): CosmeticId | null => {
  const id = stats.cosmetics.equipped[kind];
  return id && cosmeticInfo(id).kind === kind && ownsCosmetic(stats, id) ? id : null;
};

/** Spends embers for a cosmetic (at `price` when given: a daily-shop deal); null when not for sale, owned or too dear. */
export function buyCosmetic(stats: LocalStats, id: CosmeticId, price = cosmeticInfo(id).price): LocalStats | null {
  const info = cosmeticInfo(id);
  if (info.price <= 0 || ownsCosmetic(stats, id) || price < 0 || stats.embers < price) return null;
  return { ...stats, embers: stats.embers - price, cosmetics: { ...stats.cosmetics, owned: [...stats.cosmetics.owned, id] } };
}

/** Wears an owned cosmetic in its slot, or takes the slot off with `null`. Null when the item is not owned. */
export function equipCosmetic(stats: LocalStats, kind: CosmeticKind, id: CosmeticId | null): LocalStats | null {
  if (id !== null && (cosmeticInfo(id).kind !== kind || !ownsCosmetic(stats, id))) return null;
  const equipped = { ...stats.cosmetics.equipped };
  if (id === null) delete equipped[kind];
  else equipped[kind] = id;
  return { ...stats, cosmetics: { ...stats.cosmetics, equipped } };
}

/** Defensive parse of the persisted cosmetics (unknown ids, wrong slots and older saves are dropped). */
export function parseCosmetics(value: unknown): LocalStats['cosmetics'] {
  const out: LocalStats['cosmetics'] = { owned: [], equipped: {}, deals: { date: null, bought: [] } };
  if (!value || typeof value !== 'object') return out;
  const { owned, equipped, deals } = value as Record<string, unknown>;
  if (deals && typeof deals === 'object') {
    const { date, bought } = deals as Record<string, unknown>;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Array.isArray(bought)) {
      out.deals = { date, bought: bought.filter((k): k is string => typeof k === 'string' && k.length < 40).slice(0, 10) };
    }
  }
  if (Array.isArray(owned)) out.owned = [...new Set(owned.filter(isCosmeticId))].filter(id => cosmeticInfo(id).price > 0);
  if (equipped && typeof equipped === 'object' && !Array.isArray(equipped)) {
    for (const kind of COSMETIC_KINDS) {
      const id = (equipped as Record<string, unknown>)[kind];
      if (isCosmeticId(id) && cosmeticInfo(id).kind === kind) out.equipped[kind] = id;
    }
  }
  return out;
}
