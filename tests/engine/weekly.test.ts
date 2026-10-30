import { weeklyChallenge, WEEKLY_DEPTHS } from '../../src/core/challenge/weekly';
import { CODE_PATTERN, parseChallengeCode } from '../../src/core/challenge/code';

describe('weekly challenge', () => {
  it('is the same code all week and a new one the next week', () => {
    const monday = weeklyChallenge('2026-10-26');
    expect(weeklyChallenge('2026-11-01')).toEqual(monday);
    expect(weeklyChallenge('2026-11-02').code).not.toBe(monday.code);
    expect(monday.code).toMatch(CODE_PATTERN);
  });

  it('takes turns between depths and the code carries the depth', () => {
    const depths = new Set<number>();
    for (let w = 0; w < 8; w++) {
      const day = new Date(Date.UTC(2026, 9, 26 + w * 7)).toISOString().slice(0, 10);
      const c = weeklyChallenge(day);
      depths.add(c.depth);
      expect(parseChallengeCode(c.code)?.depth).toBe(c.depth);
    }
    expect([...depths].sort()).toEqual([...WEEKLY_DEPTHS]);
  });
});
