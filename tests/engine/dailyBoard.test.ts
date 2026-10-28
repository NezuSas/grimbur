import { DailySubmission, dailyDocId, validateDaily, weekDays, weekKey } from '../../src/core/leaderboard/daily';

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

describe('weekDays (what the weekly board reads)', () => {
  it('lists Monday to Sunday of the ISO week of a day', () => {
    const days = weekDays('2026-10-17');
    expect(days).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
    expect(days.every(d => weekKey(d) === '2026-W42')).toBe(true);
  });

  it('crosses months and years', () => {
    expect(weekDays('2025-01-01')).toEqual(['2024-12-30', '2024-12-31', '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05']);
  });

  it('is empty for something that is not a day', () => {
    expect(weekDays('hello')).toEqual([]);
  });
});

describe('daily submissions', () => {
  const pid = '7J2K9QXM4HT6RN3B';
  const good: DailySubmission = { day: '2026-10-17', pid, name: 'Oscar', level: 6, score: 4200, coins: 10, characterIndex: 2, time: 200 };

  it('has one document per player per day', () => {
    expect(dailyDocId(good.day, pid)).toBe('2026-10-17_7J2K9QXM4HT6RN3B');
  });

  it('accepts a well-formed result', () => {
    expect(validateDaily(good)).toEqual([]);
  });

  it.each([
    ['day', { day: '2026-13-01' }],
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
