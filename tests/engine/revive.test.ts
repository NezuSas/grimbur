import { gameReducer } from '../../src/core/engine/reducer';
import { MAX_REVIVES, REVIVE_ARROWS, revivePrice } from '../../src/core/engine/revive';
import { spendEmbers } from '../../src/core/stats/spend';
import { EMPTY_STATS } from '../../src/core/stats/runStats';
import { coin, createState, enemy } from '../helpers/state';

describe('revive', () => {
  it('prices rise and run out', () => {
    expect(revivePrice(0)).toBeLessThan(revivePrice(1) as number);
    expect(revivePrice(MAX_REVIVES)).toBeNull();
    expect(revivePrice(-3)).toBe(revivePrice(0));
  });

  it('brings the hero back to just before the fatal step, shielded, with arrows, and flags the killer', () => {
    const start = createState({ cols: 4, rows: 3, attack: 1, entities: [enemy(1), coin(11)] });
    const dead = gameReducer(start, { type: 'MOVE', direction: 'RIGHT' });
    expect(dead.isGameOver).toBe(true);
    expect(dead.lastBreath).not.toBeNull();
    const back = gameReducer(dead, { type: 'REVIVE' });
    expect(back.isGameOver).toBe(false);
    expect(back.deathCause).toBeNull();
    expect(back.playerIndex).toBe(0);
    expect(back.shield).toBe(true);
    expect(back.attack).toBeGreaterThanOrEqual(REVIVE_ARROWS);
    expect(back.marked).toContain(1);
    expect(back.revives).toBe(1);
    expect(back.lastBreath).toBeNull();
  });

  it('does nothing while alive', () => {
    const alive = createState({});
    expect(gameReducer(alive, { type: 'REVIVE' })).toBe(alive);
  });
});

describe('spendEmbers', () => {
  it('takes embers, never the rank, and refuses what it cannot pay', () => {
    const rich = { ...EMPTY_STATS, embers: 100, lifetimeEmbers: 500 };
    const after = spendEmbers(rich, 40);
    expect(after?.embers).toBe(60);
    expect(after?.lifetimeEmbers).toBe(500);
    expect(spendEmbers(rich, 101)).toBeNull();
    expect(spendEmbers(rich, 0)).toBeNull();
    expect(spendEmbers(rich, Number.NaN)).toBeNull();
  });
});
