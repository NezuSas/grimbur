import { DailySubmission, dailyDocId, validateDaily, weekKey } from '../../src/core/leaderboard/daily';

describe('weekKey (ISO weeks)', () => {
  it('numbers the weeks of a year', () => {
    expect(weekKey('2026-01-01')).toBe('2026-W01'); // a Thursday: week 1
    expect(weekKey('2026-10-17')).toBe('2026-W42'); // a Saturday
    expect(weekKey('2026-10-19')).toBe('2026-W43'); // the Monday after
  });

  it('a week runs Monday to Sunday', () => {
    expect(weekKey('2026-10-12')).toBe('2026-W42');
    expect(weekKey('2026-10-18')).toBe('2026-W42');
  });

  it('days near the new year belong to the week of their Thursday', () => {
    expect(weekKey('2024-12-30')).toBe('2025-W01'); // Monday, its Thursday is 2025-01-02
    expect(weekKey('2021-01-03')).toBe('2020-W53'); // Sunday of a 53-week year
    expect(weekKey('2025-12-29')).toBe('2026-W01');
  });

  it('refuses what is not a real day', () => {
    expect(weekKey('2026-02-30')).toBeNull();
    expect(weekKey('hello')).toBeNull();
    expect(weekKey('')).toBeNull();
  });
});

describe('daily submissions', () => {
  const pid = '7J2K9QXM4HT6RN3B';
  const good: DailySubmission = { day: '2026-10-17', week: '2026-W42', pid, name: 'Oscar', level: 6, score: 4200, coins: 10, characterIndex: 2, time: 200 };

  it('has one document per player per day', () => {
    expect(dailyDocId(good.day, pid)).toBe('2026-10-17_7J2K9QXM4HT6RN3B');
  });

  it('accepts a well-formed result', () => {
    expect(validateDaily(good)).toEqual([]);
  });

  it.each([
    ['day', { day: '2026-13-01' }],
    ['week', { week: '2026-W43' }],
    ['player', { pid: 'short' }],
    ['level', { level: 11 }],
    ['score', { score: 6 * 20000 + 1 }],
    ['coins', { coins: 6 * 8 + 1 }],
    ['hero', { characterIndex: 6 }],
    ['time', { time: 3 }],
  ])('flags a bad %s', (problem, patch) => {
    expect(validateDaily({ ...good, ...patch })).toContain(problem);
  });
});
