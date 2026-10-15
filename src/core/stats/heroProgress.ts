import { LocalStats } from './runStats';
import { HERO_UNLOCKS, isHeroUnlocked } from './heroUnlocks';

export interface HeroLockProgress {
  /** What opens the hero: reaching a floor, winning an expedition, playing dailies or earning embers. */
  kind: 'floor' | 'victory' | 'daily' | 'embers';
  have: number;
  need: number;
}

/** How close the player is to unlocking a hero, or null when it is already open (or has no rule). */
export function heroLockProgress(heroIndex: number, stats: LocalStats): HeroLockProgress | null {
  const rule = HERO_UNLOCKS[heroIndex];
  if (!rule || rule.kind === 'free' || isHeroUnlocked(heroIndex, stats)) return null;
  if (rule.kind === 'floor') return { kind: 'floor', have: Math.min(stats.bestLevel, rule.floor), need: rule.floor };
  if (rule.kind === 'daily') return { kind: 'daily', have: Math.min(stats.dailyRuns, rule.count), need: rule.count };
  if (rule.kind === 'embers') return { kind: 'embers', have: Math.min(stats.lifetimeEmbers, rule.amount), need: rule.amount };
  return { kind: 'victory', have: Math.min(stats.victories, 1), need: 1 };
}

/** The hero the screen should open on: the last one chosen if it is still available, else the first. */
export function startingHero(lastHero: number, stats: LocalStats, heroCount: number): number {
  const valid = Number.isInteger(lastHero) && lastHero >= 0 && lastHero < heroCount;
  return valid && isHeroUnlocked(lastHero, stats) ? lastHero : 0;
}

/** Index of the hero `step` places away, wrapping around the roster. */
export const cycleHero = (current: number, step: number, heroCount: number): number =>
  (((current + step) % heroCount) + heroCount) % heroCount;
