import { gameReducer } from '../../src/core/engine/reducer';
import { EMPTY_BESTIARY, mergeBestiary, parseBestiary, tallyBestiary } from '../../src/core/stats/bestiary';
import { EMPTY_STATS, mergeRun, parseStats } from '../../src/core/stats/runStats';
import type { GameEntity } from '../../src/core/engine/types';
import { coin, createState, enemy, pit } from '../helpers/state';

const sleeper = (index: number): GameEntity => ({ index, type: 'sleeper' });

describe('the bestiary', () => {
  it('counts a guardian shot down', () => {
    const s = createState({ entities: [coin(100), enemy(1)] });
    const shot = gameReducer(s, { type: 'ATTACK', direction: 'RIGHT' });
    expect(shot.slain).toEqual({ enemy: 1 });
    expect(shot.met).toContain('enemy');
  });

  it('does not count a sleeper that wakes up', () => {
    const s = createState({ entities: [coin(100), sleeper(17)] });
    const woke = gameReducer(s, { type: 'MOVE', direction: 'RIGHT' });
    expect(woke.entities.some(e => e.type === 'stalker')).toBe(true);
    expect(woke.slain ?? {}).toEqual({});
  });

  it('meets everything a floor held when it ends', () => {
    const s = { ...createState({ entities: [coin(1), pit(30), enemy(50)] }), coins: 1 };
    const cleared = gameReducer(s, { type: 'MOVE', direction: 'RIGHT' });
    const next = gameReducer(cleared, { type: 'LEVEL_UP', payload: { rows: 6, cols: 9, entities: [coin(30)], coins: 1, attack: 3, seed: 5 } });
    expect(next.met).toEqual(expect.arrayContaining(['pit', 'enemy']));
  });

  it('starts over with a new run', () => {
    expect(tallyBestiary({ ...createState(), met: ['enemy'] } as never, { ...createState({ seed: 99 }), runSeed: 123 } as never)).toEqual({ met: [], slain: {} });
  });

  it('adds finished runs to the stats and survives a save', () => {
    const { stats } = mergeRun(EMPTY_STATS, { score: 100, level: 3, day: '2026-11-01', met: ['enemy', 'pit'], slain: { enemy: 2 } } as never);
    expect(stats.bestiary).toEqual({ met: ['enemy', 'pit'], slain: { enemy: 2 } });
    expect(parseStats(JSON.stringify(stats)).bestiary).toEqual(stats.bestiary);
    expect(mergeBestiary(stats.bestiary, { slain: { enemy: 1, ghost: 5 } as never }).slain.enemy).toBe(3);
    expect(parseBestiary({ met: ['dragon'], slain: { enemy: -1 } })).toEqual(EMPTY_BESTIARY);
  });
});
