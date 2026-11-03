import { LEGEND_TIER } from '../../src/core/puzzles/puzzles';
import { WEEKLY_EMBERS, msUntilWeekEnd, weekOf, weeklyNumber, weeklyPuzzle } from '../../src/core/puzzles/weekly';
import { rateDeduction } from '../../src/core/puzzles/deduction';
import { EMPTY_PUZZLES, parsePuzzles, weeklyState, withPuzzleResult, withWeeklyResult, withWeeklyStarted } from '../../src/core/stats/puzzleProgress';
import { rankWeeklyRows, type WeeklyRow } from '../../src/services/weeklyScores';

describe("the Grimbur's weekly challenge", () => {
  it('runs Monday to Sunday, numbered from its first week', () => {
    expect(weekOf('2026-11-02')).toBe('2026-11-02'); // a Monday
    expect(weekOf('2026-11-08')).toBe('2026-11-02'); // its Sunday
    expect(weekOf('2026-11-09')).toBe('2026-11-09');
    expect(weeklyNumber('2026-11-02')).toBe(1);
    expect(weeklyNumber('2026-11-16')).toBe(3);
    // Sunday evening: less than a day left; Monday: the whole week.
    expect(msUntilWeekEnd('2026-11-08', new Date(2026, 10, 8, 20, 0))).toBeLessThan(86_400_000);
    expect(msUntilWeekEnd('2026-11-02', new Date(2026, 10, 2, 0, 1))).toBeGreaterThan(6 * 86_400_000);
  });

  it('is a Legend board, the same for everyone, solvable by reading the clues', () => {
    for (const week of ['2026-11-02', '2026-11-09', '2027-03-15']) {
      const p = weeklyPuzzle(week);
      expect(p.tier).toBe(LEGEND_TIER);
      expect(JSON.stringify(weeklyPuzzle(week))).toBe(JSON.stringify(p));
      expect(rateDeduction(p.rows, p.cols, p.entities, p.visited).solvable).toBe(true);
    }
  });

  it('counts only the first try: spent when opened, paid once when solved, a failed or left try pays nothing', () => {
    const week = '2026-11-02';
    expect(weeklyState(EMPTY_PUZZLES, week)).toEqual({ kind: 'fresh' });
    const started = withWeeklyStarted(EMPTY_PUZZLES, week);
    expect(weeklyState(started, week)).toEqual({ kind: 'used', solved: false, time: 0 });
    expect(withWeeklyStarted(started, week)).toBe(started);
    const won = withWeeklyResult(started, week, true, 211.6, WEEKLY_EMBERS);
    expect(won.embers).toBe(WEEKLY_EMBERS);
    expect(weeklyState(won.progress, week)).toEqual({ kind: 'used', solved: true, time: 212 });
    // A second end of the same try, or a try never started, changes nothing.
    expect(withWeeklyResult(won.progress, week, true, 100, WEEKLY_EMBERS).embers).toBe(0);
    expect(withWeeklyResult(EMPTY_PUZZLES, week, true, 100, WEEKLY_EMBERS).embers).toBe(0);
    const lost = withWeeklyResult(started, week, false, 80, WEEKLY_EMBERS);
    expect(lost.embers).toBe(0);
    expect(weeklyState(lost.progress, week)).toEqual({ kind: 'used', solved: false, time: 0 });
    // A new week is fresh again.
    expect(weeklyState(won.progress, '2026-11-09')).toEqual({ kind: 'fresh' });
    expect(parsePuzzles({ weekly: { week: '2026-11-02', done: true, solved: true, time: 90 } }).weekly).toEqual({ week: '2026-11-02', done: true, solved: true, time: 90 });
    expect(parsePuzzles({ weekly: { week: 'nope' } }).weekly).toBeNull();
  });

  it('ranks friends: who solved it first, fastest first, failed tries last', () => {
    const row = (pid: string, solved: boolean, time: number): WeeklyRow => ({ pid, name: pid, week: '2026-11-02', solved, time, characterIndex: 0 });
    expect(rankWeeklyRows([row('a', false, 0), row('b', true, 300), row('c', true, 120)]).map(r => r.pid)).toEqual(['c', 'b', 'a']);
  });
});

describe('the puzzle counters behind the new achievements', () => {
  it('counts weekly challenges beaten and past days solved from the archive (each once)', () => {
    const week = '2026-11-02';
    const won = withWeeklyResult(withWeeklyStarted(EMPTY_PUZZLES, week), week, true, 100, WEEKLY_EMBERS).progress;
    expect(won.weeklyWins).toBe(1);
    const lost = withWeeklyResult(withWeeklyStarted(EMPTY_PUZZLES, week), week, false, 100, WEEKLY_EMBERS).progress;
    expect(lost.weeklyWins).toBe(0);
    let p = withPuzzleResult(EMPTY_PUZZLES, { kind: 'archive', date: '2026-11-01' }, 1).progress;
    p = withPuzzleResult(p, { kind: 'archive', date: '2026-11-01' }, 3).progress;
    expect(p.archiveSolved).toBe(1);
    p = withPuzzleResult(p, { kind: 'archive', date: '2026-11-03' }, 2).progress;
    expect(p.archiveSolved).toBe(2);
  });
});
