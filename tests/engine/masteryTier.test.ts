import { masteryOf, masteryThreshold, masteryTier, nextMasteryTier, tierCrossed } from '../../src/core/stats/mastery';
import { newAchievements } from '../../src/core/stats/achievements';
import { EMPTY_STATS } from '../../src/core/stats/runStats';

describe('mastery ranks', () => {
  it('names the rank of a level and the next one to chase', () => {
    expect(masteryTier(9)).toBeNull();
    expect(masteryTier(10)?.id).toBe('bronze');
    expect(masteryTier(29)?.id).toBe('silver');
    expect(masteryTier(80)?.id).toBe('legend');
    expect(nextMasteryTier(12)?.id).toBe('silver');
    expect(nextMasteryTier(50)).toBeNull();
  });

  it('reports a rank only when a run crosses into it, even skipping levels', () => {
    expect(tierCrossed(19, 20)?.id).toBe('silver');
    expect(tierCrossed(18, 21)?.id).toBe('silver');
    expect(tierCrossed(20, 21)).toBeNull();
    expect(tierCrossed(5, 9)).toBeNull();
  });

  it('unlocks the rank achievements from the best hero', () => {
    const xp = masteryThreshold(30);
    expect(masteryOf(xp).level).toBe(30);
    const stats = { ...EMPTY_STATS, heroXp: [0, xp, 0, 0, 0, 0] };
    const ids = newAchievements(stats, { score: 0, level: 1 });
    expect(ids).toEqual(expect.arrayContaining(['mastery_silver', 'mastery_gold']));
    expect(ids).not.toContain('mastery_platinum');
  });
});
