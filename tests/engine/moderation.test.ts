import { MAX_HIDDEN, buildReportMailto, parseHidden, serializeHidden, withHidden } from '../../src/core/leaderboard/moderation';

describe('ranking moderation', () => {
  it('reads a stored list and ignores anything unreadable', () => {
    expect(parseHidden(null)).toEqual([]);
    expect(parseHidden('nope')).toEqual([]);
    expect(parseHidden('{"a":1}')).toEqual([]);
    expect(parseHidden(JSON.stringify(['a', 3, '', 'b', null]))).toEqual(['a', 'b']);
    expect(parseHidden(serializeHidden(['x', 'y']))).toEqual(['x', 'y']);
  });

  it('adds an id once, newest last, and never grows past the cap', () => {
    expect(withHidden(['a', 'b'], 'a')).toEqual(['b', 'a']);
    const many = Array.from({ length: MAX_HIDDEN }, (_, i) => `id${i}`);
    const next = withHidden(many, 'fresh');
    expect(next).toHaveLength(MAX_HIDDEN);
    expect(next[next.length - 1]).toBe('fresh');
    expect(next).not.toContain('id0');
  });

  it('builds a report email with the entry details, safely encoded', () => {
    const link = buildReportMailto('help@example.com', { id: 'abc', name: 'A&B <x>', score: 1234, level: 7 });
    expect(link.startsWith('mailto:help@example.com?subject=')).toBe(true);
    expect(decodeURIComponent(link)).toContain('Name: A&B <x>');
    expect(decodeURIComponent(link)).toContain('Score: 1234');
    expect(link).not.toContain(' ');
  });
});
