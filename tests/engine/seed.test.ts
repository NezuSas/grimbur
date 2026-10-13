import { dailyKey, dailySeed, deriveLevelSeed, previousDayKey } from '../../src/core/engine/seed';
import { generateBoard } from '../../src/core/engine/generator';

describe('daily seeds', () => {
  it('uses the UTC calendar day', () => {
    expect(dailyKey(new Date('2026-10-12T23:59:59Z'))).toBe('2026-10-12');
    expect(dailyKey(new Date('2026-10-13T00:00:00Z'))).toBe('2026-10-13');
  });

  it('knows the previous day across month and year boundaries', () => {
    expect(previousDayKey('2026-10-13')).toBe('2026-10-12');
    expect(previousDayKey('2026-03-01')).toBe('2026-02-28');
    expect(previousDayKey('2026-01-01')).toBe('2025-12-31');
  });

  it('is stable per day and different between days', () => {
    expect(dailySeed('2026-10-12')).toBe(dailySeed('2026-10-12'));
    expect(dailySeed('2026-10-12')).not.toBe(dailySeed('2026-10-13'));
    expect(dailySeed('2026-10-12')).toBeGreaterThan(0);
  });
});

describe('deriveLevelSeed', () => {
  it('is deterministic and differs per level and run', () => {
    expect(deriveLevelSeed(123, 4)).toBe(deriveLevelSeed(123, 4));
    expect(deriveLevelSeed(123, 4)).not.toBe(deriveLevelSeed(123, 5));
    expect(deriveLevelSeed(123, 4)).not.toBe(deriveLevelSeed(124, 4));
  });

  it('always yields a usable positive seed, even for timestamp-sized run seeds', () => {
    for (const run of [1, 42, Date.now(), 2 ** 40]) {
      for (let level = 1; level <= 30; level++) {
        const seed = deriveLevelSeed(run, level);
        expect(Number.isInteger(seed)).toBe(true);
        expect(seed).toBeGreaterThan(0);
        expect(seed).toBeLessThan(2147483647);
      }
    }
  });

  it('makes a whole run reproducible: same daily => same boards for everyone', () => {
    const run = dailySeed('2026-10-12');
    for (let level = 1; level <= 6; level++) {
      const a = generateBoard(level, deriveLevelSeed(run, level));
      const b = generateBoard(level, deriveLevelSeed(run, level));
      expect(a).toEqual(b);
    }
  });
});
