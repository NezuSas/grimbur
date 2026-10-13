import { NO_TIME, qualifies, rankRows, thresholdFromTop10 } from '../../src/core/leaderboard/threshold';

const row = (score: number, time?: number | null) => ({ score, time });

describe('rankRows', () => {
  it('orders by score then by faster time, and puts legacy rows without time last', () => {
    const ranked = rankRows([row(100, 50), row(300, 90), row(100), row(100, 20), row(300, 60)]);
    expect(ranked.map(r => [r.score, r.time ?? null])).toEqual([
      [300, 60],
      [300, 90],
      [100, 20],
      [100, 50],
      [100, null],
    ]);
  });

  it('does not mutate its input', () => {
    const input = [row(1, 5), row(2, 5)];
    rankRows(input);
    expect(input[0].score).toBe(1);
  });
});

describe('thresholdFromTop10', () => {
  it('lets anyone in while the board has free places', () => {
    const t = thresholdFromTop10([row(500, 10), row(400, 10)]);
    expect(t.count).toBe(2);
    expect(qualifies(t, 0, 999)).toBe(true);
  });

  it('uses the 10th place when the board is full', () => {
    const full = Array.from({ length: 10 }, (_, i) => row(1000 - i * 10, 100));
    const t = thresholdFromTop10(full);
    expect(t).toEqual({ count: 10, minScore: 910, maxTime: 100 });
    expect(qualifies(t, 911, 500)).toBe(true);
    expect(qualifies(t, 900, 1)).toBe(false);
  });

  it('breaks ties on score with the faster time, never with an equal one', () => {
    const full = Array.from({ length: 10 }, () => row(500, 120));
    const t = thresholdFromTop10(full);
    expect(qualifies(t, 500, 119)).toBe(true);
    expect(qualifies(t, 500, 120)).toBe(false);
    expect(qualifies(t, 500, 121)).toBe(false);
  });

  it('treats a 10th place without a time as the slowest possible', () => {
    const full = [...Array.from({ length: 9 }, () => row(900, 10)), row(500)];
    const t = thresholdFromTop10(full);
    expect(t.maxTime).toBe(NO_TIME);
    expect(qualifies(t, 500, 300)).toBe(true);
  });
});
