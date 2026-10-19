import { duelResultView } from '../../src/screens/game/duelResult';

const t = ((key: string, params: Record<string, unknown> = {}) => `${key}${Object.keys(params).length ? ':' + JSON.stringify(params) : ''}`) as never;
const rival = (level: number, score: number, status: 'playing' | 'done' | 'away' = 'playing', victory = false) => ({ pid: 'P', name: 'Bot', level, score, victory, status, characterIndex: 0 });

describe('duelResultView', () => {
  it('is nothing outside a duel or before the run is over', () => {
    expect(duelResultView(null, [], 0, 0, 'ABCD-2345', t)).toBeNull();
  });

  it('says so when nobody joined', () => {
    expect(duelResultView({ state: 'won', decided: true, placement: 1, total: 1, tiedFirst: 1 }, [], 0, 0, 'ABCD-2345', t)?.line).toContain('noRival');
  });

  it('a player who is already beaten is told at once, with the stake they lose', () => {
    const v = duelResultView({ state: 'lost', decided: true, placement: 2, total: 2, tiedFirst: 1 }, [rival(5, 900)], 25, 0, 'X', t);
    expect(v?.headline).toContain('duel.result.lose');
    expect(v?.line).toContain('duel.result.waiting'); // the rival is still playing: we say where they are
    expect(v?.prize).toContain('duel.result.lostStake');
  });

  it('a player who is ahead is told it is not final yet', () => {
    const v = duelResultView({ state: 'leading', decided: false, placement: 1, total: 2, tiedFirst: 1 }, [rival(3, 800)], 0, 0, 'X', t);
    expect(v?.headline).toContain('duel.result.leading');
    expect(v?.prize).toBe('');
  });

  it('a winner sees the pot once it is paid (and a placeholder while it is being paid)', () => {
    const settled = { state: 'won' as const, decided: true, placement: 1, total: 3, tiedFirst: 1 };
    expect(duelResultView(settled, [rival(2, 10, 'done'), rival(1, 5, 'done')], 25, 75, 'X', t)?.prize).toContain('75');
    expect(duelResultView(settled, [rival(2, 10, 'done')], 25, 0, 'X', t)?.prize).toContain('…');
  });

  it('with three or more players the place is shown', () => {
    const v = duelResultView({ state: 'lost', decided: true, placement: 3, total: 4, tiedFirst: 1 }, [rival(9, 1, 'done')], 0, 0, 'X', t);
    expect(v?.line).toContain('duel.result.place');
  });

  it('a tie gives the stake back; a rival who left is reported as gone', () => {
    expect(duelResultView({ state: 'tie', decided: true, placement: 1, total: 2, tiedFirst: 1 }, [rival(4, 100, 'done')], 10, 10, 'X', t)?.prize).toContain('duel.result.refund');
    expect(duelResultView({ state: 'won', decided: true, placement: 1, total: 2, tiedFirst: 1 }, [rival(1, 1, 'away')], 0, 0, 'X', t)?.line).toContain('duel.result.away');
  });
});
