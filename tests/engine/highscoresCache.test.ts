const store = new Map<string, string>();
let failWrites = false;
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => store.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      if (failWrites) throw new Error('disk full');
      store.set(key, value);
    }),
  },
}));

import { describeAge, parseBoard, sanitizeRows, serializeBoard, CachedRow } from '../../src/core/leaderboard/cache';
import { loadTop10Cache, saveTop10Cache } from '../../src/services/highscoresCache';

const row = (i: number): CachedRow => ({ id: `d${i}`, name: `P${i}`, score: 1000 - i, level: 5, coins: 3, characterIndex: 1, time: 120 + i });
const rows = (n: number) => Array.from({ length: n }, (_, i) => row(i));
const NOW = 1_700_000_000_000;

describe('top 10 cache (pure)', () => {
  it('roundtrips a board', () => {
    const board = parseBoard(serializeBoard(rows(10), NOW), NOW + 1000);
    expect(board?.at).toBe(NOW);
    expect(board?.rows).toEqual(rows(10));
  });

  it('drops malformed rows and keeps at most ten', () => {
    const dirty = [...rows(12), null, 'x', { id: 'bad', name: '', score: 1 }, { ...row(99), score: NaN }];
    expect(sanitizeRows(dirty)).toHaveLength(10);
    expect(sanitizeRows([{ ...row(1), time: undefined }])[0].time).toBe(0);
    expect(sanitizeRows('nope')).toEqual([]);
  });

  it('rejects unusable storage', () => {
    expect(parseBoard(null)).toBeNull();
    expect(parseBoard('{not json')).toBeNull();
    expect(parseBoard(JSON.stringify({ at: NOW, rows: [] }), NOW)).toBeNull();
    expect(parseBoard(JSON.stringify({ at: 'x', rows: rows(3) }), NOW)).toBeNull();
    expect(parseBoard(JSON.stringify({ at: NOW + 10 * 86_400_000, rows: rows(3) }), NOW)).toBeNull(); // from the future
    expect(parseBoard('x'.repeat(50_000))).toBeNull();
  });

  it('describes the age in the coarsest unit', () => {
    expect(describeAge(NOW, NOW + 20_000)).toEqual({ unit: 'minutes', n: 0 });
    expect(describeAge(NOW, NOW + 5 * 60_000)).toEqual({ unit: 'minutes', n: 5 });
    expect(describeAge(NOW, NOW + 3 * 3_600_000)).toEqual({ unit: 'hours', n: 3 });
    expect(describeAge(NOW, NOW + 3 * 86_400_000)).toEqual({ unit: 'days', n: 3 });
    expect(describeAge(NOW, NOW - 5000)).toEqual({ unit: 'minutes', n: 0 }); // clock moved back
  });
});

describe('top 10 cache (storage)', () => {
  beforeEach(() => {
    store.clear();
    failWrites = false;
  });

  it('returns null when nothing was saved', async () => {
    expect(await loadTop10Cache(NOW)).toBeNull();
  });

  it('saves and loads the last good list', async () => {
    await saveTop10Cache(rows(10), NOW);
    const board = await loadTop10Cache(NOW + 60_000);
    expect(board?.rows).toHaveLength(10);
    expect(board?.at).toBe(NOW);
  });

  it('a newer list replaces the older one', async () => {
    await saveTop10Cache(rows(10), NOW);
    await saveTop10Cache(rows(4), NOW + 1000);
    expect((await loadTop10Cache(NOW + 2000))?.rows).toHaveLength(4);
  });

  it('never throws when storage fails or holds garbage', async () => {
    failWrites = true;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(saveTop10Cache(rows(3), NOW)).resolves.toBeUndefined();
    store.set('wumpus.top10.v1', '{{{');
    expect(await loadTop10Cache(NOW)).toBeNull();
  });
});
