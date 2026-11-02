import { QUICK_FLOORS, boardLevel, isFullRun, isLairFloor, runFloors } from '../../src/core/engine/lair';
import { biomeFor } from '../../src/core/engine/biomes';
import { forkDoors } from '../../src/core/engine/shop';
import { omenFor } from '../../src/core/engine/omens';
import { generateBoard } from '../../src/core/engine/generator';
import { isModeLocked } from '../../src/core/entitlements/gating';
import { EMPTY_STATS, mergeRun } from '../../src/core/stats/runStats';
import { recentList } from '../../src/core/stats/progress';

describe('the quick descent', () => {
  it('is four floors: one of each cave, then the lair', () => {
    expect(runFloors('quick')).toBe(QUICK_FLOORS);
    expect(runFloors('expedition')).toBe(10);
    expect([1, 2, 3, 4].map(l => biomeFor(l, 'quick'))).toEqual(['cave', 'crystal', 'magma', 'lair']);
    expect([1, 2, 3, 4].map(l => isLairFloor('quick', l))).toEqual([false, false, false, true]);
    // The expedition is unchanged.
    expect(isLairFloor('expedition', 4)).toBe(false);
    expect(isLairFloor('expedition', 10)).toBe(true);
  });

  it('builds its floors like the expedition floors it stands for', () => {
    expect([1, 2, 3, 4].map(l => boardLevel('quick', l))).toEqual([2, 5, 8, 10]);
    expect(boardLevel('expedition', 7)).toBe(7);
    const lair = generateBoard(boardLevel('quick', 4), 1234, { boss: true, biome: 'lair' });
    expect(lair.entities.some(e => e.type === 'boss' && !e.mini)).toBe(true);
  });

  it('never offers a shortcut and has no omens past its last floor', () => {
    for (let seed = 1; seed < 300; seed++) {
      for (let level = 2; level <= 3; level++) expect(forkDoors(seed, level, 'quick') ?? []).not.toContain('shortcut');
      expect(forkDoors(seed, 4, 'quick')).toBeNull();
      expect(omenFor(seed, 5, 'quick')).toBeNull();
    }
  });

  it('is part of the full game when the unlock is on', () => {
    expect(isModeLocked('quick', false, { enabled: true, freeFloors: 3 })).toBe(true);
    expect(isModeLocked('quick', false, { enabled: false, freeFloors: 3 })).toBe(false);
  });

  it('is never an expedition win, record or goal, but pays and keeps its own record', () => {
    const won = mergeRun(EMPTY_STATS, { score: 4200, level: 4, victory: true, mode: 'quick', heroIndex: 0, ascension: 0, day: '2026-11-02', progressed: true });
    expect(won.stats.victories).toBe(0);
    expect(won.stats.heroWins[0]).toBe(0);
    expect(won.stats.maxAscension).toBe(0);
    expect(won.stats.bestScore).toBe(0);
    expect(won.stats.bestLevel).toBe(0);
    expect(won.stats.heroBestScore[0]).toBe(0);
    expect(won.stats.quickWins).toBe(1);
    expect(won.stats.bestQuickScore).toBe(4200);
    expect(won.stats.gamesPlayed).toBe(1);
    expect(won.payout.total).toBeGreaterThan(0);
    // The history says it was won, under its own mode, and keeps it out of the expedition's best.
    const rec = won.stats.history[won.stats.history.length - 1];
    expect(rec).toMatchObject({ mode: 'quick', victory: true });
    expect(recentList(won.stats.history)[0].best).toBe(false);
    expect(isFullRun('quick')).toBe(false);
    expect(isFullRun(undefined)).toBe(true);
  });
});
