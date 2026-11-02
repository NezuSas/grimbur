import type { AchievementId } from '../stats/achievements';
import { yuleGoalMet, type YuleGoal } from '../events/yule';
import { completedMonth } from '../stats/season';
import type { LocalStats } from '../stats/runStats';
import { SKINS_BY_HERO } from '../skins/skins';
import { ownedSkins } from '../skins/ownership';
import { MAX_MASTERY, masteryOf } from '../stats/mastery';
import { allQuestsDone } from '../stats/heroQuests';

/**
 * Cosmetics beyond outfits. All of them are looks only: an arrow trail, a frame and a title shown to other players
 * (rankings, duels), a board theme, the flag that marks a tile, the attack button and the celebration that plays on a
 * victory. None of them changes the game, so none of them can buy ranking power.
 */
export type CosmeticKind = 'trail' | 'frame' | 'title' | 'board' | 'flag' | 'attack' | 'celebration' | 'pet';
export const COSMETIC_KINDS: readonly CosmeticKind[] = ['trail', 'frame', 'title', 'board', 'flag', 'attack', 'celebration', 'pet'];

export type CosmeticId =
  | 'trail_fire' | 'trail_frost' | 'trail_storm' | 'trail_shadow' | 'trail_stars' | 'trail_venom' | 'trail_void' | 'trail_royal'
  | 'frame_jade' | 'frame_bone' | 'frame_storm' | 'frame_royal' | 'frame_hoard'
  | 'frame_questvael' | 'frame_questsera' | 'frame_questborin' | 'frame_questauric' | 'frame_questmira' | 'frame_questbram'
  | 'title_questvael' | 'title_questsera' | 'title_questborin' | 'title_questauric' | 'title_questmira' | 'title_questbram'
  | 'flag_skull' | 'flag_crystal' | 'flag_ember' | 'flag_royal' | 'flag_frost' | 'flag_gold'
  | 'attack_frost' | 'attack_venom' | 'attack_royal' | 'attack_shadow'
  | 'frame_bronze' | 'frame_silver' | 'frame_gold' | 'frame_frost' | 'frame_ember' | 'frame_abyss' | 'frame_crown' | 'frame_wardrobe'
  | 'title_explorer' | 'title_gemhunter' | 'title_tactician' | 'title_slayer' | 'title_bane' | 'title_abyss' | 'title_smith'
  | 'title_endless' | 'title_devoted' | 'title_wardrobe'
  | 'title_wanderer' | 'title_hawkeye' | 'title_sage' | 'title_shadow' | 'title_mythic'
  | 'title_goldtouch' | 'title_reliclord' | 'title_tireless' | 'title_lightning' | 'title_champion'
  | 'title_collector' | 'title_curator' | 'title_hoarder' | 'title_season'
  | 'title_seasonjan' | 'title_seasonfeb' | 'title_seasonmar' | 'title_seasonapr' | 'title_seasonmay' | 'title_seasonjun' | 'title_seasonjul' | 'title_seasonaug' | 'title_seasonsep' | 'title_seasonoct' | 'title_seasonnov' | 'title_seasondec'
  | 'title_mastervael' | 'title_mastersera' | 'title_masterborin' | 'title_masterauric' | 'title_mastermira' | 'title_masterbram'
  | 'board_cave' | 'board_crystal' | 'board_magma' | 'board_lair' | 'board_frost' | 'board_moss' | 'board_vault'
  | 'celeb_embers' | 'celeb_gems' | 'celeb_stars' | 'celeb_arrows' | 'celeb_relics' | 'celeb_skulls' | 'celeb_hoard'
  | 'pet_firefly' | 'pet_bat' | 'pet_golem' | 'pet_fox' | 'pet_dragon' | 'pet_owl'
  | 'frame_yule' | 'title_yule' | 'pet_reindeer';

export type CosmeticTier = 'rare' | 'epic' | 'legendary';

/** A free way to earn it: an achievement, every outfit of any one hero (a full wardrobe) or a share of the whole collection. */
export type CosmeticUnlock =
  | { kind: 'achievement'; id: AchievementId }
  | { kind: 'wardrobe' }
  | { kind: 'collection'; pct: CollectionMilestone }
  | { kind: 'mastery'; hero: number }
  /** Finish the whole track of any season. */
  | { kind: 'season' }
  /** Finish the season of that month (1-12): each month has a title of its own. */
  | { kind: 'seasonMonth'; month: number }
  /** Complete the three challenges of that hero (see stats/heroQuests.ts). */
  | { kind: 'quests'; hero: number }
  /** Christmas in the cave: met in some December (see core/events/yule.ts). */
  | { kind: 'event'; event: 'yule'; goal: YuleGoal };

/** The shares of the collection that each give a reward of their own. */
export const COLLECTION_MILESTONES = [25, 50, 75, 100] as const;
export type CollectionMilestone = (typeof COLLECTION_MILESTONES)[number];

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
const share = (pct: CollectionMilestone): CosmeticUnlock => ({ kind: 'collection', pct });
const mastered = (hero: number): CosmeticUnlock => ({ kind: 'mastery', hero });

export const COSMETICS: readonly CosmeticInfo[] = [
  item('trail_fire', 'trail', 'rare', 400),
  item('trail_frost', 'trail', 'rare', 400),
  item('trail_storm', 'trail', 'epic', 650),
  item('trail_shadow', 'trail', 'epic', 800, ach('veteran_slayer')),
  item('trail_stars', 'trail', 'legendary', 1200),
  item('trail_venom', 'trail', 'rare', 450),
  item('trail_void', 'trail', 'epic', 850),
  item('trail_royal', 'trail', 'legendary', 1300),

  item('frame_bronze', 'frame', 'rare', 250),
  item('frame_silver', 'frame', 'rare', 500),
  item('frame_gold', 'frame', 'epic', 1000),
  item('frame_frost', 'frame', 'epic', 700),
  item('frame_ember', 'frame', 'epic', 0, ach('ember_baron')),
  item('frame_abyss', 'frame', 'legendary', 0, ach('abyssal')),
  item('frame_crown', 'frame', 'legendary', 0, ach('grimbur_bane')),
  item('frame_wardrobe', 'frame', 'legendary', 0, { kind: 'wardrobe' }),
  item('frame_jade', 'frame', 'rare', 450),
  item('frame_storm', 'frame', 'epic', 750),
  item('frame_royal', 'frame', 'legendary', 1400),
  item('frame_bone', 'frame', 'epic', 0, ach('bottomless')),
  item('frame_hoard', 'frame', 'legendary', 0, share(100)),

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
  item('title_wanderer', 'title', 'rare', 300),
  item('title_hawkeye', 'title', 'rare', 450),
  item('title_sage', 'title', 'epic', 800),
  item('title_shadow', 'title', 'epic', 900),
  item('title_mythic', 'title', 'legendary', 1600),
  item('title_goldtouch', 'title', 'epic', 0, ach('legendary_haul')),
  item('title_reliclord', 'title', 'epic', 0, ach('relic_master')),
  item('title_lightning', 'title', 'epic', 0, ach('lightning')),
  item('title_tireless', 'title', 'legendary', 0, ach('five_hundred_runs')),
  item('title_champion', 'title', 'legendary', 0, ach('all_hero_wins')),
  item('title_collector', 'title', 'rare', 0, share(25)),
  item('title_curator', 'title', 'epic', 0, share(75)),
  item('title_hoarder', 'title', 'legendary', 0, share(100)),
  item('title_season', 'title', 'legendary', 0, { kind: 'season' }),
  item('title_seasonjan', 'title', 'epic', 0, { kind: 'seasonMonth', month: 1 }),
  item('title_seasonfeb', 'title', 'epic', 0, { kind: 'seasonMonth', month: 2 }),
  item('title_seasonmar', 'title', 'epic', 0, { kind: 'seasonMonth', month: 3 }),
  item('title_seasonapr', 'title', 'epic', 0, { kind: 'seasonMonth', month: 4 }),
  item('title_seasonmay', 'title', 'epic', 0, { kind: 'seasonMonth', month: 5 }),
  item('title_seasonjun', 'title', 'epic', 0, { kind: 'seasonMonth', month: 6 }),
  item('title_seasonjul', 'title', 'epic', 0, { kind: 'seasonMonth', month: 7 }),
  item('title_seasonaug', 'title', 'epic', 0, { kind: 'seasonMonth', month: 8 }),
  item('title_seasonsep', 'title', 'epic', 0, { kind: 'seasonMonth', month: 9 }),
  item('title_seasonoct', 'title', 'epic', 0, { kind: 'seasonMonth', month: 10 }),
  item('title_seasonnov', 'title', 'epic', 0, { kind: 'seasonMonth', month: 11 }),
  item('title_seasondec', 'title', 'epic', 0, { kind: 'seasonMonth', month: 12 }),
  item('title_mastervael', 'title', 'legendary', 0, mastered(0)),
  item('title_mastersera', 'title', 'legendary', 0, mastered(1)),
  item('title_masterborin', 'title', 'legendary', 0, mastered(2)),
  item('title_masterauric', 'title', 'legendary', 0, mastered(3)),
  item('title_mastermira', 'title', 'legendary', 0, mastered(4)),
  item('title_masterbram', 'title', 'legendary', 0, mastered(5)),
  item('title_questvael', 'title', 'epic', 0, { kind: 'quests', hero: 0 }),
  item('frame_questvael', 'frame', 'epic', 0, { kind: 'quests', hero: 0 }),
  item('title_questsera', 'title', 'epic', 0, { kind: 'quests', hero: 1 }),
  item('frame_questsera', 'frame', 'epic', 0, { kind: 'quests', hero: 1 }),
  item('title_questborin', 'title', 'epic', 0, { kind: 'quests', hero: 2 }),
  item('frame_questborin', 'frame', 'epic', 0, { kind: 'quests', hero: 2 }),
  item('title_questauric', 'title', 'epic', 0, { kind: 'quests', hero: 3 }),
  item('frame_questauric', 'frame', 'epic', 0, { kind: 'quests', hero: 3 }),
  item('title_questmira', 'title', 'epic', 0, { kind: 'quests', hero: 4 }),
  item('frame_questmira', 'frame', 'epic', 0, { kind: 'quests', hero: 4 }),
  item('title_questbram', 'title', 'epic', 0, { kind: 'quests', hero: 5 }),
  item('frame_questbram', 'frame', 'epic', 0, { kind: 'quests', hero: 5 }),

  item('board_cave', 'board', 'rare', 350),
  item('board_crystal', 'board', 'rare', 350),
  item('board_magma', 'board', 'rare', 350),
  item('board_lair', 'board', 'epic', 600),
  item('board_moss', 'board', 'rare', 450),
  item('board_frost', 'board', 'epic', 650),
  item('board_vault', 'board', 'legendary', 1100),

  item('flag_crystal', 'flag', 'rare', 300),
  item('flag_ember', 'flag', 'rare', 300),
  item('flag_frost', 'flag', 'rare', 350),
  item('flag_royal', 'flag', 'epic', 700),
  item('flag_skull', 'flag', 'epic', 0, ach('grimbur_slayer')),
  item('flag_gold', 'flag', 'legendary', 0, share(75)),

  item('attack_frost', 'attack', 'rare', 400),
  item('attack_venom', 'attack', 'rare', 400),
  item('attack_royal', 'attack', 'epic', 800),
  item('attack_shadow', 'attack', 'epic', 900),

  item('celeb_embers', 'celebration', 'rare', 400),
  item('celeb_gems', 'celebration', 'rare', 450),
  item('celeb_stars', 'celebration', 'epic', 700),
  item('celeb_arrows', 'celebration', 'epic', 750),
  item('celeb_relics', 'celebration', 'legendary', 1300),
  item('celeb_skulls', 'celebration', 'epic', 0, ach('second_lair')),
  item('celeb_hoard', 'celebration', 'legendary', 0, share(50)),

  // Companions: a little creature floating by the hero on the board (a look only: it never reacts to what the fog hides).
  item('pet_firefly', 'pet', 'rare', 600),
  item('pet_bat', 'pet', 'rare', 700),
  item('pet_golem', 'pet', 'epic', 1000),
  item('pet_fox', 'pet', 'epic', 1100),
  item('pet_owl', 'pet', 'epic', 0, ach('bestiary_all')),
  item('pet_dragon', 'pet', 'legendary', 0, ach('hunt_500')),
  // Christmas in the cave: only earned in December, kept forever.
  item('frame_yule', 'frame', 'epic', 0, { kind: 'event', event: 'yule', goal: 'floors' }),
  item('pet_reindeer', 'pet', 'epic', 0, { kind: 'event', event: 'yule', goal: 'puzzles' }),
  item('title_yule', 'title', 'legendary', 0, { kind: 'event', event: 'yule', goal: 'both' }),
];

const BY_ID = new Map(COSMETICS.map(c => [c.id, c]));
export const cosmeticInfo = (id: CosmeticId): CosmeticInfo => BY_ID.get(id)!;
export const isCosmeticId = (v: unknown): v is CosmeticId => typeof v === 'string' && BY_ID.has(v as CosmeticId);
export const cosmeticsOf = (kind: CosmeticKind): CosmeticInfo[] => COSMETICS.filter(c => c.kind === kind);

/** A hero whose every offered outfit is owned. */
export const hasFullWardrobe = (stats: LocalStats): boolean =>
  SKINS_BY_HERO.some((list, hero) => list.length > 1 && ownedSkins(stats, hero).length === list.length);

/** Rewarded for owning a share of the collection (they are not counted in it, so the share never chases itself). */
const isCollectionReward = (c: CosmeticInfo): boolean => c.unlock?.kind === 'collection';

/**
 * How much of the collection the player owns: every outfit beyond each hero's classic one, and every cosmetic that is
 * not itself a collection reward. `pct` is rounded down, so 100 means everything.
 */
export function collectionProgress(stats: LocalStats): { owned: number; total: number; pct: number } {
  let owned = 0;
  let total = 0;
  SKINS_BY_HERO.forEach((list, hero) => {
    total += Math.max(0, list.length - 1);
    owned += Math.max(0, ownedSkins(stats, hero).length - 1);
  });
  for (const c of COSMETICS) {
    if (isCollectionReward(c)) continue;
    // Event keepsakes can only be earned in their month: they never hold back a full collection.
    if (c.unlock?.kind === 'event') continue;
    total++;
    if (ownsCosmetic(stats, c.id)) owned++;
  }
  return { owned, total, pct: total > 0 ? Math.floor((owned * 100) / total) : 0 };
}

/** How many collection milestones the player has reached. */
export const collectionMilestonesReached = (stats: LocalStats): number => {
  const pct = collectionProgress(stats).pct;
  return COLLECTION_MILESTONES.filter(m => pct >= m).length;
};

/** The rewards a milestone of the collection gives. */
export const collectionRewards = (pct: CollectionMilestone): CosmeticInfo[] =>
  COSMETICS.filter(c => c.unlock?.kind === 'collection' && c.unlock.pct === pct);

const goalMet = (stats: LocalStats, unlock?: CosmeticUnlock): boolean => {
  if (!unlock) return false;
  if (unlock.kind === 'wardrobe') return hasFullWardrobe(stats);
  if (unlock.kind === 'collection') return collectionProgress(stats).pct >= unlock.pct;
  if (unlock.kind === 'mastery') return masteryOf(stats.heroXp?.[unlock.hero] ?? 0).level >= MAX_MASTERY;
  if (unlock.kind === 'season') return (stats.season?.completed ?? 0) > 0;
  if (unlock.kind === 'seasonMonth') return completedMonth(stats.season, unlock.month);
  if (unlock.kind === 'quests') return allQuestsDone(stats.heroQuests?.[unlock.hero]);
  if (unlock.kind === 'event') return yuleGoalMet(stats.events, unlock.goal);
  return !!stats.achievements[unlock.id];
};

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
