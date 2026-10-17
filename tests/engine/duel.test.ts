import { AWAY_AFTER_MS, DuelPlayer, duelOutcome, duelSettled, isAway, rivalStatus, validateDuelPlayer } from '../../src/core/duel/duel';

const base: DuelPlayer = { code: 'ABCD2345', pid: '7J2K9QXM4HT6RN3B', name: 'Oscar', characterIndex: 1, state: 'playing', level: 4, score: 1500, victory: false, time: 0 };

describe('validateDuelPlayer', () => {
  it('accepts a well-formed player', () => {
    expect(validateDuelPlayer(base)).toEqual([]);
  });

  it.each([
    ['code', { code: 'abc' }],
    ['player', { pid: 'short' }],
    ['name', { name: '' }],
    ['hero', { characterIndex: 6 }],
    ['state', { state: 'cheating' as never }],
    ['level', { level: 11 }],
    ['score', { score: 4 * 20000 + 1 }],
    ['time', { time: -1 }],
  ])('flags a bad %s', (problem, patch) => {
    expect(validateDuelPlayer({ ...base, ...patch })).toContain(problem);
  });
});

describe('duelOutcome', () => {
  const p = (level: number, score: number, victory = false, time = 0) => ({ level, score, victory, time });

  it('the deeper floor wins, then the higher score', () => {
    expect(duelOutcome(p(5, 100), p(4, 9000))).toBe('win');
    expect(duelOutcome(p(4, 9000), p(5, 100))).toBe('lose');
    expect(duelOutcome(p(4, 2000), p(4, 1500))).toBe('win');
    expect(duelOutcome(p(4, 1500), p(4, 2000))).toBe('lose');
  });

  it('slaying the Wumpus beats everything; two victories are decided by time', () => {
    expect(duelOutcome(p(10, 100, true), p(10, 99999, false))).toBe('win');
    expect(duelOutcome(p(10, 5000, true, 600), p(10, 5000, true, 700))).toBe('win');
    expect(duelOutcome(p(10, 5000, true, 800), p(10, 5000, true, 700))).toBe('lose');
  });

  it('an exact match is a tie', () => {
    expect(duelOutcome(p(4, 1500), p(4, 1500))).toBe('tie');
    expect(duelOutcome(p(10, 5000, true, 700), p(10, 5000, true, 700))).toBe('tie');
  });
});

describe('rival status', () => {
  const now = 1_000_000;

  it('no document is waiting; a lobby document too', () => {
    expect(rivalStatus(null, null, now)).toBe('waiting');
    expect(rivalStatus({ state: 'lobby' }, now, now)).toBe('waiting');
  });

  it('follows the state while they keep updating, and is away when they stop', () => {
    expect(rivalStatus({ state: 'ready' }, now - 1000, now)).toBe('ready');
    expect(rivalStatus({ state: 'playing' }, now - 1000, now)).toBe('playing');
    expect(rivalStatus({ state: 'playing' }, now - AWAY_AFTER_MS - 1, now)).toBe('away');
    expect(isAway(now - AWAY_AFTER_MS, now)).toBe(false);
  });

  it('done stays done however old it is', () => {
    expect(rivalStatus({ state: 'done' }, now - 999999, now)).toBe('done');
  });

  it('settles only when both are finished or the rival is gone', () => {
    expect(duelSettled(true, 'done')).toBe(true);
    expect(duelSettled(true, 'away')).toBe(true);
    expect(duelSettled(true, 'playing')).toBe(false);
    expect(duelSettled(false, 'done')).toBe(false);
  });
});
