import { EMPTY_STATS, mergeRun, parseStats } from '../../src/core/stats/runStats';
import { MASTERY_XP, MAX_MASTERY, masteryOf, masteryUp, masteryXpFor } from '../../src/core/stats/mastery';
import { ownsCosmetic } from '../../src/core/cosmetics/cosmetics';

describe('hero mastery', () => {
  it('pays experience for floors (up to ten) and more for a victory at depth', () => {
    expect(masteryXpFor({ level: 4, victory: false })).toBe(40);
    expect(masteryXpFor({ level: 25, victory: false })).toBe(100);
    expect(masteryXpFor({ level: 10, victory: true, ascension: 2 })).toBe(100 + 60 + 40);
    expect(masteryXpFor({ level: 6, victory: false }, false)).toBe(0);
  });

  it('climbs ten levels and reports progress', () => {
    expect(masteryOf(0).level).toBe(1);
    expect(masteryOf(MASTERY_XP[1]).level).toBe(2);
    expect(masteryOf(MASTERY_XP[MAX_MASTERY - 1]).level).toBe(MAX_MASTERY);
    // No cap: past ten it keeps climbing, each level asking a little more.
    expect(masteryOf(MASTERY_XP[MAX_MASTERY - 1] + 800).level).toBe(MAX_MASTERY + 1);
    expect(masteryOf(MASTERY_XP[MAX_MASTERY - 1] + 800 + 849).level).toBe(MAX_MASTERY + 1);
    expect(masteryOf(MASTERY_XP[MAX_MASTERY - 1] + 800 + 850).level).toBe(MAX_MASTERY + 2);
    expect(masteryOf(999999).level).toBeGreaterThan(100);
    expect(masteryOf(175).progress).toBeCloseTo(0.5);
    expect(masteryUp(90, 110)).toBe(2);
    expect(masteryUp(110, 120)).toBeNull();
  });

  it('only the hero played gains experience', () => {
    const after = mergeRun(EMPTY_STATS, { score: 1000, level: 5, victory: false, heroIndex: 2, day: '2026-10-30' }).stats;
    expect(after.heroXp[2]).toBe(50);
    expect(after.heroXp.filter((x, i) => i !== 2).every(x => x === 0)).toBe(true);
  });

  it('old saves start each hero from its victories, and full mastery earns its title', () => {
    const old = parseStats(JSON.stringify({ ...EMPTY_STATS, heroXp: undefined, heroWins: [0, 3, 0, 0, 0, 0] }));
    expect(old.heroXp[1]).toBe(3 * 160);
    const master = { ...EMPTY_STATS, heroXp: [MASTERY_XP[MAX_MASTERY - 1], 0, 0, 0, 0, 0] };
    expect(ownsCosmetic(master, 'title_mastervael')).toBe(true);
    expect(ownsCosmetic(master, 'title_mastersera')).toBe(false);
  });
});
