import { EMPTY_STATS } from '../../src/core/stats/runStats';
import { cycleHero, heroLockProgress, startingHero } from '../../src/core/stats/heroProgress';

describe('hero select helpers', () => {
  it('reports how close a locked hero is, and nothing for open ones', () => {
    const stats = { ...EMPTY_STATS, bestLevel: 3 };
    expect(heroLockProgress(0, stats)).toBeNull();
    expect(heroLockProgress(1, stats)).toEqual({ kind: 'floor', have: 3, need: 4 });
    expect(heroLockProgress(2, stats)).toEqual({ kind: 'floor', have: 3, need: 7 });
    expect(heroLockProgress(3, stats)).toEqual({ kind: 'victory', have: 0, need: 1 });
    expect(heroLockProgress(1, { ...stats, bestLevel: 6 })).toBeNull();
    expect(heroLockProgress(3, { ...stats, victories: 2 })).toBeNull();
  });

  it('never reports more than the requirement', () => {
    expect(heroLockProgress(2, { ...EMPTY_STATS, bestLevel: 5 })?.have).toBe(5);
    expect(heroLockProgress(1, { ...EMPTY_STATS, bestLevel: 3 })?.have).toBe(3);
  });

  it('opens on the last hero chosen when it is still unlocked, else on the first', () => {
    const veteran = { ...EMPTY_STATS, bestLevel: 7, victories: 1 };
    expect(startingHero(2, veteran, 4)).toBe(2);
    expect(startingHero(3, { ...EMPTY_STATS, bestLevel: 7 }, 4)).toBe(0);
    expect(startingHero(9, veteran, 4)).toBe(0);
    expect(startingHero(-1, veteran, 4)).toBe(0);
    expect(startingHero(1.5, veteran, 4)).toBe(0);
  });

  it('cycles around the roster in both directions', () => {
    expect(cycleHero(0, 1, 4)).toBe(1);
    expect(cycleHero(3, 1, 4)).toBe(0);
    expect(cycleHero(0, -1, 4)).toBe(3);
    expect(cycleHero(2, -3, 4)).toBe(3);
  });
});
