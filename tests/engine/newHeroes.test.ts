import { gameReducer } from '../../src/core/engine/reducer';
import { HEROES, getHeroPerks } from '../../src/core/engine/heroes';
import { ABILITY_COOLDOWNS } from '../../src/core/engine/shop';
import { HERO_COUNT } from '../../src/core/stats/achievements';
import { HERO_UNLOCKS, isHeroUnlocked, newlyUnlockedHeroes } from '../../src/core/stats/heroUnlocks';
import { heroLockProgress } from '../../src/core/stats/heroProgress';
import { heroGoal } from '../../src/core/stats/goals';
import { EMPTY_STATS, parseStats } from '../../src/core/stats/runStats';
import { decodeBackup, encodeBackup } from '../../src/core/stats/backup';
import { unlockText } from '../../src/i18n/keys';
import { boss, coin, createState, enemy, pit, trap } from '../helpers/state';

const MIRA = getHeroPerks(4);
const BRAM = getHeroPerks(5);
const nextFloor = { rows: 6, cols: 9, entities: [coin(30), enemy(3)], coins: 1, attack: 3, seed: 5 };
const use = { type: 'USE_ABILITY' } as const;

describe('the roster', () => {
  it('has six heroes, each with its perk and ability', () => {
    expect(HERO_COUNT).toBe(6);
    expect(HEROES).toHaveLength(6);
    expect(HERO_UNLOCKS).toHaveLength(6);
    expect(MIRA.ability).toBe('flare');
    expect(BRAM.ability).toBe('blast');
    expect(ABILITY_COOLDOWNS.flare).toBe(18);
    expect(ABILITY_COOLDOWNS.blast).toBe(24);
  });
});

describe('Mira: Lightbearer', () => {
  it('lights the area around the start on RESET and on every floor, but never a hazard', () => {
    let s = createState({ perks: MIRA, entities: [coin(100), enemy(3), pit(12)] });
    expect(s.visited).toContain(0);
    expect(s.visited).toContain(2);
    expect(s.visited).not.toContain(3); // a guardian: stays hidden
    expect(s.visited.length).toBeGreaterThan(5);
    for (let floor = 0; floor < 3; floor++) {
      s = gameReducer({ ...s, isLevelUp: true }, { type: 'LEVEL_UP', payload: nextFloor });
      expect(s.visited).toContain(1);
      expect(s.visited).not.toContain(3);
      expect(s.visited).not.toContain(4);
      expect(s.visited.length).toBeGreaterThan(5);
    }
    // other heroes start with a single tile
    expect(createState().visited).toEqual([0]);
  });
});

describe('Bram: Tinkerer', () => {
  it('starts every run with a detector and a bomb', () => {
    const s = createState({ perks: BRAM });
    expect(s.items).toEqual({ detector: 1, bomb: 1 });
    expect(createState().items).toEqual({ detector: 0, bomb: 0 });
    expect(gameReducer({ ...s, isLevelUp: true }, { type: 'LEVEL_UP', payload: nextFloor }).items).toEqual({ detector: 1, bomb: 1 });
  });
});

describe('Flare', () => {
  const base = () => createState({ perks: { ...MIRA, startLit: false }, entities: [coin(100), enemy(2), pit(16), trap(31)] });

  it('explores every non-lethal tile within two steps, hazards stay hidden, and starts the cooldown', () => {
    const s0 = { ...base(), playerIndex: 17 }; // row 1, col 2
    const s1 = gameReducer(s0, use);
    expect(s1.abilityCd).toBe(18);
    expect(s1.turn).toBe(1);
    expect(s1.visited).toEqual(expect.arrayContaining([17, 18, 19, 1, 3, 32, 15]));
    expect(s1.visited).not.toContain(16); // the pit
    expect(s1.visited).not.toContain(2); // the guardian
    for (const i of s1.visited) {
      const e = s1.entityMap[i];
      expect(!e || (e.type !== 'enemy' && e.type !== 'pit')).toBe(true);
      if (s0.visited.includes(i)) continue;
      expect(Math.abs(Math.floor(i / 15) - 1) + Math.abs((i % 15) - 2)).toBeLessThanOrEqual(2);
    }
  });

  it('respects cooldown and the guards, and does not mutate the state', () => {
    const s0 = base();
    const frozen = JSON.stringify(s0);
    const s1 = gameReducer(s0, use);
    expect(JSON.stringify(s0)).toBe(frozen);
    expect(gameReducer(s1, use)).toBe(s1); // recharging
    const over = { ...s0, isGameOver: true };
    expect(gameReducer(over, use)).toBe(over);
    const levelUp = { ...s0, isLevelUp: true };
    expect(gameReducer(levelUp, use)).toBe(levelUp);
    const draft = { ...s0, pendingDraft: ['quiver' as const, 'bulwark' as const] };
    expect(gameReducer(draft, use)).toBe(draft);
  });

  it('is deterministic', () => {
    expect(gameReducer(base(), use)).toEqual(gameReducer(base(), use));
  });
});

describe('Blast', () => {
  const base = () => createState({ perks: BRAM, entities: [coin(100), enemy(1), pit(15), trap(16), boss(31, 3), enemy(4)] });

  it('destroys guardians and vortexes in the 3x3 for free, never the Wumpus, and starts the cooldown', () => {
    const s0 = { ...base(), playerIndex: 16 };
    const s1 = gameReducer(s0, use);
    expect(s1.entityMap[1]).toBeUndefined();
    expect(s1.entityMap[15]).toBeUndefined();
    expect(s1.entityMap[4]).toBeDefined(); // outside the 3x3
    expect(s1.entityMap[31]?.type).toBe('boss');
    expect(s1.items).toEqual(s0.items); // no bomb spent
    expect(s1.abilityCd).toBe(24);
    expect(s1.turn).toBe(1);
    expect(gameReducer(s1, use)).toBe(s1);
  });

  it('never removes the boss even when it stands in the blast', () => {
    const s0 = { ...createState({ perks: BRAM, entities: [coin(100), boss(1, 3)] }) };
    expect(gameReducer(s0, use).entityMap[1]?.type).toBe('boss');
  });

  it('keeps the guards and is deterministic', () => {
    const s0 = base();
    const over = { ...s0, isGameOver: true };
    expect(gameReducer(over, use)).toBe(over);
    const levelUp = { ...s0, isLevelUp: true };
    expect(gameReducer(levelUp, use)).toBe(levelUp);
    expect(gameReducer(s0, use)).toEqual(gameReducer(base(), use));
  });
});

describe('unlock rules and progress', () => {
  it('Mira opens with 5 daily challenges, Bram with 500 embers in total', () => {
    expect(isHeroUnlocked(4, { ...EMPTY_STATS, dailyRuns: 4 })).toBe(false);
    expect(isHeroUnlocked(4, { ...EMPTY_STATS, dailyRuns: 5 })).toBe(true);
    expect(isHeroUnlocked(5, { ...EMPTY_STATS, lifetimeEmbers: 499 })).toBe(false);
    expect(isHeroUnlocked(5, { ...EMPTY_STATS, lifetimeEmbers: 500 })).toBe(true);
    expect(newlyUnlockedHeroes(EMPTY_STATS, { ...EMPTY_STATS, dailyRuns: 5, lifetimeEmbers: 500 })).toEqual([4, 5]);
  });

  it('reports progress for all four kinds, capped at the need', () => {
    const stats = { ...EMPTY_STATS, bestLevel: 3, dailyRuns: 2, lifetimeEmbers: 120 };
    expect(heroLockProgress(1, stats)).toEqual({ kind: 'floor', have: 3, need: 4 });
    expect(heroLockProgress(3, stats)).toEqual({ kind: 'victory', have: 0, need: 1 });
    expect(heroLockProgress(4, stats)).toEqual({ kind: 'daily', have: 2, need: 5 });
    expect(heroLockProgress(5, stats)).toEqual({ kind: 'embers', have: 120, need: 500 });
    expect(heroLockProgress(4, { ...stats, dailyRuns: 5 })).toBeNull();
  });

  it('the next-goal logic handles the new kinds', () => {
    const stats = { ...EMPTY_STATS, bestLevel: 7, victories: 1, dailyRuns: 4, lifetimeEmbers: 100 };
    expect(heroGoal(stats)).toMatchObject({ hero: 4, metric: 'daily', current: 4, target: 5, remaining: 1 });
    expect(heroGoal({ ...stats, dailyRuns: 5 })).toMatchObject({ hero: 5, metric: 'embers', current: 100, target: 500, remaining: 400 });
  });

  it('unlockText names the new rules', () => {
    const t = (key: string, params?: Record<string, unknown>) => `${key}:${JSON.stringify(params ?? {})}`;
    expect(unlockText(t as never, 4)).toBe('heroes.unlockDaily:{"count":5}');
    expect(unlockText(t as never, 5)).toBe('heroes.unlockEmbers:{"count":500}');
  });
});

describe('old saves', () => {
  const old = {
    bestScore: 10,
    victories: 1,
    heroesUsed: [0, 1, 2, 3],
    heroWins: [1, 2, 3, 4],
    heroBestDepth: [1, 2, 3, 4],
    dailyRuns: 6,
    lifetimeEmbers: 900,
  };

  it('grows the per-hero arrays of a 4-hero save to six', () => {
    const s = parseStats(JSON.stringify(old));
    expect(s.heroWins).toEqual([1, 2, 3, 4, 0, 0]);
    expect(s.heroBestDepth).toEqual([1, 2, 3, 4, 0, 0]);
    expect(s.heroesUsed).toEqual([0, 1, 2, 3]);
    expect(isHeroUnlocked(4, s)).toBe(true);
    expect(isHeroUnlocked(5, s)).toBe(true);
  });

  it('survives garbage in the hero arrays', () => {
    const s = parseStats(JSON.stringify({ ...old, heroWins: 'x', heroBestDepth: [null, {}, 'a'], heroesUsed: [9, -1, 5, 'z'] }));
    expect(s.heroWins).toHaveLength(6);
    expect(s.heroBestDepth).toHaveLength(6);
    expect(s.heroesUsed).toEqual([5]);
  });

  it('an old backup code restores with six slots, and a new one roundtrips', () => {
    const legacy = { ...EMPTY_STATS, heroWins: [1, 0, 0, 0], heroBestDepth: [2, 0, 0, 0] };
    const res = decodeBackup(encodeBackup(legacy, {}));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.stats.heroWins).toEqual([1, 0, 0, 0, 0, 0]);
      expect(res.stats.heroBestDepth).toEqual([2, 0, 0, 0, 0, 0]);
    }
    const fresh = { ...EMPTY_STATS, heroWins: [1, 0, 0, 0, 3, 2], heroBestDepth: [0, 0, 0, 0, 5, 1] };
    const back = decodeBackup(encodeBackup(fresh, {}));
    expect(back.ok && back.stats.heroWins).toEqual([1, 0, 0, 0, 3, 2]);
    expect(back.ok && back.stats.heroBestDepth).toEqual([0, 0, 0, 0, 5, 1]);
  });
});
