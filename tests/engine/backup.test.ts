import { EMPTY_STATS, LocalStats } from '../../src/core/stats/runStats';
import {
  BACKUP_VERSION,
  DEFAULT_BACKUP_SETTINGS,
  MAX_CODE_LENGTH,
  checksum,
  decodeBackup,
  encodeBackup,
  fromBase64Url,
  sanitizeSettings,
  summarize,
  toBase64Url,
} from '../../src/core/stats/backup';

const stats: LocalStats = {
  ...EMPTY_STATS,
  bestScore: 4321,
  bestLevel: 8,
  gamesPlayed: 17,
  victories: 3,
  embers: 250,
  forge: { whetstone: 2 },
  achievements: { first_win: '2026-01-02' },
  heroesUsed: [0, 2],
  history: [{ day: '2026-01-02', score: 900, level: 4, victory: false, mode: 'expedition' }],
};

describe('base64url', () => {
  it.each(['', 'a', 'ab', 'abc', 'abcd', '{"x":1}', 'ñandú 🔥 日本'])('roundtrips %j', text => {
    const encoded = toBase64Url(text);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]*$/);
    expect(fromBase64Url(encoded)).toBe(text);
  });

  it('rejects invalid input', () => {
    expect(fromBase64Url('a')).toBeNull(); // impossible length
    expect(fromBase64Url('ab+/')).toBeNull(); // not url-safe
    expect(fromBase64Url('_w')).toBeNull(); // lone continuation byte
  });
});

describe('backup code', () => {
  it('roundtrips stats and settings', () => {
    const settings = { ...DEFAULT_BACKUP_SETTINGS, soundEnabled: false, musicVolume: 25, language: 'es' as const, hintsSeen: ['undo'] };
    const result = decodeBackup(encodeBackup(stats, settings));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stats).toEqual(stats);
    expect(result.settings).toEqual(settings);
  });

  it('is versioned, compact and a single line', () => {
    const code = encodeBackup(stats, {});
    expect(code.startsWith(`WA${BACKUP_VERSION}.`)).toBe(true);
    expect(code).not.toMatch(/\s/);
    expect(code.length).toBeLessThan(MAX_CODE_LENGTH / 4);
  });

  it('survives whitespace added when pasting', () => {
    const code = encodeBackup(stats, {});
    const pasted = `  ${code.slice(0, 30)}\n${code.slice(30)} \r\n`;
    expect(decodeBackup(pasted).ok).toBe(true);
  });

  it('rejects a tampered body, a tampered checksum and a truncated code', () => {
    const code = encodeBackup(stats, {});
    const [head, body, sum] = code.split('.');
    const flipped = body.slice(0, 20) + (body[20] === 'A' ? 'B' : 'A') + body.slice(21);
    expect(decodeBackup(`${head}.${flipped}.${sum}`)).toEqual({ ok: false, reason: 'checksum' });
    expect(decodeBackup(`${head}.${body}.00000000`)).toEqual({ ok: false, reason: 'checksum' });
    expect(decodeBackup(code.slice(0, code.length - 15))).toEqual({ ok: false, reason: 'format' });
    expect(decodeBackup(`${head}.${body.slice(0, -5)}.${sum}`)).toEqual({ ok: false, reason: 'checksum' });
  });

  it('rejects another version', () => {
    const [, body, sum] = encodeBackup(stats, {}).split('.');
    expect(decodeBackup(`WA2.${body}.${sum}`)).toEqual({ ok: false, reason: 'version' });
    expect(decodeBackup(`WA0.${body}.${sum}`)).toEqual({ ok: false, reason: 'version' });
  });

  it('rejects a valid checksum over an unreadable or wrongly shaped payload', () => {
    const wrap = (text: string) => {
      const body = toBase64Url(text);
      return `WA1.${body}.${checksum(body)}`;
    };
    expect(decodeBackup(wrap('not json'))).toEqual({ ok: false, reason: 'data' });
    expect(decodeBackup(wrap('[]'))).toEqual({ ok: false, reason: 'data' });
    expect(decodeBackup(wrap('null'))).toEqual({ ok: false, reason: 'data' });
    expect(decodeBackup(wrap('{"v":2,"s":{}}'))).toEqual({ ok: false, reason: 'data' });
    expect(decodeBackup(wrap('{"v":1}'))).toEqual({ ok: false, reason: 'data' });
    expect(decodeBackup(`WA1.a.${checksum('a')}`)).toEqual({ ok: false, reason: 'data' });
  });

  it('sanitises hostile stats and settings through the existing parsers', () => {
    const body = toBase64Url(JSON.stringify({
      v: 1,
      s: { bestScore: -5, gamesPlayed: 'many', victories: 2.9, forge: { whetstone: 999, bogus: 3 }, achievements: { x: 'not-a-date' }, history: 'no' },
      c: { language: 'fr', musicVolume: 9999, controlSize: 'huge', soundEnabled: 'yes', hintsSeen: [1, 'ok', 'ok'] },
    }));
    const result = decodeBackup(`WA1.${body}.${checksum(body)}`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stats.bestScore).toBe(0);
    expect(result.stats.gamesPlayed).toBe(0);
    expect(result.stats.forge.bogus).toBeUndefined();
    expect(result.stats.forge.whetstone).toBeLessThan(999);
    expect(result.stats.achievements).toEqual({});
    expect(result.stats.history).toEqual([]);
    expect(result.settings.language).toBe('auto');
    expect(result.settings.musicVolume).toBe(100);
    expect(result.settings.controlSize).toBe('medium');
    expect(result.settings.soundEnabled).toBe(true);
    expect(result.settings.hintsSeen).toEqual(['ok']);
  });

  it.each([undefined, null, 42, {}, [], '', ' ', 'hello', 'WA1', 'WA1..', 'WA1.a.b.c', '....', '🔥', 'WAx.abc.12345678'])(
    'never throws on garbage %j',
    garbage => {
      expect(decodeBackup(garbage).ok).toBe(false);
    },
  );

  it('rejects oversized input without decoding it', () => {
    expect(decodeBackup('A'.repeat(MAX_CODE_LENGTH * 2 + 1))).toEqual({ ok: false, reason: 'size' });
    expect(decodeBackup(`WA1.${'A'.repeat(MAX_CODE_LENGTH)}.00000000`)).toEqual({ ok: false, reason: 'size' });
    expect(decodeBackup('x'.repeat(5_000_000)).ok).toBe(false);
  });

  it('keeps a full 30-run history under the size limit', () => {
    const history = Array.from({ length: 30 }, (_, i) => ({ day: '2026-02-03', score: 99999 + i, level: 10, victory: true, mode: 'daily' as const }));
    const full: LocalStats = { ...stats, history, achievements: Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`ach_${i}`, '2026-02-03'])) };
    const code = encodeBackup(full, {});
    expect(code.length).toBeLessThan(MAX_CODE_LENGTH);
    expect(decodeBackup(code).ok).toBe(true);
  });

  it('summarises for the confirm step', () => {
    expect(summarize(stats)).toEqual({ runs: 17, bestScore: 4321, embers: 250, achievements: 1 });
  });

  it('settings sanitiser tolerates non-objects', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_BACKUP_SETTINGS);
    expect(sanitizeSettings('x')).toEqual(DEFAULT_BACKUP_SETTINGS);
  });
});
