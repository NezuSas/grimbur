import type { LocalStats, RunResult } from './runStats';
import type { HeroPerks } from '../engine/heroes';
import type { RelicId } from '../engine/relics';

/**
 * The Forge: permanent upgrades bought with "embers", which every run earns (win or lose).
 * Pure data + functions so the economy is easy to tune and test.
 */
export type UpgradeCategory = 'power' | 'economy' | 'relics';

export type UpgradeId =
  | 'whetstone' | 'ward' | 'eagle_eye' | 'scribe' | 'explorer'
  | 'purse' | 'fortune'
  | 'feather' | 'start_lantern' | 'start_trap_sense' | 'start_iron_boots' | 'start_frost' | 'start_lucky_coin'
  | 'start_long_bow' | 'start_hunter' | 'start_quiver' | 'start_greed' | 'start_bulwark';

export interface UpgradeInfo {
  id: UpgradeId;
  icon: string;
  category: UpgradeCategory;
  /** Price of each level; its length is the maximum level. */
  costs: readonly number[];
  /** Values interpolated into the translated description. */
  params: Record<string, number>;
  /** A start-of-run relic: its picture is shown instead of the emoji. */
  relic?: RelicId;
}

export const UPGRADES: readonly UpgradeInfo[] = [
  // Power
  { id: 'whetstone', icon: '🏹', category: 'power', costs: [60, 160], params: { arrows: 1 } },
  { id: 'ward', icon: '🛡️', category: 'power', costs: [80], params: {} },
  { id: 'explorer', icon: '🧭', category: 'power', costs: [70, 200], params: { percent: 25 } },
  { id: 'scribe', icon: '📜', category: 'power', costs: [250], params: { extra: 1 } },
  { id: 'eagle_eye', icon: '🦅', category: 'power', costs: [500], params: { tiles: 1 } },
  // Economy
  { id: 'purse', icon: '👛', category: 'economy', costs: [40, 90, 160], params: { percent: 10 } },
  { id: 'fortune', icon: '🍀', category: 'economy', costs: [120, 240], params: { percent: 15 } },
  // Relics you begin every expedition with
  { id: 'start_lantern', icon: '🏮', category: 'relics', costs: [150], params: {}, relic: 'lantern' },
  { id: 'start_trap_sense', icon: '🪤', category: 'relics', costs: [180], params: {}, relic: 'trap_sense' },
  { id: 'start_iron_boots', icon: '👢', category: 'relics', costs: [200], params: {}, relic: 'iron_boots' },
  { id: 'start_frost', icon: '❄️', category: 'relics', costs: [220], params: {}, relic: 'frost' },
  { id: 'start_lucky_coin', icon: '🪙', category: 'relics', costs: [260], params: {}, relic: 'lucky_coin' },
  { id: 'feather', icon: '🪶', category: 'relics', costs: [300], params: {}, relic: 'phoenix' },
  { id: 'start_long_bow', icon: '🌠', category: 'relics', costs: [320], params: {}, relic: 'long_bow' },
  { id: 'start_hunter', icon: '🎯', category: 'relics', costs: [350], params: {}, relic: 'hunter' },
  { id: 'start_greed', icon: '💰', category: 'relics', costs: [400], params: {}, relic: 'greed' },
  { id: 'start_quiver', icon: '🏹', category: 'relics', costs: [450], params: {}, relic: 'quiver' },
  { id: 'start_bulwark', icon: '🛡️', category: 'relics', costs: [600], params: {}, relic: 'bulwark' },
];

export const UPGRADE_CATEGORIES: readonly UpgradeCategory[] = ['power', 'economy', 'relics'];

/** Extra embers per level of Fortune (+15% each). */
const FORTUNE_BONUS_PER_LEVEL = 0.15;

export const maxLevel = (id: UpgradeId): number => UPGRADES.find(u => u.id === id)?.costs.length ?? 0;

/** Embers per floor reached (tuning knob). */
export const EMBERS_PER_FLOOR = 6;
/** One-time embers the first time the player reaches each new deepest floor (tuning knob). */
export const MILESTONE_EMBERS = 10;
/** Floors above this pay no milestone (the expedition has 10). */
export const MILESTONE_MAX_FLOOR = 10;
/** Embers added to a victory: base plus per depth (ascension). */
export const VICTORY_EMBERS = 50;
export const VICTORY_EMBERS_PER_DEPTH = 15;

/** One-time milestone embers for reaching `level` when the deepest floor so far was `previousBest` (floors 1..10 only). */
export function milestoneEmbers(previousBest: number, level: number): number {
  const from = Math.max(0, Math.trunc(previousBest) || 0);
  const to = Math.min(MILESTONE_MAX_FLOOR, Math.trunc(level) || 0);
  return to > from ? (to - from) * MILESTONE_EMBERS : 0;
}

/** Embers paid once per local day, on the first finished run: 15 plus 5 per day of streak, up to 50. */
export const dailyBonus = (streak: number): number => Math.min(50, 15 + 5 * Math.max(0, Math.trunc(streak) || 0));

/** Embers earned by a finished run. A run that never started earns nothing. */
export function embersFor(run: RunResult, progressed = true, fortuneLevel = 0): number {
  if (!progressed) return 0;
  const score = Number.isFinite(run.score) ? run.score : 0;
  const level = Number.isFinite(run.level) ? run.level : 1;
  const base = Math.floor(Math.max(0, score) / 250) + Math.max(1, level) * EMBERS_PER_FLOOR;
  const victory = run.victory ? VICTORY_EMBERS + VICTORY_EMBERS_PER_DEPTH * (run.ascension ?? 0) : 0;
  const fortune = 1 + FORTUNE_BONUS_PER_LEVEL * Math.min(Math.max(0, Math.trunc(fortuneLevel) || 0), maxLevel('fortune'));
  return Math.round((base + victory) * fortune);
}

export const levelOf = (stats: LocalStats, id: UpgradeId): number => stats.forge[id] ?? 0;

/** Price of the next level, or null when the upgrade is maxed. */
export function nextCost(stats: LocalStats, id: UpgradeId): number | null {
  const info = UPGRADES.find(u => u.id === id);
  if (!info) return null;
  const level = levelOf(stats, id);
  return level >= info.costs.length ? null : info.costs[level];
}

export function canAfford(stats: LocalStats, id: UpgradeId): boolean {
  const cost = nextCost(stats, id);
  return cost !== null && stats.embers >= cost;
}

/** Buys the next level; returns the new stats, or null when it is maxed or too expensive. */
export function purchase(stats: LocalStats, id: UpgradeId): LocalStats | null {
  const cost = nextCost(stats, id);
  if (cost === null || stats.embers < cost) return null;
  return { ...stats, embers: stats.embers - cost, forge: { ...stats.forge, [id]: levelOf(stats, id) + 1 } };
}

/** What the purchased upgrades do to a run. */
export interface MetaEffects {
  /** Extra arrows on every floor. */
  arrows: number;
  /** Extra gem value as a fraction (0.1 = +10%). */
  coinBonus: number;
  /** Extra relics offered in every draft. */
  draftBonus: number;
  /** Start the run with a shield. */
  shield: boolean;
  /** Relics the run begins with. */
  startRelics: RelicId[];
  /** Extra tiles an arrow reaches. */
  reach: number;
  /** Extra exploration points as a fraction (0.25 = +25%). */
  exploreBonus: number;
}

export const NO_META: MetaEffects = {
  arrows: 0,
  coinBonus: 0,
  draftBonus: 0,
  shield: false,
  startRelics: [],
  reach: 0,
  exploreBonus: 0,
};

/** Hero perks plus the Forge's permanent bonuses. */
export function applyMeta(perks: HeroPerks, meta: MetaEffects): HeroPerks {
  return {
    ...perks,
    bonusArrows: perks.bonusArrows + meta.arrows,
    coinMultiplier: perks.coinMultiplier * (1 + meta.coinBonus),
    arrowReach: perks.arrowReach + meta.reach,
    newTileMultiplier: perks.newTileMultiplier * (1 + meta.exploreBonus),
  };
}

export function metaEffects(forge: Record<string, number>): MetaEffects {
  const lvl = (id: UpgradeId) => Math.min(forge[id] ?? 0, maxLevel(id));
  return {
    arrows: lvl('whetstone') * 1,
    coinBonus: lvl('purse') * 0.1,
    draftBonus: lvl('scribe') * 1,
    shield: lvl('ward') > 0,
    startRelics: UPGRADES.filter(u => u.relic && lvl(u.id) > 0).map(u => u.relic as RelicId),
    reach: lvl('eagle_eye'),
    exploreBonus: lvl('explorer') * 0.25,
  };
}

const CATEGORY_RANK: Record<UpgradeCategory, number> = { power: 0, economy: 1, relics: 2 };

/**
 * Upgrades in the order the shop shows them: what the player can buy now first (lasting boosts before starting relics), then the
 * cheapest goals, maxed ones last.
 */
export function shopOrder(stats: LocalStats): UpgradeInfo[] {
  const group = (u: UpgradeInfo) => (nextCost(stats, u.id) === null ? 2 : canAfford(stats, u.id) ? 0 : 1);
  return [...UPGRADES].sort(
    (a, b) =>
      group(a) - group(b) ||
      // Among things you can buy, lasting boosts come first; among goals, simply the closest one.
      (group(a) === 0 ? CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category] : 0) ||
      (nextCost(stats, a.id) ?? 0) - (nextCost(stats, b.id) ?? 0),
  );
}

/** The upgrade to put in front of the player: the best one they can afford, else the cheapest goal; null when all is bought. */
export function recommendedUpgrade(stats: LocalStats): UpgradeInfo | null {
  const first = shopOrder(stats)[0];
  return first && nextCost(stats, first.id) !== null ? first : null;
}

/** How many upgrades can be bought right now. */
export const affordableCount = (stats: LocalStats): number => UPGRADES.filter(u => canAfford(stats, u.id)).length;
