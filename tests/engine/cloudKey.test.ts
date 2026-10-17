import { KEY_LENGTH, KEY_PATTERN, formatKey, keyFromBytes, normalizeKey } from '../../src/core/cloud/cloudKey';

describe('cloud key', () => {
  it('makes 16 characters from 10 bytes, always inside the alphabet', () => {
    for (let n = 0; n < 200; n++) {
      const bytes = Array.from({ length: 10 }, (_, i) => (n * 37 + i * 91 + (n % 7) * i * 13) & 255);
      const key = keyFromBytes(bytes);
      expect(key).toHaveLength(KEY_LENGTH);
      expect(KEY_PATTERN.test(key)).toBe(true);
    }
    expect(keyFromBytes(new Array(10).fill(0))).toBe('0000000000000000');
    expect(keyFromBytes(new Array(10).fill(255))).toBe('ZZZZZZZZZZZZZZZZ');
  });

  it('different bytes give different keys', () => {
    expect(keyFromBytes([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).not.toBe(keyFromBytes([1, 2, 3, 4, 5, 6, 7, 8, 9, 11]));
  });

  it('refuses too few bytes', () => {
    expect(() => keyFromBytes([1, 2, 3])).toThrow();
  });

  it('reads what a person types: case, spaces, dashes and look-alike letters', () => {
    const key = '7J2K9QXM4HT6RN3B';
    expect(normalizeKey(formatKey(key))).toBe(key);
    expect(normalizeKey('  7j2k-9qxm 4ht6-rn3b ')).toBe(key);
    expect(normalizeKey('OIL0OIL0OIL0OIL0')).toBe('0110011001100110');
  });

  it('is not fooled by other text', () => {
    expect(normalizeKey('')).toBeNull();
    expect(normalizeKey('WA1.abc.def')).toBeNull();
    expect(normalizeKey('7J2K9QXM4HT6RN3')).toBeNull(); // 15
    expect(normalizeKey('7J2K9QXM4HT6RN3BB')).toBeNull(); // 17
    expect(normalizeKey('7J2K9QXM4HT6RN3U')).toBeNull(); // U is not in the alphabet
  });

  it('formats in groups of four', () => {
    expect(formatKey('7J2K9QXM4HT6RN3B')).toBe('7J2K-9QXM-4HT6-RN3B');
  });
});
