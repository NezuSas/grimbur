import { ANCIENT_DEPTH, ANCIENT_ENDLESS_FLOOR, generateBoard, isAncientLair } from '../../src/core/engine/generator';
import { beastOf } from '../../src/core/stats/bestiary';

const bossOf = (b: ReturnType<typeof generateBoard>) => b.entities.find(e => e.type === 'boss' && !e.mini);

describe('the Ancestral Grimbur', () => {
  it('holds the lair from the hard depths and deep in the endless descent', () => {
    expect(isAncientLair(0, 10, false)).toBe(false);
    expect(isAncientLair(ANCIENT_DEPTH - 1, 10, false)).toBe(false);
    expect(isAncientLair(ANCIENT_DEPTH, 10, false)).toBe(true);
    expect(isAncientLair(0, 10, true)).toBe(false);
    expect(isAncientLair(0, ANCIENT_ENDLESS_FLOOR, true)).toBe(true);
  });

  it('is generated on those lairs only, and counted apart in the bestiary', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(bossOf(generateBoard(10, seed, { boss: true }))?.ancient).toBeUndefined();
      const ancient = bossOf(generateBoard(10, seed, { boss: true, ascension: ANCIENT_DEPTH }));
      expect(ancient?.ancient).toBe(true);
      expect(beastOf(ancient!)).toBe('ancient');
    }
  });
});
