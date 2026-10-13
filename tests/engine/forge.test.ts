import {
  NO_META,
  UPGRADES,
  applyMeta,
  canAfford,
  embersFor,
  maxLevel,
  metaEffects,
  nextCost,
  purchase,
} from '../../src/core/stats/forge';
import { EMPTY_STATS, mergeDailyRun, mergeRun, parseStats } from '../../src/core/stats/runStats';
import { NO_PERKS } from '../../src/core/engine/heroes';
import { gameReducer, initialState } from '../../src/core/engine/reducer';
import { coin, createState } from '../helpers/state';
import { GameAction } from '../../src/core/engine/types';

const rich = { ...EMPTY_STATS, embers: 10_000 };

describe('embers earned', () => {
  it('pays something for every real run and a lot for a victory', () => {
    const lost = embersFor({ score: 800, level: 4 });
    const won = embersFor({ score: 800, level: 10, victory: true });
    expect(lost).toBe(Math.floor(800 / 250) + 16);
    expect(won).toBeGreaterThan(lost + 40);
  });

  it('scales the victory bonus with depth and pays nothing for a run that never started', () => {
    const base = embersFor({ score: 0, level: 10, victory: true, ascension: 0 });
    expect(embersFor({ score: 0, level: 10, victory: true, ascension: 3 })).toBe(base + 45);
    expect(embersFor({ score: 900, level: 3 }, false)).toBe(0);
  });

  it('is added to the balance by expedition and daily runs alike', () => {
    expect(mergeRun(EMPTY_STATS, { score: 500, level: 3 }).stats.embers).toBe(embersFor({ score: 500, level: 3 }));
    expect(mergeDailyRun(EMPTY_STATS, '2026-10-12', { score: 500, level: 3 }).stats.embers).toBe(embersFor({ score: 500, level: 3 }));
  });
});

describe('buying upgrades', () => {
  it('has costs that rise with each level', () => {
    for (const u of UPGRADES) expect([...u.costs]).toEqual([...u.costs].sort((a, b) => a - b));
  });

  it('spends the price, raises the level and refuses when it cannot', () => {
    const first = purchase(rich, 'whetstone')!;
    expect(first.forge.whetstone).toBe(1);
    expect(first.embers).toBe(10_000 - UPGRADES[0].costs[0]);
    expect(nextCost(first, 'whetstone')).toBe(UPGRADES[0].costs[1]);

    expect(purchase(EMPTY_STATS, 'whetstone')).toBeNull(); // no embers
    expect(canAfford({ ...EMPTY_STATS, embers: 59 }, 'whetstone')).toBe(false);
    expect(canAfford({ ...EMPTY_STATS, embers: 60 }, 'whetstone')).toBe(true);
  });

  it('stops at the maximum level', () => {
    let stats = rich;
    for (let i = 0; i < 10; i++) stats = purchase(stats, 'scribe') ?? stats;
    expect(stats.forge.scribe).toBe(maxLevel('scribe'));
    expect(nextCost(stats, 'scribe')).toBeNull();
    expect(purchase(stats, 'scribe')).toBeNull();
  });

  it('does not mutate the stats it was given', () => {
    const before = JSON.stringify(rich);
    purchase(rich, 'purse');
    expect(JSON.stringify(rich)).toBe(before);
  });
});

describe('what the upgrades do', () => {
  it('translates levels into run bonuses', () => {
    expect(metaEffects({})).toEqual(NO_META);
    expect(metaEffects({ whetstone: 2, purse: 3, scribe: 1, ward: 1, feather: 1 })).toEqual({
      arrows: 2,
      coinBonus: expect.closeTo(0.3, 5),
      draftBonus: 1,
      shield: true,
      feather: true,
    });
    expect(metaEffects({ whetstone: 99 }).arrows).toBe(maxLevel('whetstone'));
  });

  it('merges with the hero perks', () => {
    const merged = applyMeta({ ...NO_PERKS, bonusArrows: 1, coinMultiplier: 1.3 }, { arrows: 2, coinBonus: 0.1, draftBonus: 0, shield: false, feather: false });
    expect(merged.bonusArrows).toBe(3);
    expect(merged.coinMultiplier).toBeCloseTo(1.43, 5);
  });

  it('the run starts with the bought shield, extra arrows and a bigger relic draft', () => {
    const state = gameReducer(initialState, {
      type: 'RESET',
      character: { playerName: 'T' } as never,
      rows: 5,
      cols: 8,
      entities: [coin(39)],
      coins: 1,
      attack: 3,
      seed: 1,
      perks: applyMeta(NO_PERKS, { arrows: 2, coinBonus: 0, draftBonus: 1, shield: true, feather: false }),
      draftBonus: 1,
      startShield: true,
    });
    expect(state.shield).toBe(true);
    expect(state.attack).toBe(5);

    const levelUp: GameAction = { type: 'LEVEL_UP', payload: { rows: 5, cols: 8, entities: [], coins: 1, attack: 3, seed: 9 } };
    expect(gameReducer({ ...state, isLevelUp: true }, levelUp).pendingDraft).toHaveLength(4);
    expect(gameReducer({ ...createState(), isLevelUp: true }, levelUp).pendingDraft).toHaveLength(3);
  });
});

describe('persistence', () => {
  it('survives a round trip and sanitises bad data', () => {
    const stats = purchase(purchase(rich, 'purse')!, 'purse')!;
    expect(parseStats(JSON.stringify(stats))).toEqual(stats);

    const messy = parseStats('{"embers":-9,"forge":{"purse":99,"scribe":"x","nope":3,"ward":-1}}');
    expect(messy.embers).toBe(0);
    expect(messy.forge).toEqual({ purse: maxLevel('purse') });
  });
});

describe('Fortune and the Phoenix start', () => {
  it('Fortune raises the embers of every run by 15% per level', () => {
    const run = { score: 2500, level: 5 };
    const base = embersFor(run);
    expect(embersFor(run, true, 1)).toBe(Math.round(base * 1.15));
    expect(embersFor(run, true, 2)).toBe(Math.round(base * 1.3));
    expect(embersFor(run, true, 99)).toBe(embersFor(run, true, 2)); // capped at the maximum level
    expect(embersFor(run, false, 2)).toBe(0);
  });

  it('is applied when a run is saved', () => {
    const owned = { ...EMPTY_STATS, forge: { fortune: 2 } };
    const gained = mergeRun(owned, { score: 2500, level: 5 }).stats.embers;
    expect(gained).toBe(embersFor({ score: 2500, level: 5 }, true, 2));
  });

  it('a run with the upgrade starts holding a Phoenix Feather that soaks the first deadly touch', () => {
    const state = gameReducer(initialState, {
      type: 'RESET',
      character: { playerName: 'T' } as never,
      rows: 5,
      cols: 8,
      entities: [{ index: 1, type: 'enemy' }, coin(39)],
      coins: 1,
      attack: 3,
      seed: 1,
      startRelics: ['phoenix'],
    });
    expect(state.relics).toEqual(['phoenix']);
    const next = gameReducer(state, { type: 'MOVE', direction: 'RIGHT' });
    expect(next.isGameOver).toBe(false);
    expect(next.relics).toEqual([]);
  });
});
