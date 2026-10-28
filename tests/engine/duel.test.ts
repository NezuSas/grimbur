import { AWAY_AFTER_MS, GONE_AFTER_MS, duelNow, duelPayout, isGone, tieShare, DuelPlayer, STAKES, MAX_STAKE, duelOutcome, duelSettled, duelStanding, isAway, potOf, prizeOf, rivalStatus, validateDuelPlayer } from '../../src/core/duel/duel';

const base: DuelPlayer = { code: 'ABCD2345', pid: '7J2K9QXM4HT6RN3B', name: 'Oscar', characterIndex: 1, state: 'playing', level: 4, score: 1500, victory: false, time: 0, stake: 25 };

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
    ['stake', { stake: 100_001 }],
    ['stake', { stake: 2.5 }],
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

  it('slaying the Grimbur beats everything; two victories are decided by time', () => {
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

describe('duelStanding (any number of rivals, winner takes all)', () => {
  const r = (level: number, score: number, finished: boolean, victory = false, time = 0) => ({ result: { level, score, victory, time }, finished });
  const me = (level: number, score: number, victory = false, time = 0) => ({ level, score, victory, time });

  it('while I still play I am only leading or trailing', () => {
    expect(duelStanding(me(3, 900), false, [r(2, 500, false)])).toMatchObject({ state: 'leading', decided: false, placement: 1, total: 2 });
    expect(duelStanding(me(2, 500), false, [r(3, 900, false)])).toMatchObject({ state: 'trailing', decided: false, placement: 2 });
  });

  it('once I am finished a rival who is already deeper has beaten me for good: no waiting', () => {
    const s = duelStanding(me(3, 900), true, [r(5, 100, false)]);
    expect(s).toMatchObject({ state: 'lost', decided: true });
  });

  it('a rival who slew the Grimbur has beaten me for good too', () => {
    expect(duelStanding(me(10, 5000), true, [r(10, 100, false, true)]).state).toBe('lost');
  });

  it('if I am ahead when I finish it is not settled until the others are done', () => {
    expect(duelStanding(me(4, 2000), true, [r(3, 800, false)])).toMatchObject({ state: 'leading', decided: false });
    expect(duelStanding(me(4, 2000), true, [r(3, 800, true)])).toMatchObject({ state: 'won', decided: true, placement: 1 });
  });

  it('a rival who is still playing but not ahead of me cannot decide it', () => {
    expect(duelStanding(me(4, 2000), true, [r(4, 2500, false)]).decided).toBe(false); // same floor, more points: they can still lose points or I... not for good
  });

  it('with several rivals the placement counts those who beat me', () => {
    const s = duelStanding(me(3, 900), true, [r(5, 100, true), r(4, 100, true), r(2, 100, true)]);
    expect(s).toMatchObject({ state: 'lost', decided: true, placement: 3, total: 4 });
    const w = duelStanding(me(6, 100), true, [r(5, 100, true), r(4, 100, true), r(2, 100, true)]);
    expect(w).toMatchObject({ state: 'won', placement: 1, total: 4 });
  });

  it('a tie for the first place is a tie', () => {
    expect(duelStanding(me(4, 1000), true, [r(4, 1000, true), r(2, 10, true)]).state).toBe('tie');
  });

  it('with nobody else it is just me', () => {
    expect(duelStanding(me(4, 1000), true, []).state).toBe('won');
  });
});

describe('potOf', () => {
  it('is the stake of everybody who started', () => {
    expect(potOf(25, 3)).toBe(75);
    expect(potOf(0, 4)).toBe(0);
    expect(potOf(-5, 2)).toBe(0);
  });

  it('the winner takes the pot minus 10 %', () => {
    expect(prizeOf(1000, 2)).toBe(1800);
    expect(prizeOf(100_000, 4)).toBe(360_000);
    expect(prizeOf(10, 3)).toBe(27);
    expect(prizeOf(0, 4)).toBe(0);
  });

  it('the stakes grow up to the most the rules accept', () => {
    expect(STAKES[0]).toBe(0);
    expect([...STAKES].sort((a, b) => a - b)).toEqual([...STAKES]);
    expect(Math.max(...STAKES)).toBe(MAX_STAKE);
  });
});

describe('ties and leaving', () => {
  const r = (level: number, score: number, finished: boolean) => ({ result: { level, score, victory: false, time: 0 }, finished });
  const me = { level: 4, score: 1000, victory: false, time: 0 };

  it('players tied for first share the whole pot, so the losers stakes are not lost', () => {
    const s = duelStanding(me, true, [r(4, 1000, true), r(2, 10, true)]);
    expect(s).toMatchObject({ state: 'tie', tiedFirst: 2 });
    expect(tieShare(100, 3, s.tiedFirst)).toBe(150);
    expect(tieShare(100, 2, 2)).toBe(100); // two players: everyone gets their stake back
  });

  it('a lone winner has tiedFirst 1', () => {
    expect(duelStanding(me, true, [r(2, 10, true)]).tiedFirst).toBe(1);
  });

  it('a disconnected rival is only gone after a long time', () => {
    expect(isGone(1_000_000 - AWAY_AFTER_MS - 1, 1_000_000)).toBe(false);
    expect(isGone(1_000_000 - GONE_AFTER_MS - 1, 1_000_000)).toBe(true);
  });
});

describe('duelNow', () => {
  it('ticks forward from the last server write, so a rival can still become gone after our run ends', () => {
    const server = 5_000_000;
    const wallAtWrite = 1_000;
    expect(duelNow(server, wallAtWrite, wallAtWrite)).toBe(server);
    expect(duelNow(server, wallAtWrite, wallAtWrite + GONE_AFTER_MS + 1)).toBe(server + GONE_AFTER_MS + 1);
    expect(isGone(server, duelNow(server, wallAtWrite, wallAtWrite + GONE_AFTER_MS + 1))).toBe(true);
  });

  it('never goes backwards when the phone clock jumps back, and uses the wall clock before any write lands', () => {
    expect(duelNow(5_000_000, 10_000, 9_000)).toBe(5_000_000);
    expect(duelNow(null, 0, 1234)).toBe(1234);
  });
});

describe('duelPayout', () => {
  it('pays the pot minus the fee on a win and the share on a tie', () => {
    expect(duelPayout('won', 100, 2, 1)).toBe(prizeOf(100, 2));
    expect(duelPayout('tie', 100, 2, 2)).toBe(tieShare(100, 2, 2));
    expect(duelPayout('lost', 100, 2, 1)).toBe(0);
  });

  it('returns the whole stake, fee-free, when no rival ever started', () => {
    expect(duelPayout('won', 100, 1, 1)).toBe(100);
    expect(duelPayout('tie', 100, 1, 2)).toBe(100);
  });

  it('pays nothing without a stake', () => {
    expect(duelPayout('won', 0, 2, 1)).toBe(0);
    expect(duelPayout('won', 0, 1, 1)).toBe(0);
  });
});
