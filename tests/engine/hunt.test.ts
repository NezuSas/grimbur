import { newAchievements, totalSlain } from '../../src/core/stats/achievements';
import { BEASTS, huntStars } from '../../src/core/stats/bestiary';
import { EMPTY_STATS, mergeRun } from '../../src/core/stats/runStats';
import { achievementText } from '../../src/i18n/keys';
import { createTranslator } from '../../src/i18n/translate';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

describe('the hunt', () => {
  it('gives a creature one star per mark reached', () => {
    expect(huntStars('enemy', 0)).toEqual({ stars: 0, next: 10 });
    expect(huntStars('enemy', 10)).toEqual({ stars: 1, next: 60 });
    expect(huntStars('enemy', 199)).toEqual({ stars: 2, next: 200 });
    expect(huntStars('enemy', 500)).toEqual({ stars: 3, next: null });
    // Dangers that cannot be defeated have no stars.
    expect(huntStars('pit', 99)).toEqual({ stars: 0, next: null });
  });

  it('counts every creature defeated over all runs', () => {
    expect(totalSlain({ ...EMPTY_STATS, bestiary: { met: ['enemy', 'thief'], slain: { enemy: 20, thief: 5 } } })).toBe(25);
    expect(totalSlain(EMPTY_STATS)).toBe(0);
  });

  it('unlocks the hunter marks from the creatures a run adds', () => {
    const base = { ...EMPTY_STATS, bestiary: { met: ['enemy' as const], slain: { enemy: 55, thief: 14 } } };
    const run = { score: 100, level: 3, met: ['enemy', 'thief'], slain: { enemy: 6, thief: 1 } };
    const merged = mergeRun(base, run).stats;
    const ids = newAchievements(merged, run);
    expect(ids).toEqual(expect.arrayContaining(['hunt_25', 'hunt_enemy', 'hunt_thief']));
    expect(ids).not.toContain('hunt_100');
    expect(ids).not.toContain('bestiary_all');
  });

  it('unlocks the great bestiary once every creature and danger was met', () => {
    const merged = mergeRun({ ...EMPTY_STATS, bestiary: { met: [...BEASTS], slain: {} } }, { score: 0, level: 1 }).stats;
    expect(newAchievements(merged, { score: 0, level: 1 })).toContain('bestiary_all');
  });

  it('names the creature in a hunter mark', () => {
    const { t } = createTranslator({ en, es } as never, 'es');
    expect(achievementText(t as never, 'hunt_stalker', 'desc')).toContain('Lobo de sombra');
    expect(achievementText(t as never, 'hunt_thief', 'desc')).toContain('ladrones');
  });
});
