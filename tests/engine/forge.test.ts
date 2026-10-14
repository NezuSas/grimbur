import {
  NO_META,
  UPGRADES,
  applyMeta,
  canAfford,
  embersFor,
  EMBERS_PER_FLOOR,
  maxLevel,
  metaEffects,
  nextCost,
  purchase,
  shopOrder,
  recommendedUpgrade,
  affordableCount,
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
    expect(lost).toBe(Math.floor(800 / 250) + 4 * EMBERS_PER_FLOOR);
    expect(won).toBeGreaterThan(lost + 40);
  });

  it('scales the victory bonus with depth and pays nothing for a run that never started', () => {
    const base = embersFor({ score: 0, level: 10, victory: true, ascension: 0 });
    expect(embersFor({ score: 0, level: 10, victory: true, ascension: 3 })).toBe(base + 45);
    expect(embersFor({ score: 900, level: 3 }, false)).toBe(0);
  });

  it('is added to the balance by expedition and daily runs alike', () => {
    const seasoned = { ...EMPTY_STATS, bestLevel: 10 }; // no floor milestones left to pay
    expect(mergeRun(seasoned, { score: 500, level: 3 }).stats.embers).toBe(embersFor({ score: 500, level: 3 }));
    expect(mergeDailyRun(seasoned, '2026-10-12', { score: 500, level: 3 }).stats.embers).toBe(embersFor({ score: 500, level: 3 }));
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
    expect(metaEffects({ whetstone: 2, purse: 3, scribe: 1, ward: 1, feather: 1, eagle_eye: 1, explorer: 2 })).toEqual({
      arrows: 2,
      coinBonus: expect.closeTo(0.3, 5),
      draftBonus: 1,
      shield: true,
      startRelics: ['phoenix'],
      reach: 1,
      exploreBonus: 0.5,
    });
    expect(metaEffects({ whetstone: 99 }).arrows).toBe(maxLevel('whetstone'));
  });

  it('merges with the hero perks', () => {
    const merged = applyMeta({ ...NO_PERKS, bonusArrows: 1, coinMultiplier: 1.3 }, { ...NO_META, arrows: 2, coinBonus: 0.1 });
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
      perks: applyMeta(NO_PERKS, { ...NO_META, arrows: 2, draftBonus: 1, shield: true }),
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
    const owned = { ...EMPTY_STATS, bestLevel: 10, forge: { fortune: 2 } };
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

describe('relics you begin with', () => {
  const start = (relics: string[]) =>
    gameReducer(initialState, {
      type: 'RESET',
      character: { playerName: 'T' } as never,
      rows: 5,
      cols: 8,
      entities: [coin(39)],
      coins: 1,
      attack: 3,
      seed: 1,
      startRelics: relics as never,
    });

  it('every start relic upgrade names a real relic and none repeats', () => {
    const relics = UPGRADES.filter(u => u.relic).map(u => u.relic);
    expect(new Set(relics).size).toBe(relics.length);
    expect(relics.length).toBeGreaterThanOrEqual(10);
  });

  it('the Bulwark gives its shield, the Quiver its arrows and the Lantern its explored area from the first move', () => {
    expect(start(['bulwark']).shield).toBe(true);
    expect(start(['quiver']).attack).toBe(start([]).attack + 2);
    expect(start(['lantern']).visited.length).toBeGreaterThan(1);
    expect(start([]).visited).toEqual([0]);
  });

  it('reach and exploration upgrades change the hero perks', () => {
    const perks = applyMeta(NO_PERKS, { ...NO_META, reach: 1, exploreBonus: 0.5 });
    expect(perks.arrowReach).toBe(NO_PERKS.arrowReach + 1);
    expect(perks.newTileMultiplier).toBeCloseTo(1.5, 5);
  });

  it('upgrades are grouped and every one has a cost', () => {
    for (const u of UPGRADES) {
      expect(['power', 'economy', 'relics']).toContain(u.category);
      expect(u.costs.length).toBeGreaterThan(0);
    }
    expect(UPGRADES.length).toBeGreaterThanOrEqual(18);
  });
});

describe('the shop order', () => {
  const poor = { ...EMPTY_STATS, embers: 0 };

  it('puts what you can buy first, the cheapest goal next and maxed upgrades last', () => {
    const stats = { ...EMPTY_STATS, embers: 100, forge: { scribe: 1, ward: 1 } };
    const order = shopOrder(stats);
    expect(order).toHaveLength(UPGRADES.length);
    const affordable = order.filter(u => canAfford(stats, u.id));
    expect(order.slice(0, affordable.length)).toEqual(affordable);
    expect(order[order.length - 1].id === 'scribe' || order[order.length - 1].id === 'ward').toBe(true);
    expect(order.slice(-2).map(u => u.id).sort()).toEqual(['scribe', 'ward']);
  });

  it('recommends an affordable lasting boost before a relic, and the cheapest goal when nothing is affordable', () => {
    const rich = { ...EMPTY_STATS, embers: 1000 };
    expect(recommendedUpgrade(rich)?.category).toBe('power');
    expect(recommendedUpgrade(poor)?.id).toBe('purse'); // the cheapest at 40 embers
    expect(affordableCount(poor)).toBe(0);
    expect(affordableCount(rich)).toBeGreaterThan(5);
  });

  it('recommends nothing once everything is bought', () => {
    const all: Record<string, number> = {};
    for (const u of UPGRADES) all[u.id] = maxLevel(u.id);
    expect(recommendedUpgrade({ ...EMPTY_STATS, forge: all, embers: 5 })).toBeNull();
  });
});
