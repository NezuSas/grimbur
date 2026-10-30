import { gameReducer } from '../../src/core/engine/reducer';
import { generateBoard } from '../../src/core/engine/generator';
import { attackChargesFor, getDifficulty, MAX_COLS, MAX_ROWS } from '../../src/core/difficulty/difficulty';
import { OMENS } from '../../src/core/engine/omens';
import { endlessPressure } from '../../src/core/engine/lair';
import { ABILITY_COOLDOWN, ABILITY_COOLDOWNS, abilityCooldown } from '../../src/core/engine/shop';
import { RELICS, RelicId, draftRelics } from '../../src/core/engine/relics';
import { NO_PERKS, HeroPerks, getHeroPerks } from '../../src/core/engine/heroes';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { GameEntity, GameState } from '../../src/core/engine/types';
import { boss, coin, createState, enemy, pit } from '../helpers/state';

const move = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => ({ type: 'MOVE', direction }) as const;
const stalker = (index: number): GameEntity => ({ index, type: 'stalker' });
const sleeper = (index: number): GameEntity => ({ index, type: 'sleeper' });
const count = (entities: readonly GameEntity[], type: string) => entities.filter(e => e.type === type).length;
const withRelics = (s: GameState, ...relics: RelicId[]): GameState => ({ ...s, relics });
const perksWith = (ability: HeroPerks['ability']): HeroPerks => ({ ...NO_PERKS, ability });
const nextFloor = { rows: 6, cols: 9, entities: [coin(30)], coins: 1, attack: 5, seed: 5 };

describe('arrows are a resource', () => {
  it('a floor starts with about 0.7 arrows per guardian plus one', () => {
    expect(attackChargesFor(2)).toBe(3);
    expect(attackChargesFor(14)).toBe(11);
    for (let level = 1; level <= 10; level++) {
      const d = getDifficulty(level);
      expect(d.attackCharges).toBe(attackChargesFor(d.enemies));
      expect(d.attackCharges).toBeLessThanOrEqual(Math.ceil(d.enemies * 1.5));
      if (level >= 3) expect(d.attackCharges).toBeLessThan(Math.ceil(d.enemies * 1.5));
      expect(d.attackCharges).toBeGreaterThanOrEqual(3);
    }
  });

  const levelUp = (leftover: number, relics: RelicId[] = []) =>
    gameReducer({ ...createState(), attack: leftover, relics, isLevelUp: true }, { type: 'LEVEL_UP', payload: nextFloor });

  it('unused arrows carry over to the next floor, up to four', () => {
    expect(levelUp(0).attack).toBe(5);
    expect(levelUp(2).attack).toBe(7);
    expect(levelUp(4).attack).toBe(9);
    expect(levelUp(11).attack).toBe(5 + GAME_CONFIG.arrows.carryOverCap);
  });

  it('the carry-over is added after the curses (they only cut the floor allowance)', () => {
    expect(levelUp(3, ['blood_pact']).attack).toBe(4 + 3);
    expect(levelUp(3, ['glass_bow']).attack).toBe(2 + 3);
    expect(levelUp(0, ['blood_pact']).attack).toBe(4);
  });
});

describe('the vortex has a toll', () => {
  const run = (attack: number, gems: number, seed = 42) => {
    const state = { ...createState({ rows: 5, cols: 8, entities: [pit(1), coin(39)], attack, seed }), gems };
    return gameReducer(state, move('RIGHT'));
  };

  it('costs one arrow when there are arrows (0, 1 and 3 arrows)', () => {
    const three = run(3, 5);
    expect(three.wasTeleported).toBe(true);
    expect(three.attack).toBe(2);
    expect(three.gems).toBe(5);
    expect(three.vortexCost).toBe('arrow');
    expect(run(1, 5).attack).toBe(0);
  });

  it('costs one shop gem when out of arrows, and nothing when there is nothing to take', () => {
    const gem = run(0, 2);
    expect(gem.attack).toBe(0);
    expect(gem.gems).toBe(1);
    expect(gem.vortexCost).toBe('gem');
    const nothing = run(0, 0);
    expect(nothing.attack).toBe(0);
    expect(nothing.gems).toBe(0);
    expect(nothing.vortexCost).toBeNull();
    expect(nothing.isGameOver).toBe(false);
  });

  it('the cost is shown for one move only', () => {
    const after = run(3, 0);
    expect(after.vortexCost).toBe('arrow');
    expect(gameReducer(after, { type: 'ATTACK' }).vortexCost).toBeNull();
  });

  it('usually lands on a new tile but about 30% of the time on one already explored', () => {
    const known = [0, 8, 9, 16, 17, 24, 25];
    let revisits = 0;
    const runs = 400;
    for (let seed = 1; seed <= runs; seed++) {
      const base = createState({ rows: 5, cols: 8, entities: [pit(1), coin(39)], attack: 3, seed });
      const after = gameReducer({ ...base, visited: known }, move('RIGHT'));
      if (known.includes(after.playerIndex)) revisits++;
      // the same state always gives the same destination
      expect(gameReducer({ ...base, visited: known }, move('RIGHT')).playerIndex).toBe(after.playerIndex);
    }
    expect(revisits / runs).toBeGreaterThan(0.2);
    expect(revisits / runs).toBeLessThan(0.4);
  });
});

describe('omens have a price', () => {
  it('the table keeps a benefit and a cost on every omen', () => {
    expect(OMENS.bounty).toMatchObject({ coinDelta: 1, enemyDelta: 1, shopGemEvery: 2, gemMultiplier: 1.5 });
    expect(OMENS.calm).toMatchObject({ enemyDelta: -1, pitDelta: -1, coinDelta: -1 });
    expect(OMENS.arsenal).toMatchObject({ arrowBonus: 2, pitDelta: 1, stalkerDelta: 1 });
  });

  it('bounty adds a gem to the board, calm takes one away (never below two)', () => {
    const d = getDifficulty(5);
    for (let seed = 1; seed <= 20; seed++) {
      expect(generateBoard(5, seed, { omen: 'bounty' }).coins).toBe(d.coins + 1);
      expect(generateBoard(5, seed, { omen: 'calm' }).coins).toBe(d.coins - 1);
      expect(generateBoard(1, seed, { omen: 'calm' }).coins).toBeGreaterThanOrEqual(2);
    }
  });

  it('arsenal brings a stalker from the floor stalkers start, one more guardian before that', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const plain = generateBoard(5, seed);
      expect(count(generateBoard(5, seed, { omen: 'arsenal' }).entities, 'stalker')).toBe(count(plain.entities, 'stalker') + 1);
      expect(count(generateBoard(2, seed, { omen: 'arsenal' }).entities, 'stalker')).toBe(0);
      expect(count(generateBoard(2, seed, { omen: 'arsenal' }).entities, 'enemy')).toBe(count(generateBoard(2, seed).entities, 'enemy') + 1);
    }
  });

  it('bounty pays +50% in the shop too: every second gem gives one more shop gem', () => {
    const base = createState({ entities: [coin(1), coin(2), coin(3), coin(100)], coins: 4 });
    let s: GameState = { ...base, omen: 'bounty' };
    const gained: number[] = [];
    for (const dir of ['RIGHT', 'RIGHT', 'RIGHT'] as const) {
      const before = s.gems;
      s = gameReducer(s, move(dir));
      gained.push(s.gems - before);
    }
    expect(gained).toEqual([1, 2, 1]);
    // a plain floor pays one per gem
    let plain: GameState = base;
    plain = gameReducer(gameReducer(plain, move('RIGHT')), move('RIGHT'));
    expect(plain.gems).toBe(2);
  });
});

describe('relics with a purpose', () => {
  describe('Wayfarer Boots (iron boots)', () => {
    const walk = (relics: RelicId[], steps: number, entities: GameEntity[] = [stalker(60), coin(100)]) => {
      let s = withRelics(createState({ entities, coins: entities.some(e => e.type === 'coin') ? 1 : 0 }), ...relics);
      s = gameReducer(s, move('RIGHT')); // a new tile: the clock ticks
      for (let i = 1; i < steps; i++) s = gameReducer(s, move(i % 2 === 1 ? 'LEFT' : 'RIGHT')); // explored ground
      return s;
    };

    it('retracing explored tiles does not advance the hunters', () => {
      const boots = walk(['iron_boots'], 12);
      expect(boots.turn).toBe(1);
      expect(boots.entityMap[60]?.type).toBe('stalker'); // it never got a turn
      const plain = walk([], 12);
      expect(plain.turn).toBe(12);
      expect(plain.entityMap[60]).toBeUndefined(); // it walked toward the player
    });

    it('new tiles still advance the clocks, and walking stays free', () => {
      let s = withRelics({ ...createState({ entities: [stalker(60), coin(100)], coins: 1 }), score: 100 }, 'iron_boots');
      s = gameReducer(s, move('DOWN'));
      s = gameReducer(s, move('DOWN'));
      expect(s.turn).toBe(2);
      expect(s.score).toBe(100 + 2 * GAME_CONFIG.scoring.newTile);
    });

    it('does nothing in the Grimbur lair', () => {
      const s = walk(['iron_boots'], 6, [boss(110)]);
      expect(s.turn).toBe(6);
    });
  });

  describe('Lucky Coin', () => {
    const gemsAfterOne = (seed: number, stacks: number) => {
      const s = withRelics(createState({ entities: [coin(1), coin(100)], coins: 2, seed }), ...(Array(stacks).fill('lucky_coin') as RelicId[]));
      return gameReducer(s, move('RIGHT')).gems;
    };

    it('gives a shop gem 20% of the time per stack, decided by the seed', () => {
      const runs = 500;
      let one = 0;
      let three = 0;
      for (let seed = 1; seed <= runs; seed++) {
        if (gemsAfterOne(seed, 1) === 2) one++;
        if (gemsAfterOne(seed, 3) === 2) three++;
        expect(gemsAfterOne(seed, 1)).toBe(gemsAfterOne(seed, 1));
      }
      expect(one / runs).toBeGreaterThan(0.12);
      expect(one / runs).toBeLessThan(0.28);
      expect(three / runs).toBeGreaterThan(0.5);
      expect(three / runs).toBeLessThan(0.7);
    });

    it('never touches the purse without the relic', () => {
      for (let seed = 1; seed <= 50; seed++) expect(gemsAfterOne(seed, 0)).toBe(1);
    });
  });

  describe("Hunter's Mark", () => {
    it('every guardian shot drops one shop gem', () => {
      const s = createState({ entities: [enemy(1), coin(100)], coins: 1 });
      expect(gameReducer(s, { type: 'ATTACK' }).gems).toBe(0);
      expect(gameReducer(withRelics(s, 'hunter'), { type: 'ATTACK' }).gems).toBe(1);
    });

    it('also pays for the guardians of a volley', () => {
      const s = withRelics(createState({ entities: [enemy(1), enemy(3), coin(100)], coins: 1, perks: perksWith('volley') }), 'hunter');
      expect(gameReducer(s, { type: 'USE_ABILITY' }).gems).toBe(2);
    });
  });

  describe('Dragon Hoard', () => {
    const clear = (relics: RelicId[]) => gameReducer(withRelics(createState({ entities: [coin(1)], coins: 1 }), ...relics), move('RIGHT'));

    it('clearing the floor gives one shop gem per stack on top of the gem itself', () => {
      expect(clear([]).gems).toBe(1);
      expect(clear(['greed']).gems).toBe(2);
      expect(clear(['greed', 'greed']).gems).toBe(3);
      expect(clear(['greed']).isLevelUp).toBe(true);
    });

    it('also when the last gem is pulled by the Magnet', () => {
      const s = withRelics(createState({ entities: [coin(100)], coins: 1, perks: perksWith('magnet') }), 'greed');
      const after = gameReducer(s, { type: 'USE_ABILITY' });
      expect(after.isLevelUp).toBe(true);
      expect(after.gems).toBe(2);
    });
  });

  it('descriptions tell what the relics really do', () => {
    expect(RELICS.lucky_coin.description).toMatch(/shop gem/);
    expect(RELICS.hunter.description).toMatch(/shop gem/);
    expect(RELICS.greed.description).toMatch(/shop gem/);
    expect(RELICS.iron_boots.description).toMatch(/explored/);
    expect(RELICS.frost.description).toMatch(/stalkers/);
  });
});

describe('drafts skip dead relics', () => {
  it('never offers the Bulwark to a hero that already starts with a shield', () => {
    for (let seed = 1; seed <= 150; seed++) {
      for (let floor = 1; floor <= 9; floor++) {
        expect(draftRelics(seed, floor, [], 5, { startShield: true })).not.toContain('bulwark');
        expect(draftRelics(seed, floor, [], 5, { trapImmune: true })).not.toContain('trap_sense');
      }
    }
  });

  it('still offers them to everyone else', () => {
    const seen = new Set<RelicId>();
    for (let seed = 1; seed <= 100; seed++) draftRelics(seed, 2, [], 5).forEach(id => seen.add(id));
    expect(seen.has('bulwark')).toBe(true);
    expect(seen.has('trap_sense')).toBe(true);
  });

  it('the reducer passes the hero in, so Borin and Vael never see them', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const borin = gameReducer({ ...createState({ perks: getHeroPerks(2) }), runSeed: seed, isLevelUp: true }, { type: 'LEVEL_UP', payload: nextFloor });
      expect(borin.pendingDraft).not.toContain('bulwark');
      const vael = gameReducer({ ...createState({ perks: getHeroPerks(0) }), runSeed: seed, isLevelUp: true }, { type: 'LEVEL_UP', payload: nextFloor });
      expect(vael.pendingDraft).not.toContain('trap_sense');
    }
  });
});

describe('abilities', () => {
  it('Brace and Magnet recharge more slowly than Scout and Volley', () => {
    expect(ABILITY_COOLDOWNS.brace).toBeGreaterThan(ABILITY_COOLDOWN);
    expect(ABILITY_COOLDOWNS.magnet).toBeGreaterThan(ABILITY_COOLDOWN);
    expect(abilityCooldown('scout')).toBe(ABILITY_COOLDOWN);
    expect(abilityCooldown(null)).toBe(ABILITY_COOLDOWN);
    const magnet = gameReducer(createState({ entities: [coin(100), coin(101)], coins: 2, perks: perksWith('magnet') }), { type: 'USE_ABILITY' });
    expect(magnet.abilityCd).toBe(ABILITY_COOLDOWNS.magnet);
  });

  describe('Scout', () => {
    it('reveals a tile the player could not already deduce, even if a nearer one is known to be safe', () => {
      // Tile 8 is proven safe by the clue at 0, tile 2 is not (the clue at 1 sees a vortex at 9 or 2).
      const base = createState({ rows: 5, cols: 8, entities: [pit(9), coin(39)], perks: perksWith('scout') });
      const s = gameReducer({ ...base, visited: [0, 1] }, { type: 'USE_ABILITY' });
      expect(s.visited).toContain(2);
      expect(s.visited).not.toContain(8);
      expect(s.abilityCd).toBe(ABILITY_COOLDOWNS.scout);
    });

    it('never reveals a hazard, and falls back to a known tile when everything is deducible', () => {
      const base = createState({ rows: 5, cols: 8, entities: [enemy(1), coin(39)], perks: perksWith('scout') });
      const s = gameReducer(base, { type: 'USE_ABILITY' });
      expect(s.visited).toContain(8);
      expect(s.visited).not.toContain(1);

      const open = createState({ rows: 5, cols: 8, entities: [coin(39)], perks: perksWith('scout') });
      const r = gameReducer(open, { type: 'USE_ABILITY' });
      expect(r.visited.length).toBe(2);
    });
  });
});

describe('the first close call arrives around floor 3', () => {
  const stalkerShare = (level: number) => {
    let withOne = 0;
    const runs = 300;
    for (let seed = 1; seed <= runs; seed++) {
      const n = count(generateBoard(level, seed * 31).entities, 'stalker');
      expect(n).toBeLessThanOrEqual(1);
      if (n === 1) withOne++;
    }
    return withOne / runs;
  };

  it('floors 3 to 5 get a single stalker about half of the time, never before and not on 6', () => {
    expect(stalkerShare(1)).toBe(0);
    expect(stalkerShare(2)).toBe(0);
    expect(stalkerShare(3)).toBeGreaterThan(0.38);
    expect(stalkerShare(3)).toBeLessThan(0.62);
    expect(stalkerShare(4)).toBeGreaterThan(0.38);
    expect(stalkerShare(4)).toBeLessThan(0.62);
    expect(stalkerShare(5)).toBeGreaterThan(0.38);
    expect(stalkerShare(5)).toBeLessThan(0.62);
    expect(stalkerShare(6)).toBe(0);
  });

  it('is decided by the floor seed, so a cave always has the same hunters', () => {
    for (let seed = 1; seed <= 40; seed++) {
      expect(generateBoard(4, seed).entities).toEqual(generateBoard(4, seed).entities);
    }
  });

  it('floor 3 is denser than it used to be (about 15%)', () => {
    const d = getDifficulty(3);
    expect((d.enemies + d.pits) / (d.rows * d.cols)).toBeGreaterThanOrEqual(0.14);
  });
});

describe('the Grimbur lair is a fight, not a minefield', () => {
  it('keeps the guardians and vortexes of the lair low', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const board = generateBoard(GAME_CONFIG.expedition.floors, seed * 53, { boss: true });
      expect(count(board.entities, 'enemy') + count(board.entities, 'sleeper')).toBeLessThanOrEqual(GAME_CONFIG.boss.lairGuardians);
      expect(count(board.entities, 'pit')).toBeLessThanOrEqual(GAME_CONFIG.boss.lairPits);
      expect(count(board.entities, 'stalker')).toBeLessThanOrEqual(1);
    }
  });

  it('keeps enough arrows for the guardians and three hearts', () => {
    const board = generateBoard(GAME_CONFIG.expedition.floors, 3, { boss: true });
    expect(board.attack).toBeGreaterThanOrEqual(GAME_CONFIG.boss.hp + count(board.entities, 'enemy'));
  });

  const bossIdx = (s: GameState) => s.entities.find(e => e.type === 'boss')!.index;

  it('with one heart left the Grimbur acts after every action (fury)', () => {
    const calm = gameReducer(createState({ entities: [boss(60, 2)], coins: 0 }), move('RIGHT'));
    expect(bossIdx(calm)).toBe(60); // hp 2 waits for its second action
    const furious = gameReducer(createState({ entities: [boss(60, 1)], coins: 0 }), move('RIGHT'));
    expect(bossIdx(furious)).not.toBe(60);
  });

  it('the Frost Charm still slows a furious Grimbur', () => {
    const s = withRelics(createState({ entities: [boss(60, 1)], coins: 0 }), 'frost');
    expect(bossIdx(gameReducer(s, move('RIGHT')))).toBe(60);
  });

  it('a wounded Grimbur sometimes calls a stalker beside itself, at most twice per fight', () => {
    let called = 0;
    const runs = 120;
    for (let seed = 1; seed <= runs; seed++) {
      let s: GameState = { ...createState({ rows: 8, cols: 15, entities: [boss(1, 3)], coins: 0, attack: 9, seed }), shield: true };
      s = gameReducer(s, { type: 'ATTACK' });
      if (count(s.entities, 'stalker') > 0) {
        called++;
        const st = s.entities.find(e => e.type === 'stalker')!;
        expect([2, 16]).toContain(st.index); // beside the Grimbur, not on the player
        for (const e of s.entities) expect(s.entityMap[e.index]).toBe(e);
      }
      s = gameReducer(s, { type: 'ATTACK' });
      expect(count(s.entities, 'stalker')).toBeLessThanOrEqual(GAME_CONFIG.boss.maxCalls);
      expect(s.isGameOver).toBe(false);
    }
    expect(called).toBeGreaterThan(runs * 0.3);
    expect(called).toBeLessThan(runs * 0.7);
  });
});

describe('sleepers wake whatever the action', () => {
  it('a hit soaked by a shield no longer leaves a sleeper two tiles away asleep', () => {
    const s = { ...createState({ entities: [enemy(1), sleeper(3), coin(100)], coins: 1 }), shield: true };
    const after = gameReducer(s, move('RIGHT'));
    expect(after.isGameOver).toBe(false);
    expect(after.entityMap[3].type).toBe('stalker');
  });

  it('shooting next to a sleeper wakes it', () => {
    const s = createState({ entities: [sleeper(2), coin(100)], coins: 1 });
    const after = gameReducer({ ...s, facingDir: 'DOWN' }, { type: 'ATTACK' });
    expect(after.entityMap[2].type).toBe('stalker');
  });

  it('a bomb or an ability used near a sleeper wakes it', () => {
    const s = { ...createState({ entities: [sleeper(2), coin(100)], coins: 1, perks: perksWith('brace') }), items: { detector: 0, bomb: 1 } };
    expect(gameReducer(s, { type: 'USE_ITEM', item: 'bomb' }).entityMap[2].type).toBe('stalker'); // outside the 3x3
    expect(gameReducer(s, { type: 'USE_ABILITY' }).entityMap[2].type).toBe('stalker');
  });

  it('a sleeper far away keeps sleeping', () => {
    const s = createState({ entities: [sleeper(60), coin(100)], coins: 1 });
    expect(gameReducer({ ...s, facingDir: 'DOWN' }, { type: 'ATTACK' }).entityMap[60].type).toBe('sleeper');
  });
});

describe('the endless descent gets denser, not longer', () => {
  it('pressure only grows and respects its caps', () => {
    let prev = endlessPressure(1);
    for (let level = 2; level <= 120; level++) {
      const p = endlessPressure(level);
      expect(p.enemies).toBeGreaterThanOrEqual(prev.enemies);
      expect(p.pits).toBeGreaterThanOrEqual(prev.pits);
      expect(p.stalkers).toBeGreaterThanOrEqual(prev.stalkers);
      prev = p;
    }
    expect(endlessPressure(10)).toEqual({ enemies: 0, pits: 0, stalkers: 0 });
    expect(endlessPressure(15).stalkers).toBe(1);
    expect(endlessPressure(20).stalkers).toBe(2);
    expect(endlessPressure(30).stalkers).toBe(3);
    expect(endlessPressure(500)).toEqual({ enemies: 3, pits: 2, stalkers: 3 });
  });

  it('boards stop growing at 8x13 and stalkers cap at five', () => {
    const density = (level: number) => {
      let total = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const b = generateBoard(level, seed * 11, { endless: true });
        expect(b.rows).toBeLessThanOrEqual(MAX_ROWS);
        expect(b.cols).toBeLessThanOrEqual(MAX_COLS);
        expect(count(b.entities, 'stalker')).toBeLessThanOrEqual(GAME_CONFIG.stalker.maxPerFloor);
        total += (count(b.entities, 'enemy') + count(b.entities, 'sleeper') + count(b.entities, 'pit')) / (b.rows * b.cols);
      }
      return total / 40;
    };
    expect(density(30)).toBeGreaterThan(density(11));
    expect(density(30)).toBeGreaterThan(0.25);
    expect(density(30)).toBeLessThan(0.32);
    expect(count(generateBoard(80, 7, { endless: true, omen: 'arsenal' }).entities, 'stalker')).toBeLessThanOrEqual(5);
  });
});
