import { dailyKey, dailySeed, dayNumber, daysBetween, deriveLevelSeed, msUntilNextDay, previousDayKey, shiftDayKey } from '../../src/core/engine/seed';
import { generateBoard } from '../../src/core/engine/generator';

describe('daily seeds', () => {
  it('uses the LOCAL calendar day (rolls over at local midnight, whatever the time zone)', () => {
    expect(dailyKey(new Date(2026, 9, 12, 23, 59, 59))).toBe('2026-10-12');
    expect(dailyKey(new Date(2026, 9, 13, 0, 0, 0))).toBe('2026-10-13');
    expect(dailyKey(new Date(2026, 0, 5, 12))).toBe('2026-01-05'); // zero padded
  });

  it('never crashes on an invalid date', () => {
    expect(dailyKey(new Date(NaN))).toBe('1970-01-01');
  });

  it('does calendar arithmetic on keys without touching time zones', () => {
    expect(shiftDayKey('2026-10-31', 1)).toBe('2026-11-01');
    expect(shiftDayKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDayKey('2028-03-01', -1)).toBe('2028-02-29');
    expect(shiftDayKey('garbage', 3)).toBe('garbage');
    expect(daysBetween('2026-10-12', '2026-10-15')).toBe(3);
    expect(daysBetween('2026-10-15', '2026-10-12')).toBe(-3); // the clock went back
    expect(daysBetween('nope', '2026-10-12')).toBe(0);
    expect(dayNumber('2026-10-12') - dayNumber('2026-10-11')).toBe(1);
  });

  it('counts the time left until local midnight', () => {
    expect(msUntilNextDay(new Date(2026, 9, 12, 23, 0, 0))).toBe(3_600_000);
    expect(msUntilNextDay(new Date(2026, 9, 12, 0, 0, 0))).toBeGreaterThan(23 * 3_600_000 - 1);
    expect(msUntilNextDay(new Date(NaN))).toBeGreaterThan(0);
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
