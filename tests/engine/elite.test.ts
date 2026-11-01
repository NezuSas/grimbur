import { gameReducer } from '../../src/core/engine/reducer';
import { forkDoors, ELITE_FROM } from '../../src/core/engine/shop';
import { omenFor } from '../../src/core/engine/omens';
import { generateBoard } from '../../src/core/engine/generator';
import { coin, createState } from '../helpers/state';

describe('the elite floor', () => {
  it('shows up at some forks from its floor on, always beside another door, never before', () => {
    let elite = 0;
    for (let seed = 1; seed <= 300; seed++) {
      for (let level = 2; level <= 9; level++) {
        const doors = forkDoors(seed, level, 'expedition');
        if (!doors || !doors.includes('elite')) continue;
        expect(level).toBeGreaterThanOrEqual(ELITE_FROM);
        expect(doors.filter(d => d === 'elite')).toHaveLength(1);
        elite++;
      }
    }
    expect(elite).toBeGreaterThan(300);
  });

  it('is never forced on a floor by the seed alone (no fork, no elite)', () => {
    for (let seed = 1; seed <= 200; seed++) for (let level = 1; level <= 10; level++) expect(omenFor(seed, level)).not.toBe('elite');
  });

  it('builds a harder floor than the plain one', () => {
    let plain = 0;
    let hard = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const count = (b: ReturnType<typeof generateBoard>) => b.entities.filter(e => e.type === 'enemy' || e.type === 'stalker').length;
      plain += count(generateBoard(5, seed));
      hard += count(generateBoard(5, seed, { omen: 'elite' }));
    }
    expect(hard).toBeGreaterThan(plain + 40);
  });

  it('earns a second relic pick once cleared', () => {
    const cleared = { ...createState(), isLevelUp: true, omen: 'elite' as const };
    const next = gameReducer(cleared, { type: 'LEVEL_UP', payload: { rows: 6, cols: 9, entities: [coin(30)], coins: 1, attack: 3, seed: 5 } });
    expect(next.altarPending).toBe(true);
    const first = gameReducer(next, { type: 'PICK_RELIC', id: next.pendingDraft![0] });
    expect(first.pendingDraft?.length ?? 0).toBeGreaterThan(0);
  });
});
