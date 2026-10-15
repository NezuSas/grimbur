import {
  LEADERBOARD_LIMITS,
  ScoreSubmission,
  checkName,
  containsBlockedWord,
  sanitizeName,
  validateSubmission,
} from '../../src/core/leaderboard/validation';

const valid: ScoreSubmission = { level: 5, score: 4200, name: 'Oscar', coins: 20, characterIndex: 1, time: 310 };

describe('sanitizeName', () => {
  it('trims, collapses whitespace and removes control characters', () => {
    expect(sanitizeName('  Ana \n  Maria\u0007 ')).toBe('Ana Maria');
  });

  it('removes links and caps the length', () => {
    expect(sanitizeName('visit https://spam.example now')).toBe('visit now');
    expect(sanitizeName('x'.repeat(50))).toHaveLength(LEADERBOARD_LIMITS.maxNameLength);
  });
});

describe('containsBlockedWord', () => {
  it.each(['fuck', 'F U C K'.replace(/ /g, ''), 'sh1t', 'PUTA', 'pendejo', 'Cabrón', 'xxhijueputaxx'])(
    'blocks %s',
    name => expect(containsBlockedWord(name)).toBe(true),
  );

  it.each(['Oscar', 'Computadora', 'Reputation', 'Mark', 'Scunthorpe', 'Dickens', 'Ana Maria'])(
    'allows %s',
    name => expect(containsBlockedWord(name)).toBe(false),
  );
});

describe('checkName', () => {
  it('rejects empty and blocked names, accepts clean ones', () => {
    expect(checkName('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(checkName('mierda')).toEqual({ ok: false, reason: 'blocked' });
    expect(checkName('  Nezu ')).toEqual({ ok: true, name: 'Nezu' });
  });
});

describe('invisible characters', () => {
  it('cannot hide a blocked word', () => {
    expect(checkName('fu\u200bck').ok).toBe(false);
    expect(sanitizeName('Ana\u202eoR')).toBe('AnaoR');
  });
});

describe('validateSubmission', () => {
  it('accepts a plausible submission', () => {
    expect(validateSubmission(valid)).toEqual([]);
  });

  it.each([
    ['level', { level: 0 }],
    ['level', { level: 13 }],
    ['score', { score: -1 }],
    ['score', { score: 5 * 20000 + 1 }],
    ['coins', { coins: 5 * 8 + 1 }],
    ['characterIndex', { characterIndex: 6 }],
    ['time', { time: 0 }],
    ['time', { time: 86401 }],
    ['name', { name: '' }],
    ['name', { name: 'x'.repeat(21) }],
    ['score', { score: 12.5 }],
  ])('flags %s', (field, patch) => {
    expect(validateSubmission({ ...valid, ...patch })).toContain(field);
  });
});
