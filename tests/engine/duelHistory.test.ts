import { addRecord, parseHistory, recordOf, summarize, MAX_HISTORY, type DuelRecord } from '../../src/core/duel/history';
import { makeChallengeCode, parseChallengeCode, rematchCode } from '../../src/core/challenge/code';

const standing = (state: 'won' | 'lost' | 'tie' | 'leading' | 'trailing', decided = true, placement = 1, total = 2) => ({ state, decided, placement, total });

describe('recordOf', () => {
  it('records a win with what was gained', () => {
    expect(recordOf('A', standing('won'), 100, 180, 5)).toMatchObject({ outcome: 'won', net: 80 });
  });
  it('records a loss as the lost stake and a tie as nothing', () => {
    expect(recordOf('A', standing('lost', true, 2), 100, 0, 5)).toMatchObject({ outcome: 'lost', net: -100, placement: 2 });
    expect(recordOf('A', standing('tie'), 100, 100, 5)).toMatchObject({ outcome: 'tie', net: 0 });
  });
  it('is nothing while the duel is open', () => {
    expect(recordOf('A', standing('leading', false), 0, 0, 5)).toBeNull();
    expect(recordOf('A', standing('won', false), 0, 0, 5)).toBeNull();
  });
});

describe('history list', () => {
  const rec = (code: string, net = 0): DuelRecord => ({ code, at: 1, outcome: 'won', placement: 1, total: 2, stake: 0, net });

  it('keeps the newest first, one record per duel, and the last 30', () => {
    let list = [rec('AAAAAAAA'), rec('BBBBBBBB')];
    list = addRecord(list, rec('AAAAAAAA', 5));
    expect(list.map(r => r.code)).toEqual(['AAAAAAAA', 'BBBBBBBB']);
    expect(list[0].net).toBe(5);
    for (let i = 0; i < 40; i++) list = addRecord(list, rec(`C${String(i).padStart(7, '0')}`));
    expect(list).toHaveLength(MAX_HISTORY);
  });

  it('summarizes wins, losses and the embers', () => {
    const s = summarize([rec('A', 80), { ...rec('B', -50), outcome: 'lost' }, { ...rec('C'), outcome: 'tie' }]);
    expect(s).toEqual({ played: 3, won: 1, lost: 1, tied: 1, net: 30 });
  });

  it('drops what is not a well-formed record when reading', () => {
    expect(parseHistory('x')).toEqual([]);
    expect(parseHistory([{ code: 'A', outcome: 'won', at: 1, placement: 1, total: 2, stake: 0, net: 0 }, { code: 'B' }, null, { code: 'C', outcome: 'cheat', at: 1, placement: 1, total: 1, stake: 0, net: 0 }])).toHaveLength(1);
  });
});

describe('rematchCode', () => {
  it('is the next cave at the same difficulty, the same for everyone', () => {
    const code = makeChallengeCode(1234, 3);
    const next = rematchCode(code) as string;
    expect(parseChallengeCode(next)).toMatchObject({ seed: 1235, depth: 3 });
    expect(rematchCode(code)).toBe(next);
  });
  it('wraps at the end of the seed range and refuses what is not a code', () => {
    expect(parseChallengeCode(rematchCode(makeChallengeCode(2 ** 29 - 1, 0)) as string)?.seed).toBe(0);
    expect(rematchCode('nope')).toBeNull();
  });
});
