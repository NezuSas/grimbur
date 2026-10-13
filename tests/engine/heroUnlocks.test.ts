import {
  HERO_UNLOCKS,
  isHeroUnlocked,
  newlyUnlockedHeroes,
} from '../../src/core/stats/heroUnlocks';
import { HEROES } from '../../src/core/engine/heroes';
import { en, TranslationKey } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import { createTranslator } from '../../src/i18n/translate';
import { unlockText } from '../../src/i18n/keys';
import { EMPTY_STATS, mergeDailyRun, mergeRun } from '../../src/core/stats/runStats';

describe('hero unlocks', () => {
  it('covers every hero', () => {
    expect(HERO_UNLOCKS).toHaveLength(HEROES.length);
  });

  it('starts with only the first hero', () => {
    expect([0, 1, 2, 3].map(i => isHeroUnlocked(i, EMPTY_STATS))).toEqual([true, false, false, false]);
  });

  it('unlocks heroes by depth reached and by winning', () => {
    const floor4 = { ...EMPTY_STATS, bestLevel: 4 };
    expect(isHeroUnlocked(1, floor4)).toBe(true);
    expect(isHeroUnlocked(2, floor4)).toBe(false);

    const floor7 = { ...EMPTY_STATS, bestLevel: 7 };
    expect(isHeroUnlocked(2, floor7)).toBe(true);
    expect(isHeroUnlocked(3, floor7)).toBe(false);

    expect(isHeroUnlocked(3, { ...EMPTY_STATS, victories: 1 })).toBe(true);
  });

  it('reports exactly the heroes a run has just unlocked', () => {
    const before = { ...EMPTY_STATS, bestLevel: 3 };
    const { stats } = mergeRun(before, { score: 900, level: 7 });
    expect(newlyUnlockedHeroes(before, stats)).toEqual([1, 2]);
    expect(newlyUnlockedHeroes(stats, stats)).toEqual([]);
  });

  it('counts victories from normal and daily runs', () => {
    const normal = mergeRun(EMPTY_STATS, { score: 5000, level: 10, victory: true }).stats;
    expect(normal.victories).toBe(1);
    expect(isHeroUnlocked(3, normal)).toBe(true);

    const daily = mergeDailyRun(EMPTY_STATS, '2026-10-12', { score: 5000, level: 10, victory: true }).stats;
    expect(daily.victories).toBe(1);

    expect(mergeRun(EMPTY_STATS, { score: 10, level: 2 }).stats.victories).toBe(0);
  });

  it('translates how to unlock each locked hero', () => {
    const tEn = createTranslator<TranslationKey>({ en, es }, 'en').t;
    const tEs = createTranslator<TranslationKey>({ en, es }, 'es').t;
    expect(unlockText(tEn, 0)).toBe('');
    expect(unlockText(tEn, 1)).toBe('Reach floor 4');
    expect(unlockText(tEn, 2)).toBe('Reach floor 7');
    expect(unlockText(tEn, 3)).toBe('Win an expedition');
    expect(unlockText(tEs, 1)).toBe('Llega al piso 4');
    expect(unlockText(tEs, 3)).toBe('Gana una expedición');
  });
});
