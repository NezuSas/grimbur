import { nearMiss } from '../../src/core/stats/nearMiss';

const base = { score: 0, level: 1, victory: false, endless: false, isNewBest: false, best: 10000 };

describe('one more run', () => {
  it('flags a defeat close to the best score', () => {
    expect(nearMiss({ ...base, score: 8800 })).toEqual({ kind: 'score', gap: 1200 });
    expect(nearMiss({ ...base, score: 7000 })).toEqual({ kind: 'score', gap: 3000 });
  });

  it('stays quiet when far away, beaten, won or without a real record', () => {
    expect(nearMiss({ ...base, score: 6999 })).toBeNull();
    expect(nearMiss({ ...base, score: 10000 })).toBeNull();
    expect(nearMiss({ ...base, score: 9000, isNewBest: true })).toBeNull();
    expect(nearMiss({ ...base, score: 9000, victory: true })).toBeNull();
    expect(nearMiss({ ...base, score: 300, best: 400 })).toBeNull();
    expect(nearMiss({ ...base, score: 300, best: null })).toBeNull();
  });

  it('counts floors in the endless descent', () => {
    expect(nearMiss({ ...base, endless: true, level: 12, best: 14 })).toEqual({ kind: 'floor', gap: 2 });
    expect(nearMiss({ ...base, endless: true, level: 11, best: 14 })).toBeNull();
    expect(nearMiss({ ...base, endless: true, level: 14, best: 14 })).toBeNull();
  });
});
