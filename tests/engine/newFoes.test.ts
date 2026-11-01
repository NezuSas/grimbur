import { gameReducer } from '../../src/core/engine/reducer';
import { generateBoard, MID_BOSS_FLOOR, MID_BOSS_HP } from '../../src/core/engine/generator';
import { forkDoors } from '../../src/core/engine/shop';
import { huntersAct, THIEF_EVERY } from '../../src/core/engine/worldHelpers';
import { chestRelic, RELICS } from '../../src/core/engine/relics';
import { isClueHazard, type GameEntity } from '../../src/core/engine/types';
import { createEntityMap } from '../../src/core/engine/worldHelpers';
import { coin, createState, pit } from '../helpers/state';

const mimic = (index: number): GameEntity => ({ index, type: 'mimic' });
const thief = (index: number, loot = 0): GameEntity => ({ index, type: 'thief', loot });
const chest = (index: number): GameEntity => ({ index, type: 'chest' });

describe('the mimic', () => {
  it('counts in the clues, kills on contact and falls to an arrow', () => {
    expect(isClueHazard('mimic')).toBe(true);
    const s = createState({ entities: [coin(100), mimic(1)] });
    const dead = gameReducer(s, { type: 'MOVE', direction: 'RIGHT' });
    expect(dead.isGameOver).toBe(true);
    expect(dead.deathCause).toBe('mimic');
    const shot = gameReducer(s, { type: 'ATTACK', direction: 'RIGHT' });
    expect(shot.entityMap[1]).toBeUndefined();
  });

  it('is never the gem the hero has to collect', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const b = generateBoard(7, seed);
      expect(b.coins).toBe(b.entities.filter(e => e.type === 'coin').length);
    }
  });

  it('shows up on some deeper floors', () => {
    let seen = 0;
    for (let seed = 1; seed <= 80; seed++) if (generateBoard(6, seed).entities.some(e => e.type === 'mimic')) seen++;
    expect(seen).toBeGreaterThan(10);
  });
});

describe('the thief', () => {
  it('runs for the nearest gem and steals it', () => {
    // 15 columns: the thief at row 2 col 1, a gem two tiles to its right.
    const s = createState({ entities: [coin(100), coin(33), thief(31)] });
    let world = { entities: s.entities, entityMap: s.entityMap };
    for (let turn = THIEF_EVERY; turn <= THIEF_EVERY * 2; turn += THIEF_EVERY) world = huntersAct(world, 0, s.rows, s.cols, turn, 0).world;
    const t = world.entities.find(e => e.type === 'thief')!;
    expect(t.index).toBe(33);
    expect(t.loot).toBe(1);
    expect(world.entities.some(e => e.index === 33 && e.type === 'coin')).toBe(false);
  });

  it('flees from a hero close by', () => {
    const s = createState({ entities: [coin(100), thief(2)] });
    const world = huntersAct({ entities: s.entities, entityMap: s.entityMap }, 0, s.rows, s.cols, THIEF_EVERY, 0).world;
    const to = world.entities.find(e => e.type === 'thief')!.index;
    expect(Math.floor(to / s.cols) + (to % s.cols)).toBeGreaterThan(2);
  });

  it('gives back its loot when caught, and the last gem clears the floor', () => {
    const s = { ...createState({ entities: [thief(1, 1)], coins: 1 }), coins: 1 };
    const caught = gameReducer(s, { type: 'MOVE', direction: 'RIGHT' });
    expect(caught.isGameOver).toBe(false);
    expect(caught.coins).toBe(0);
    expect(caught.totalCoins).toBe(s.totalCoins + 1);
    expect(caught.isLevelUp).toBe(true);
  });

  it('drops its loot when shot', () => {
    const s = { ...createState({ entities: [coin(100), thief(1, 2)] }), coins: 3 };
    const shot = gameReducer(s, { type: 'ATTACK', direction: 'RIGHT' });
    expect(shot.entities.some(e => e.type === 'thief')).toBe(false);
    expect(shot.coins).toBe(1);
  });
});

describe("the Grimbur's lieutenant", () => {
  it('guards the middle floor with fewer hearts and does not end the run', () => {
    const b = generateBoard(MID_BOSS_FLOOR, 77, { midBoss: true });
    const boss = b.entities.find(e => e.type === 'boss')!;
    expect(boss.mini).toBe(true);
    expect(boss.hp).toBe(MID_BOSS_HP);

    const s = createState({ entities: [{ index: 1, type: 'boss', hp: 1, mini: true }], coins: 0 });
    const won = gameReducer({ ...s, coins: 0 }, { type: 'ATTACK', direction: 'RIGHT' });
    expect(won.isLevelUp).toBe(true);
    expect(won.isVictory).toBe(false);
    expect(won.gems).toBeGreaterThan(s.gems);
  });

  it('is named as the killer', () => {
    const s = createState({ entities: [coin(100), { index: 1, type: 'boss', hp: 2, mini: true }] });
    expect(gameReducer(s, { type: 'MOVE', direction: 'RIGHT' }).deathCause).toBe('brute');
  });
});

describe('chests', () => {
  it('give a relic, the same one for everyone', () => {
    const s = createState({ entities: [coin(100), chest(1)] });
    const opened = gameReducer(s, { type: 'MOVE', direction: 'RIGHT' });
    expect(opened.relics).toHaveLength(s.relics.length + 1);
    expect(opened.chestRelic).toBe(opened.relics[opened.relics.length - 1]);
    expect(chestRelic(s.runSeed, s.level, 1, [])).toBe(opened.chestRelic);
  });

  it('never give a second cursed relic', () => {
    for (let tile = 0; tile < 200; tile++) {
      const r = chestRelic(9, 3, tile, ['blood_pact']);
      if (r) expect(RELICS[r].cursed).toBeFalsy();
    }
  });
});

describe('the shortcut and the dark floor', () => {
  it('a shortcut jumps a floor and pays its bonus', () => {
    const s = { ...createState(), isLevelUp: true, level: 3 };
    const next = gameReducer(s, { type: 'LEVEL_UP', payload: { rows: 6, cols: 9, entities: [coin(30)], coins: 1, attack: 3, seed: 5, omen: 'shortcut', skip: 1 } });
    expect(next.level).toBe(5);
    expect(next.score).toBeGreaterThan(s.score);
  });

  it('is never offered before the lieutenant, and both new doors show up', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      for (let level = 2; level <= 9; level++) {
        const doors = forkDoors(seed, level, 'expedition') ?? [];
        doors.forEach(d => d && seen.add(d));
        if (level === MID_BOSS_FLOOR) expect(doors).not.toContain('shortcut');
      }
    }
    expect(seen.has('shortcut')).toBe(true);
    expect(seen.has('dark')).toBe(true);
  });

  it('keeps a vortex rule working with the new map helper', () => {
    expect(createEntityMap([pit(3)])[3].type).toBe('pit');
  });
});
