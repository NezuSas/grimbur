import { CODE_PATTERN, formatChallengeCode, makeChallengeCode, newChallenge, parseChallengeCode } from '../../src/core/challenge/code';

describe('challenge codes', () => {
  it('round-trips the seed and the depth', () => {
    for (const [seed, depth] of [[0, 0], [1, 5], [123456789, 3], [2 ** 29 - 1, 5], [987654, 0]] as const) {
      const code = makeChallengeCode(seed, depth);
      expect(code).toMatch(CODE_PATTERN);
      expect(parseChallengeCode(code)).toEqual({ code, seed, depth });
    }
  });

  it('different caves have different codes', () => {
    const codes = new Set<string>();
    for (let seed = 0; seed < 2000; seed++) codes.add(makeChallengeCode(seed * 7919, seed % 6));
    expect(codes.size).toBe(2000);
  });

  it('reads what a person types', () => {
    const code = makeChallengeCode(424242, 2);
    expect(parseChallengeCode(formatChallengeCode(code).toLowerCase())?.seed).toBe(424242);
    expect(parseChallengeCode(`  ${code.slice(0, 4)} ${code.slice(4)} `)?.depth).toBe(2);
  });

  it('refuses a mistyped code: any one wrong character is caught', () => {
    const code = makeChallengeCode(31337, 4);
    const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    let accepted = 0;
    let tried = 0;
    for (let i = 0; i < code.length; i++) {
      for (const ch of alphabet) {
        if (ch === code[i]) continue;
        tried++;
        if (parseChallengeCode(code.slice(0, i) + ch + code.slice(i + 1))) accepted++;
      }
    }
    // The 8-bit check lets a few single-character changes through by chance; it must catch the vast majority.
    expect(accepted / tried).toBeLessThan(0.02);
  });

  it('refuses what is not a code', () => {
    expect(parseChallengeCode('')).toBeNull();
    expect(parseChallengeCode('ABC')).toBeNull();
    expect(parseChallengeCode('WA1.xxxx')).toBeNull();
    expect(parseChallengeCode('ZZZZZZZZZ')).toBeNull();
  });

  it('refuses a seed or depth out of range', () => {
    expect(() => makeChallengeCode(-1, 0)).toThrow();
    expect(() => makeChallengeCode(2 ** 29, 0)).toThrow();
    expect(() => makeChallengeCode(1.5, 0)).toThrow();
    expect(() => makeChallengeCode(5, 6)).toThrow();
  });

  it('makes a new challenge from a random number', () => {
    const c = newChallenge(2, () => 0.5);
    expect(c.depth).toBe(2);
    expect(c.seed).toBe(2 ** 28);
    expect(parseChallengeCode(c.code)?.seed).toBe(2 ** 28);
    expect(formatChallengeCode('ABCDEFGH')).toBe('ABCD-EFGH');
  });
});
