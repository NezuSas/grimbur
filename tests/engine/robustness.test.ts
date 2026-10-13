import { resolveLanguage } from '../../src/i18n/translate';
import { EMPTY_STATS, mergeDailyRun, parseStats } from '../../src/core/stats/runStats';
import { embersFor } from '../../src/core/stats/forge';
import { gameReducer } from '../../src/core/engine/reducer';
import { ALL_RELICS, RELICS } from '../../src/core/engine/relics';
import { createState } from '../helpers/state';

describe('bad stored data never crashes or corrupts', () => {
  it('an unknown stored language falls back to the device language, then English', () => {
    expect(resolveLanguage('fr' as never, 'es')).toBe('es');
    expect(resolveLanguage('fr' as never)).toBe('en');
    expect(resolveLanguage('es')).toBe('es');
  });

  it('a NaN score or level earns zero embers instead of wiping the balance', () => {
    expect(Number.isFinite(embersFor({ score: NaN, level: NaN }))).toBe(true);
  });

  it('hero ids beyond the roster are dropped', () => {
    const stats = parseStats(JSON.stringify({ heroesUsed: [0, 1, 7, 15] }));
    expect(stats.heroesUsed).toEqual([0, 1]);
  });
});

describe('daily streak and the device clock', () => {
  it('a clock set backwards keeps the streak and the last played day', () => {
    const day1 = mergeDailyRun(EMPTY_STATS, '2026-10-10', { score: 100, level: 2 }).stats;
    const day2 = mergeDailyRun(day1, '2026-10-11', { score: 100, level: 2 }).stats;
    expect(day2.streak).toBe(2);

    const back = mergeDailyRun(day2, '2026-10-09', { score: 100, level: 2 }).stats;
    expect(back.streak).toBe(2);
    expect(back.lastDailyDate).toBe('2026-10-11');
  });
});

describe('relic draft with nothing left to offer', () => {
  it('does not block the game with an empty draft', () => {
    const maxed = ALL_RELICS.flatMap(id => Array.from({ length: RELICS[id].max }, () => id));
    const state = { ...createState(), isLevelUp: true, relics: maxed };
    const next = gameReducer(state, {
      type: 'LEVEL_UP',
      payload: { rows: 5, cols: 8, entities: [], coins: 1, attack: 3, seed: 5 },
    });
    expect(next.pendingDraft).toBeNull();
  });
});

describe('the once-a-day ember bonus', () => {
  const { dailyBonus } = require('../../src/core/stats/forge');
  const { mergeRun } = require('../../src/core/stats/runStats');

  it('grows with the streak and is capped', () => {
    expect(dailyBonus(0)).toBe(15);
    expect(dailyBonus(3)).toBe(30);
    expect(dailyBonus(100)).toBe(50);
    expect(dailyBonus(-4)).toBe(15);
  });

  it('is paid on the first finished run of a day only', () => {
    const run = { score: 500, level: 3, day: '2026-10-13' };
    const first = mergeRun(EMPTY_STATS, run).stats;
    const second = mergeRun(first, run).stats;
    const base = first.embers - dailyBonus(0);
    expect(second.embers - first.embers).toBe(base); // no second bonus the same day
    const nextDay = mergeRun(second, { ...run, day: '2026-10-14' }).stats;
    expect(nextDay.embers - second.embers).toBe(base + dailyBonus(0));
    expect(nextDay.lastBonusDate).toBe('2026-10-14');
  });

  it('is not paid for a run abandoned before it started', () => {
    const stats = mergeRun(EMPTY_STATS, { score: 0, level: 1, day: '2026-10-13', progressed: false }).stats;
    expect(stats.embers).toBe(0);
    expect(stats.lastBonusDate).toBeNull();
  });
});
