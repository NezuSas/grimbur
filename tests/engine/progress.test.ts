import { chartRuns, trendOf } from '../../src/core/stats/progress';
import { EMPTY_STATS, HISTORY_LIMIT, RunRecord, mergeDailyRun, mergeRun, parseStats } from '../../src/core/stats/runStats';

const rec = (score: number, mode: RunRecord['mode'] = 'expedition', victory = false): RunRecord => ({ day: '2026-10-13', score, level: 3, victory, mode });

describe('run history', () => {
  it('stores each finished run, expedition and daily alike, newest last', () => {
    let s = mergeRun(EMPTY_STATS, { score: 100, level: 3, day: '2026-10-12' }).stats;
    s = mergeDailyRun(s, '2026-10-13', { score: 200, level: 4, victory: true, day: '2026-10-13' }).stats;
    expect(s.history.map(r => [r.score, r.mode, r.victory])).toEqual([
      [100, 'expedition', false],
      [200, 'daily', true],
    ]);
  });

  it('keeps only the latest runs and skips abandoned ones', () => {
    let s = EMPTY_STATS;
    for (let i = 0; i < HISTORY_LIMIT + 8; i++) s = mergeRun(s, { score: i, level: 2, day: '2026-10-13' }).stats;
    expect(s.history).toHaveLength(HISTORY_LIMIT);
    expect(s.history[HISTORY_LIMIT - 1].score).toBe(HISTORY_LIMIT + 7);
    const skipped = mergeRun(EMPTY_STATS, { score: 5, level: 1, day: '2026-10-13', progressed: false }).stats;
    expect(skipped.history).toEqual([]);
  });

  it('survives a round trip and drops malformed entries', () => {
    const s = mergeRun(EMPTY_STATS, { score: 321, level: 5, victory: true, day: '2026-10-13' }).stats;
    expect(parseStats(JSON.stringify(s)).history).toEqual(s.history);
    const messy = parseStats('{"history":[{"day":"2026-10-13","score":9,"level":2},{"day":"nope","score":1,"level":1},{"day":"2026-10-13","score":-4,"level":1},7,null]}');
    expect(messy.history).toHaveLength(1);
  });
});

describe('progress chart', () => {
  it('leaves endless runs out (they are measured in floors) and caps the count', () => {
    const history = [rec(1, 'endless'), ...Array.from({ length: 20 }, (_, i) => rec(i + 10))];
    const runs = chartRuns(history, 14);
    expect(runs).toHaveLength(14);
    expect(runs.every(r => r.mode !== 'endless')).toBe(true);
  });

  it('says nothing before six runs, then compares the recent half with the earlier half', () => {
    expect(trendOf([rec(1), rec(2)])).toBeNull();
    expect(trendOf([100, 100, 100, 300, 300, 300].map(n => rec(n)))).toBe('up');
    expect(trendOf([300, 300, 300, 100, 100, 100].map(n => rec(n)))).toBe('down');
    expect(trendOf([200, 210, 190, 200, 205, 195].map(n => rec(n)))).toBe('flat');
  });
});
