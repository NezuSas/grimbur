import { LocalStats } from './runStats';

export type UnlockRule =
  | { kind: 'free' }
  | { kind: 'floor'; floor: number }
  | { kind: 'victory' }
  | { kind: 'daily'; count: number }
  | { kind: 'embers'; amount: number };

/** Unlock rule per hero, same order as `HEROES` / `data/characters`. */
export const HERO_UNLOCKS: readonly UnlockRule[] = [
  { kind: 'free' },
  { kind: 'floor', floor: 4 },
  { kind: 'floor', floor: 7 },
  { kind: 'victory' },
  { kind: 'daily', count: 5 },
  { kind: 'embers', amount: 500 },
];

export function isRuleMet(rule: UnlockRule, stats: LocalStats): boolean {
  switch (rule.kind) {
    case 'free':
      return true;
    case 'floor':
      return stats.bestLevel >= rule.floor;
    case 'victory':
      return stats.victories >= 1;
    case 'daily':
      return stats.dailyRuns >= rule.count;
    case 'embers':
      return stats.lifetimeEmbers >= rule.amount;
  }
}

export function isHeroUnlocked(heroIndex: number, stats: LocalStats): boolean {
  const rule = HERO_UNLOCKS[heroIndex];
  return rule ? isRuleMet(rule, stats) : false;
}

/** Heroes that became available between two snapshots of the stats. */
export function newlyUnlockedHeroes(before: LocalStats, after: LocalStats): number[] {
  return HERO_UNLOCKS.map((_, i) => i).filter(i => !isHeroUnlocked(i, before) && isHeroUnlocked(i, after));
}
