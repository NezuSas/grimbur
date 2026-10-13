import type { LocalStats, RunResult } from './runStats';
import type { HeroPerks } from '../engine/heroes';

/**
 * The Forge: permanent upgrades bought with "embers", which every run earns (win or lose).
 * Pure data + functions so the economy is easy to tune and test.
 */
export type UpgradeId = 'whetstone' | 'purse' | 'scribe' | 'ward';

export interface UpgradeInfo {
  id: UpgradeId;
  icon: string;
  /** Price of each level; its length is the maximum level. */
  costs: readonly number[];
  /** Values interpolated into the translated description. */
  params: Record<string, number>;
}

export const UPGRADES: readonly UpgradeInfo[] = [
  { id: 'whetstone', icon: '🏹', costs: [60, 160], params: { arrows: 1 } },
  { id: 'purse', icon: '👛', costs: [40, 90, 160], params: { percent: 10 } },
  { id: 'scribe', icon: '📜', costs: [250], params: { extra: 1 } },
  { id: 'ward', icon: '🛡️', costs: [80], params: {} },
];

export const maxLevel = (id: UpgradeId): number => UPGRADES.find(u => u.id === id)?.costs.length ?? 0;

/** Embers earned by a finished run. A run that never started earns nothing. */
export function embersFor(run: RunResult, progressed = true): number {
  if (!progressed) return 0;
  const base = Math.floor(Math.max(0, run.score) / 250) + Math.max(1, run.level) * 4;
  const victory = run.victory ? 50 + 15 * (run.ascension ?? 0) : 0;
  return base + victory;
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
}

export const NO_META: MetaEffects = { arrows: 0, coinBonus: 0, draftBonus: 0, shield: false };

/** Hero perks plus the Forge's permanent bonuses. */
export function applyMeta(perks: HeroPerks, meta: MetaEffects): HeroPerks {
  return {
    ...perks,
    bonusArrows: perks.bonusArrows + meta.arrows,
    coinMultiplier: perks.coinMultiplier * (1 + meta.coinBonus),
  };
}

export function metaEffects(forge: Record<string, number>): MetaEffects {
  const lvl = (id: UpgradeId) => Math.min(forge[id] ?? 0, maxLevel(id));
  return {
    arrows: lvl('whetstone') * 1,
    coinBonus: lvl('purse') * 0.1,
    draftBonus: lvl('scribe') * 1,
    shield: lvl('ward') > 0,
  };
}
