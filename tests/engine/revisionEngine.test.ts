/**
 * The engine bugs of the October 2026 review (REVISION_GRIMBUR.md, block 2): each test reproduces one and guards its fix.
 */
import { gameReducer, ensureWinnable } from '../../src/core/engine/reducer';
import { generateBoard, getSafeZoneIndices } from '../../src/core/engine/generator';
import { isSolvableByDeduction } from '../../src/core/engine/solver';
import { getNearbyHazards } from '../../src/core/engine/proximity';
import { createEntityMap, pickTeleportDestination, startingVisited } from '../../src/core/engine/worldHelpers';
import { omenFor } from '../../src/core/engine/omens';
import { biomeFor } from '../../src/core/engine/biomes';
import { deriveLevelSeed } from '../../src/core/engine/seed';
import { NO_PERKS, HeroPerks } from '../../src/core/engine/heroes';
import { CLUE_HAZARD_TYPES, EntityType, GameEntity, GameState, LETHAL_TYPES } from '../../src/core/engine/types';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { boss, coin, createState, enemy, pit, trap } from '../helpers/state';

const move = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => ({ type: 'MOVE', direction }) as const;
const stalker = (index: number, charge = 0): GameEntity => ({ index, type: 'stalker', charge });
const perksWith = (ability: HeroPerks['ability']): HeroPerks => ({ ...NO_PERKS, ability });
const neighbours = (i: number, rows: number, cols: number) =>
  [i - cols, i + cols, i % cols > 0 ? i - 1 : -1, i % cols < cols - 1 ? i + 1 : -1].filter(n => n >= 0 && n < rows * cols);

/** The floors of an expedition, generated the way the game does (biomes and omens included). */
const expeditionFloors = (runSeed: number, depth: number) =>
  Array.from({ length: 9 }, (_, i) => i + 1).map(level =>
    generateBoard(level, deriveLevelSeed(runSeed, level), { ascension: depth, omen: omenFor(runSeed, level, 'expedition'), biome: biomeFor(level, 'expedition') }),
  );

describe('2.1 Wayfarer Boots do not recharge the ability', () => {
  it('retracing explored ground leaves the cooldown where it was', () => {
    let s: GameState = { ...createState({ entities: [coin(100)], coins: 1, perks: perksWith('magnet') }), relics: ['iron_boots'], abilityCd: 5 };
    s = gameReducer(s, move('RIGHT')); // a new tile: one action passes
    expect(s.abilityCd).toBe(4);
    for (let i = 0; i < 8; i++) s = gameReducer(s, move(i % 2 === 0 ? 'LEFT' : 'RIGHT'));
    expect(s.turn).toBe(1);
    expect(s.abilityCd).toBe(4);
  });
});

describe('2.2 the clues and the fairness check count the same hazards', () => {
  it('one list: every hazard a clue counts is a clue hazard of the check', () => {
    for (const type of ['enemy', 'boss', 'stalker', 'sleeper', 'pit'] as EntityType[]) {
      const map = createEntityMap([{ index: 1, type }]);
      const near = getNearbyHazards(0, 2, 3, map);
      expect(near.enemyCount + near.pitCount).toBe(CLUE_HAZARD_TYPES.includes(type) ? 1 : 0);
    }
  });

  it('a stalker beside the start makes the opening clue ambiguous, so the board needs a guess', () => {
    // 2x3: the stalker at 1 makes the start's clue a 1, which can be tile 1 or tile 3: nothing is proven safe.
    expect(isSolvableByDeduction(2, 3, [stalker(1), coin(5)], 0)).toBe(false);
  });
});

describe('2.3 every floor can be cleared by deduction', () => {
  it.each([0, 3, 5])('depth %i: no floor forces a guess (counting stalkers where they start)', depth => {
    let unfair = 0;
    for (let run = 1; run <= 40; run++) {
      for (const b of expeditionFloors(run * 7919, depth)) if (!isSolvableByDeduction(b.rows, b.cols, b.entities, 0)) unfair++;
    }
    expect(unfair).toBe(0);
  });
});

describe('2.4 the deepest depths: neither empty floors nor minefields', () => {
  it.each([4, 5])('depth %i keeps at most ~30%% of the room lethal and always a guardian and a vortex', depth => {
    for (let run = 1; run <= 40; run++) {
      for (const b of expeditionFloors(run * 104729, depth)) {
        const room = b.rows * b.cols - getSafeZoneIndices(b.rows, b.cols, 0, 0, 2).length;
        const lethal = b.entities.filter(e => LETHAL_TYPES.includes(e.type)).length;
        expect(lethal / room).toBeLessThanOrEqual(0.3);
        expect(b.entities.some(e => e.type === 'enemy' || e.type === 'sleeper')).toBe(true);
        expect(b.entities.some(e => e.type === 'pit')).toBe(true);
      }
    }
  });
});

describe('2.5 lighting never hides a clue under a trap', () => {
  it('the Lantern does not light a trap', () => {
    expect(startingVisited(8, 5, true, [trap(1)])).not.toContain(1);
  });

  it('the Flare does not light a trap', () => {
    const s = gameReducer(createState({ entities: [trap(1), coin(100)], coins: 1, perks: perksWith('flare') }), { type: 'USE_ABILITY' });
    expect(s.visited).toContain(15);
    expect(s.visited).not.toContain(1);
  });

  it('the Scout does not uncover a trap', () => {
    // 1x3 corridor: the only unexplored neighbour is a trap.
    const s = gameReducer(createState({ rows: 1, cols: 3, entities: [trap(1), coin(2)], coins: 1, perks: perksWith('scout') }), { type: 'USE_ABILITY' });
    expect(s.visited).not.toContain(1);
  });
});

describe('2.7 a vortex throws the hero somewhere readable', () => {
  it('prefers an unexplored tile with a clue of 0 or one next to explored ground', () => {
    // 6x6 with guardians spread so that most of the fog has a clue above 0.
    const rows = 6;
    const cols = 6;
    const entities: GameEntity[] = [pit(1), enemy(9), enemy(14), enemy(21), enemy(26), enemy(33), coin(35)];
    const entityMap = createEntityMap(entities);
    const visited = [0, 6];
    const readable = (i: number) =>
      visited.includes(i) ||
      neighbours(i, rows, cols).some(n => visited.includes(n)) ||
      neighbours(i, rows, cols).every(n => !entityMap[n] || !LETHAL_TYPES.includes(entityMap[n].type));
    for (let seed = 1; seed <= 60; seed++) {
      const state = { ...createState({ rows, cols, entities, coins: 1, seed }), visited, playerIndex: 0 };
      const to = pickTeleportDestination(state, 1, visited);
      expect(to).not.toBeNull();
      expect(readable(to!)).toBe(true);
    }
  });
});

describe('2.8 stalkers keep their distance from the start', () => {
  it('never starts closer than 5 steps to the spawn', () => {
    for (let run = 1; run <= 60; run++) {
      for (const depth of [0, 5]) {
        for (const b of expeditionFloors(run * 31, depth)) {
          for (const e of b.entities.filter(x => x.type === 'stalker')) expect(Math.floor(e.index / b.cols) + (e.index % b.cols)).toBeGreaterThanOrEqual(5);
        }
      }
    }
  });
});

describe('2.9 smaller engine bugs', () => {
  it('a revive after a stalker struck does not flag the tile the hero stood on', () => {
    const every = GAME_CONFIG.stalker.moveEvery;
    let s: GameState = { ...createState({ entities: [stalker(2, 1), coin(100)], coins: 1 }), turn: every - 1 };
    s = gameReducer(s, move('RIGHT'));
    expect(s.isGameOver).toBe(true);
    expect(s.deathCause).toBe('stalker');
    const back = gameReducer(s, { type: 'REVIVE' });
    expect(back.isGameOver).toBe(false);
    expect(back.marked).not.toContain(1);
  });

  it('a revive after walking into a guardian still flags its tile', () => {
    let s = createState({ entities: [enemy(1), coin(100)], coins: 1 });
    s = gameReducer(s, move('RIGHT'));
    expect(s.isGameOver).toBe(true);
    expect(gameReducer(s, { type: 'REVIVE' }).marked).toContain(1);
  });

  it('the rescue arrows of the lair always land where the hero can walk', () => {
    // A wall of vortexes splits the 8x15 floor: the hero and the Grimbur are on the left, most of the floor is behind the wall.
    const wall = Array.from({ length: 8 }, (_, r) => pit(r * 15 + 5));
    for (let seed = 1; seed <= 30; seed++) {
      const s = ensureWinnable({ ...createState({ entities: [boss(33, 3), ...wall], coins: 0, attack: 0, seed }), coins: 0 });
      const ammo = s.entities.filter(e => e.type === 'ammo');
      expect(ammo.length).toBeGreaterThan(0);
      for (const a of ammo) expect(a.index % 15).toBeLessThan(5);
    }
  });

  it('nothing is bought in the daily: REVIVE and REFILL do nothing there', () => {
    const daily: GameState = { ...createState({ entities: [enemy(1), coin(100)], coins: 1 }), mode: 'daily' };
    expect(gameReducer(daily, { type: 'REFILL' })).toBe(daily);
    const dead = gameReducer(daily, move('RIGHT'));
    expect(dead.isGameOver).toBe(true);
    expect(gameReducer(dead, { type: 'REVIVE' })).toBe(dead);
  });

  it('a run keeps the seed it was given, even 0 (no clock-based fallback)', () => {
    expect(createState({ seed: 0 }).seed).toBe(0);
  });
});
