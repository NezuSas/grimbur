import { gameReducer } from '../../src/core/engine/reducer';
import { generateBoard } from '../../src/core/engine/generator';
import { NO_PERKS, HeroPerks } from '../../src/core/engine/heroes';
import { forkDoors, SHOP_PRICES, SHOP_ARROWS, MAX_ITEMS, ABILITY_COOLDOWNS } from '../../src/core/engine/shop';
import { biomeFor, isNewBiome } from '../../src/core/engine/biomes';
import { draftRelics, RELICS, CURSED_RELICS, RelicId } from '../../src/core/engine/relics';
import { isLairFloor } from '../../src/core/engine/lair';
import { GameState } from '../../src/core/engine/types';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { coin, createState, enemy, boss, pit } from '../helpers/state';

const move = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => ({ type: 'MOVE', direction }) as const;
const perksWith = (ability: HeroPerks['ability']): HeroPerks => ({ ...NO_PERKS, ability });
const withRelics = (s: GameState, ...relics: RelicId[]): GameState => ({ ...s, relics });
const cleared = (gems?: number): GameState => {
  const s = gameReducer(createState({ entities: [coin(1)], coins: 1 }), move('RIGHT'));
  return gems === undefined ? s : { ...s, gems };
};
const nextFloor = { rows: 8, cols: 15, entities: [coin(100)], coins: 1, attack: 3 };

describe('gems and the shop', () => {
  it('collecting a gem adds one gem to the purse (two with the Greedy Idol)', () => {
    const s = gameReducer(createState({ entities: [coin(1), coin(100)], coins: 2 }), move('RIGHT'));
    expect(s.gems).toBe(1);
    const idol = gameReducer(withRelics(createState({ entities: [coin(1), coin(100)], coins: 2 }), 'greedy_idol'), move('RIGHT'));
    expect(idol.gems).toBe(2);
  });

  it('clearing the floor opens the intermission and keeps the purse', () => {
    const s = cleared();
    expect(s.isLevelUp).toBe(true);
    expect(s.gems).toBe(1);
  });

  it('cannot buy while a floor is being played, or without enough gems', () => {
    const playing = { ...createState(), gems: 99 };
    expect(gameReducer(playing, { type: 'BUY', item: 'arrows' })).toBe(playing);
    const poor = cleared(SHOP_PRICES.arrows - 1);
    expect(gameReducer(poor, { type: 'BUY', item: 'arrows' })).toBe(poor);
  });

  it('bought arrows arrive on the next floor and are not halved by the Glass Bow', () => {
    let s = cleared(20);
    s = gameReducer(s, { type: 'BUY', item: 'arrows' });
    expect(s.gems).toBe(20 - SHOP_PRICES.arrows);
    expect(s.pendingArrows).toBe(SHOP_ARROWS);
    const next = gameReducer({ ...s, attack: 0, relics: ['glass_bow'], pendingDraft: null }, { type: 'LEVEL_UP', payload: { ...nextFloor, attack: 4 } });
    expect(next.attack).toBe(2 + SHOP_ARROWS);
    expect(next.pendingArrows).toBe(0);
  });

  it('a shield can be bought once and only when there is none', () => {
    let s = cleared(20);
    s = gameReducer(s, { type: 'BUY', item: 'shield' });
    expect(s.shield).toBe(true);
    const again = gameReducer(s, { type: 'BUY', item: 'shield' });
    expect(again.gems).toBe(s.gems);
  });

  it('items stack up to the bag limit', () => {
    let s = cleared(100);
    for (let i = 0; i < MAX_ITEMS + 2; i++) s = gameReducer(s, { type: 'BUY', item: 'bomb' });
    expect(s.items.bomb).toBe(MAX_ITEMS);
    expect(s.gems).toBe(100 - MAX_ITEMS * SHOP_PRICES.bomb);
  });

  it('the altar trades the shield for a second relic pick', () => {
    let s = { ...cleared(), shield: true };
    s = gameReducer(s, { type: 'ALTAR' });
    expect(s.shield).toBe(false);
    expect(s.altarPending).toBe(true);
    expect(gameReducer({ ...s, shield: true }, { type: 'ALTAR' }).altarPending).toBe(true); // used once
    s = gameReducer(s, { type: 'LEVEL_UP', payload: nextFloor });
    expect(s.pendingDraft).not.toBeNull();
    const first = s.pendingDraft![0];
    s = gameReducer(s, { type: 'PICK_RELIC', id: first });
    expect(s.pendingDraft).not.toBeNull(); // the altar's second draft
    s = gameReducer(s, { type: 'PICK_RELIC', id: s.pendingDraft![0] });
    expect(s.pendingDraft).toBeNull();
    expect(s.relics).toHaveLength(2);
  });

  it('the altar needs a shield', () => {
    const s = cleared();
    expect(gameReducer(s, { type: 'ALTAR' })).toBe(s);
  });
});

describe('the fork', () => {
  it('offers two different doors, always the same ones for a run and floor', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const doors = forkDoors(seed, 4, 'expedition');
      expect(doors).not.toBeNull();
      expect(doors![0]).not.toBe(doors![1]);
      expect(forkDoors(seed, 4, 'expedition')).toEqual(doors);
    }
  });

  it('has no fork on the first floor, before the lair, in the daily, or past the last floor', () => {
    expect(forkDoors(5, 1, 'expedition')).toBeNull();
    expect(isLairFloor('expedition', GAME_CONFIG.expedition.floors)).toBe(true);
    expect(forkDoors(5, GAME_CONFIG.expedition.floors, 'expedition')).toBeNull();
    expect(forkDoors(5, 4, 'daily')).toBeNull();
    expect(forkDoors(5, 14, 'expedition')).toBeNull();
    expect(forkDoors(5, 14, 'endless')).not.toBeNull();
  });

  it('the chosen omen becomes the omen of the floor', () => {
    const s = gameReducer(cleared(), { type: 'LEVEL_UP', payload: { ...nextFloor, omen: 'calm' } });
    expect(s.omen).toBe('calm');
  });
});

describe('hero abilities', () => {
  it('only a hero with an ability can use it, and it has to be ready', () => {
    const plain = createState();
    expect(gameReducer(plain, { type: 'USE_ABILITY' })).toBe(plain);
  });

  it('Borin braces: a shield, then the cooldown', () => {
    const s0 = createState({ perks: perksWith('brace'), entities: [coin(100)] });
    const s1 = gameReducer(s0, { type: 'USE_ABILITY' });
    expect(s1.shield).toBe(true);
    expect(s1.abilityCd).toBe(ABILITY_COOLDOWNS.brace);
    expect(s1.turn).toBe(1);
    expect(gameReducer({ ...s1, shield: false }, { type: 'USE_ABILITY' }).shield).toBe(false); // still recharging
  });

  it('the cooldown counts down with every action and the ability is ready again', () => {
    let s = gameReducer(createState({ perks: perksWith('brace'), entities: [coin(100)] }), { type: 'USE_ABILITY' });
    s = { ...s, shield: false };
    for (let i = 0; i < ABILITY_COOLDOWNS.brace; i++) s = gameReducer(s, move(i % 2 === 0 ? 'RIGHT' : 'LEFT'));
    expect(s.abilityCd).toBe(0);
    expect(gameReducer(s, { type: 'USE_ABILITY' }).shield).toBe(true);
  });

  it('Vael scouts a safe unexplored tile without moving', () => {
    const s0 = createState({ perks: perksWith('scout'), entities: [coin(100), pit(1)] });
    const s1 = gameReducer(s0, { type: 'USE_ABILITY' });
    expect(s1.playerIndex).toBe(0);
    expect(s1.visited).toHaveLength(2);
    expect(s1.visited).toContain(15); // the vortex at 1 is never revealed
  });

  it('Auric pulls in the nearest gem and clears the floor with the last one', () => {
    const s0 = createState({ perks: perksWith('magnet'), entities: [coin(30), coin(100)], coins: 2 });
    const s1 = gameReducer(s0, { type: 'USE_ABILITY' });
    expect(s1.coins).toBe(1);
    expect(s1.gems).toBe(1);
    expect(s1.entityMap[30]).toBeUndefined();
    expect(s1.entityMap[100]).toBeDefined();
    const last = gameReducer(createState({ perks: perksWith('magnet'), entities: [coin(100)], coins: 1 }), { type: 'USE_ABILITY' });
    expect(last.isLevelUp).toBe(true);
  });

  it('Sera fires a free volley that hits two guardians in line and costs no arrow', () => {
    const s0 = createState({ perks: perksWith('volley'), entities: [enemy(2), enemy(4), enemy(5), coin(100)], coins: 1, attack: 2 });
    const s1 = gameReducer(s0, { type: 'USE_ABILITY' });
    expect(s1.entityMap[2]).toBeUndefined();
    expect(s1.entityMap[4]).toBeUndefined();
    expect(s1.entityMap[5]).toBeDefined(); // a third one is out of the volley
    expect(s1.attack).toBe(2);
    expect(s1.score).toBeGreaterThan(s0.score);
  });

  it('a volley only takes one heart off the Grimbur and stops there', () => {
    const s0 = createState({ perks: perksWith('volley'), entities: [boss(3, 3), enemy(4)], coins: 0 });
    const s1 = gameReducer(s0, { type: 'USE_ABILITY' });
    expect(s1.entityMap[3].hp).toBe(2);
    expect(s1.entityMap[4]).toBeDefined();
  });
});

describe('one-use items', () => {
  it('the detector marks hostile tiles within two steps and takes no turn', () => {
    const s0 = { ...createState({ entities: [pit(1), enemy(17), pit(40), coin(100)], coins: 1 }), items: { detector: 1, bomb: 0 } };
    const s1 = gameReducer(s0, { type: 'USE_ITEM', item: 'detector' });
    expect(s1.marked.sort((a, b) => a - b)).toEqual([1]); // 17 is 3 away, 40 farther
    expect(s1.items.detector).toBe(0);
    expect(s1.turn).toBe(0);
    expect(gameReducer(s1, { type: 'USE_ITEM', item: 'detector' })).toBe(s1); // none left
  });

  it('the bomb clears guardians and vortexes around the hero but not the Grimbur', () => {
    const s0 = { ...createState({ entities: [enemy(1), pit(15), pit(2), boss(16, 3), coin(100)], coins: 0 }), items: { detector: 0, bomb: 1 } };
    const s1 = gameReducer(s0, { type: 'USE_ITEM', item: 'bomb' });
    expect(s1.entityMap[1]).toBeUndefined();
    expect(s1.entityMap[15]).toBeUndefined();
    expect(s1.entityMap[2]).toBeDefined(); // two tiles away
    expect(s1.entityMap[16]).toBeDefined();
    expect(s1.items.bomb).toBe(0);
  });
});

describe('the sleeper', () => {
  const sleeper = (index: number) => ({ index, type: 'sleeper' as const });

  it('kills like a guardian and a shield breaks on it', () => {
    const dead = gameReducer(createState({ entities: [sleeper(1), coin(100)], coins: 1 }), move('RIGHT'));
    expect(dead.isGameOver).toBe(true);
    expect(dead.deathCause).toBe('sleeper');
    const saved = gameReducer({ ...createState({ entities: [sleeper(1), coin(100)], coins: 1 }), shield: true }, move('RIGHT'));
    expect(saved.isGameOver).toBe(false);
    expect(saved.entityMap[1]).toBeUndefined();
  });

  it('can be shot', () => {
    const s = gameReducer({ ...createState({ entities: [sleeper(1), coin(100)], coins: 1 }), facingDir: 'RIGHT' }, { type: 'ATTACK' });
    expect(s.entityMap[1]).toBeUndefined();
  });

  it('wakes into a stalker when the hero comes within two tiles, and not before', () => {
    const far = gameReducer(createState({ entities: [sleeper(4), coin(100)], coins: 1 }), move('RIGHT'));
    expect(far.entityMap[4].type).toBe('sleeper'); // three tiles away
    const near = gameReducer(far, move('RIGHT'));
    expect(near.entityMap[4].type).toBe('stalker');
  });

  it('boards from the sixth floor carry a sleeper and stay solvable', () => {
    let withSleeper = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const board = generateBoard(6, seed * 13);
      if (board.entities.some(e => e.type === 'sleeper')) withSleeper++;
      const gems = board.entities.filter(e => e.type === 'coin').length;
      expect(board.coins).toBe(gems);
    }
    expect(withSleeper).toBeGreaterThan(15);
    expect(generateBoard(3, 99).entities.some(e => e.type === 'sleeper')).toBe(false);
  });
});

describe('biomes', () => {
  it('change every three floors and the lair keeps its own', () => {
    expect([1, 3, 4, 6, 7, 9, 10].map(l => biomeFor(l))).toEqual(['cave', 'cave', 'crystal', 'crystal', 'magma', 'magma', 'lair']);
    expect(biomeFor(11, 'endless')).toBe('cave');
    expect(biomeFor(20, 'endless')).toBe('lair');
    expect(isNewBiome(4)).toBe(true);
    expect(isNewBiome(5)).toBe(false);
    expect(isNewBiome(1)).toBe(false);
  });

  it('crystal floors carry one more shield and magma floors one more arrow pickup', () => {
    const count = (type: string, biome: 'cave' | 'crystal' | 'magma') =>
      generateBoard(6, 77, { biome }).entities.filter(e => e.type === type).length;
    expect(count('shield', 'crystal')).toBe(count('shield', 'cave') + 1);
    expect(count('ammo', 'magma')).toBe(count('ammo', 'cave') + 1);
  });
});

describe('cursed relics', () => {
  it('are in the relic list, flagged as cursed, with a description', () => {
    expect(CURSED_RELICS.length).toBe(4);
    for (const id of CURSED_RELICS) expect(RELICS[id].description.length).toBeGreaterThan(10);
  });

  it('show up in some drafts from the third floor, never before, never twice and never together', () => {
    let seen = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const draft = draftRelics(seed, 5, []);
      const cursed = draft.filter(id => RELICS[id].cursed);
      expect(cursed.length).toBeLessThanOrEqual(1);
      if (cursed.length) seen++;
      expect(draftRelics(seed, 5, [])).toEqual(draft); // deterministic
      expect(draftRelics(seed, 2, []).some(id => RELICS[id].cursed)).toBe(false);
      expect(draftRelics(seed, 5, ['glass_bow']).some(id => RELICS[id].cursed)).toBe(false);
    }
    expect(seen).toBeGreaterThan(40);
    expect(seen).toBeLessThan(120);
  });

  it('Blood Pact pays gems more and costs an arrow each floor (at least one)', () => {
    const base = gameReducer(createState({ entities: [coin(1), coin(100)], coins: 2 }), move('RIGHT'));
    const pact = gameReducer(withRelics(createState({ entities: [coin(1), coin(100)], coins: 2 }), 'blood_pact'), move('RIGHT'));
    expect(pact.score).toBeGreaterThan(base.score);
    const lvl = (s: GameState, attack: number) => gameReducer({ ...s, attack: 0, isLevelUp: true, pendingDraft: null }, { type: 'LEVEL_UP', payload: { ...nextFloor, attack } });
    expect(lvl(withRelics(createState(), 'blood_pact'), 4).attack).toBe(3);
    expect(lvl(withRelics(createState(), 'blood_pact'), 1).attack).toBe(1);
  });

  it('Hasty Boots triple the exploration bonus and make hunters act sooner', () => {
    const plain = gameReducer(createState({ entities: [coin(100)] }), move('RIGHT'));
    const boots = gameReducer(withRelics(createState({ entities: [coin(100)] }), 'hasty_boots'), move('RIGHT'));
    expect(boots.score - plain.score).toBe(GAME_CONFIG.scoring.newTile * 2);
    // A stalker normally waits EVERY actions; in boots it acts one action sooner.
    const EVERY = GAME_CONFIG.stalker.moveEvery;
    const run = (relics: RelicId[]) => {
      let s = withRelics(createState({ entities: [{ index: 60, type: 'stalker' }, coin(100)], coins: 1 }), ...relics);
      for (let i = 0; i < EVERY - 1; i++) s = gameReducer(s, move(i % 2 === 0 ? 'RIGHT' : 'LEFT'));
      return s.entities.find(e => e.type === 'stalker')!.index;
    };
    expect(run([])).toBe(60);
    expect(run(['hasty_boots'])).not.toBe(60);
  });

  it('Glass Bow flies two tiles farther but halves the arrows', () => {
    const s = withRelics(createState({ entities: [enemy(3), coin(100)], coins: 1 }), 'glass_bow');
    expect(gameReducer(s, { type: 'ATTACK' }).entityMap[3]).toBeUndefined(); // reach 1 + 2
    const lvl = gameReducer({ ...s, attack: 0, isLevelUp: true, pendingDraft: null }, { type: 'LEVEL_UP', payload: { ...nextFloor, attack: 5 } });
    expect(lvl.attack).toBe(2);
  });

  it('the Greedy Idol adds vortexes to the next floors through the generator', () => {
    const plain = generateBoard(6, 31).entities.filter(e => e.type === 'pit').length;
    const idol = generateBoard(6, 31, { extraPits: 2 }).entities.filter(e => e.type === 'pit').length;
    expect(idol).toBeGreaterThanOrEqual(plain);
  });
});

describe('undo', () => {
  it('takes back the last step once per floor', () => {
    const s0 = createState({ entities: [coin(100)] });
    const s1 = gameReducer(s0, move('RIGHT'));
    expect(s1.undo).not.toBeNull();
    const s2 = gameReducer(s1, { type: 'UNDO' });
    expect(s2.playerIndex).toBe(0);
    expect(s2.score).toBe(s0.score);
    expect(s2.turn).toBe(0);
    expect(s2.undoUsed).toBe(true);
    const s3 = gameReducer(s2, move('RIGHT'));
    expect(s3.undo).toBeNull(); // used for this floor
    expect(gameReducer(s3, { type: 'UNDO' })).toBe(s3);
  });

  it('is gone after a shot or an ability, and never available after death or a cleared floor', () => {
    const moved = gameReducer(createState({ entities: [coin(100), enemy(2)] }), move('RIGHT'));
    expect(gameReducer(moved, { type: 'ATTACK' }).undo).toBeNull();
    const dead = gameReducer(moved, move('RIGHT'));
    expect(dead.isGameOver).toBe(true);
    expect(dead.undo).toBeNull();
    expect(cleared().undo).toBeNull();
  });

  it('comes back on the next floor', () => {
    const used = { ...gameReducer(gameReducer(createState({ entities: [coin(100)] }), move('RIGHT')), { type: 'UNDO' }) };
    const next = gameReducer({ ...used, isLevelUp: true, pendingDraft: null }, { type: 'LEVEL_UP', payload: nextFloor });
    expect(next.undoUsed).toBe(false);
  });
});
