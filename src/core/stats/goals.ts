import type { LocalStats } from './runStats';
import { ACHIEVEMENTS, type AchievementId } from './achievements';
import { UPGRADES, canAfford, nextCost, recommendedUpgrade, type UpgradeId } from './forge';
import { HERO_UNLOCKS, isHeroUnlocked } from './heroUnlocks';

/** The things a player can reach for next: a Forge purchase, a hero to unlock, an achievement almost done. */
export type Goal =
  | { kind: 'forge'; id: UpgradeId; cost: number; remaining: number; progress: number; affordable: boolean }
  | { kind: 'hero'; hero: number; metric: 'floor' | 'victory' | 'daily' | 'embers'; current: number; target: number; remaining: number; progress: number }
  | { kind: 'achievement'; id: AchievementId; current: number; target: number; progress: number };

/** Floors in an expedition: the progress towards "slay the Wumpus" is measured against it. */
const EXPEDITION_FLOORS = 10;

/** The open achievements closest to done (partial progress only), best first. */
export function closestAchievements(stats: LocalStats, count = 3): { id: AchievementId; current: number; target: number; progress: number }[] {
  return ACHIEVEMENTS.filter(a => !(a.id in stats.achievements) && a.progress)
    .map(a => {
      const p = (a.progress as NonNullable<typeof a.progress>)(stats);
      return { id: a.id, current: p.current, target: p.target, progress: p.target > 0 ? p.current / p.target : 0 };
    })
    .filter(x => x.current > 0 && x.current < x.target)
    .sort((x, y) => y.progress - x.progress)
    .slice(0, count);
}

/** The Forge goal: the recommended upgrade with how many embers are missing. Null when everything is bought. */
export function forgeGoal(stats: LocalStats): Extract<Goal, { kind: 'forge' }> | null {
  const rec = recommendedUpgrade(stats);
  if (!rec) return null;
  const cost = nextCost(stats, rec.id) as number;
  const affordable = canAfford(stats, rec.id);
  return {
    kind: 'forge',
    id: rec.id,
    cost,
    affordable,
    remaining: Math.max(0, cost - stats.embers),
    progress: cost > 0 ? Math.min(1, stats.embers / cost) : 1,
  };
}

/** The locked hero that is closest to opening (null when all are open). */
export function heroGoal(stats: LocalStats): Extract<Goal, { kind: 'hero' }> | null {
  let best: Extract<Goal, { kind: 'hero' }> | null = null;
  HERO_UNLOCKS.forEach((rule, hero) => {
    if (rule.kind === 'free' || isHeroUnlocked(hero, stats)) return;
    const goal: Extract<Goal, { kind: 'hero' }> =
      rule.kind === 'floor'
        ? {
            kind: 'hero',
            hero,
            metric: 'floor',
            current: Math.min(stats.bestLevel, rule.floor),
            target: rule.floor,
            remaining: Math.max(0, rule.floor - stats.bestLevel),
            progress: Math.min(1, stats.bestLevel / rule.floor),
          }
        : rule.kind === 'daily'
        ? {
            kind: 'hero',
            hero,
            metric: 'daily',
            current: Math.min(stats.dailyRuns, rule.count),
            target: rule.count,
            remaining: Math.max(0, rule.count - stats.dailyRuns),
            progress: Math.min(1, stats.dailyRuns / rule.count),
          }
        : rule.kind === 'embers'
        ? {
            kind: 'hero',
            hero,
            metric: 'embers',
            current: Math.min(stats.lifetimeEmbers, rule.amount),
            target: rule.amount,
            remaining: Math.max(0, rule.amount - stats.lifetimeEmbers),
            progress: Math.min(1, stats.lifetimeEmbers / rule.amount),
          }
        : {
            kind: 'hero',
            hero,
            metric: 'victory',
            current: 0,
            target: 1,
            remaining: 1,
            // A victory is all or nothing: the floors reached tell how near the Wumpus is.
            progress: Math.min(0.99, stats.bestLevel / EXPEDITION_FLOORS),
          };
    if (!best || goal.progress > best.progress) best = goal;
  });
  return best;
}

/**
 * The closest goals, at most `max`: something the player can buy right now always comes first, then the others by
 * how near they are to done (ties: Forge, hero, achievement).
 */
export function nextGoals(stats: LocalStats, max = 2): Goal[] {
  const pool: Goal[] = [];
  const forge = forgeGoal(stats);
  if (forge) pool.push(forge);
  const hero = heroGoal(stats);
  if (hero) pool.push(hero);
  const ach = closestAchievements(stats, 1)[0];
  if (ach) pool.push({ kind: 'achievement', ...ach });
  const rank = (g: Goal) => (g.kind === 'forge' && g.affordable ? 2 : g.progress);
  return pool
    .map((g, i) => ({ g, i }))
    .sort((a, b) => rank(b.g) - rank(a.g) || a.i - b.i)
    .slice(0, Math.max(0, max))
    .map(x => x.g);
}

/** Upgrades that were out of reach before and are affordable now (what a run's embers just opened). */
export function newlyAffordable(before: LocalStats, after: LocalStats): UpgradeId[] {
  return UPGRADES.filter(u => !canAfford(before, u.id) && canAfford(after, u.id)).map(u => u.id);
}
