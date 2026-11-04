import { arrowPath, ensureWinnable, gameReducer } from '../../src/core/engine/reducer';
import { getHeroPerks, NO_PERKS, HEROES } from '../../src/core/engine/heroes';
import { BOMB_WAKE, ORB_BURST, scaleAmmo, shotPlan, weaponOf, weaponOfHero } from '../../src/core/engine/weapons';
import { draftRelics, isUsefulRelic, type RelicId } from '../../src/core/engine/relics';
import { draftContext, gainRelicNow, manhattan } from '../../src/core/engine/worldHelpers';
import { resolveEncounter, scoutCost, smithAmmo } from '../../src/core/engine/encounters';
import { diffFeedback } from '../../src/core/feedback/diffFeedback';
import { killValue } from '../../src/core/engine/scoring';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import type { GameEntity, GameState } from '../../src/core/engine/types';
import type { HeroPerks } from '../../src/core/engine/heroes';
import { ammoItem, boss, coin, createState, enemy, pit, trap } from '../helpers/state';

const MIRA: HeroPerks = { ...getHeroPerks(4), startLit: false };
const BRAM: HeroPerks = getHeroPerks(5);
const COLS = 7;
const ROWS = 7;
/** The hero stands at row 3, column 0 and throws to the right: the flight crosses 22, 23 (and on). */
const HERO = 21;
const sleeper = (index: number): GameEntity => ({ index, type: 'sleeper' });
const thief = (index: number, loot: number): GameEntity => ({ index, type: 'thief', loot });

/** A 7x7 floor with the hero at HERO (explored), a far gem so it never clears, and these entities. */
const floor = (perks: HeroPerks, entities: GameEntity[], over: Partial<GameState> = {}, attack = 6): GameState => {
  const all = [coin(48), ...entities];
  const s = createState({ rows: ROWS, cols: COLS, perks, entities: all, attack, coins: all.filter(e => e.type === 'coin').length + entities.reduce((n, e) => n + (e.loot ?? 0), 0) });
  return { ...s, playerIndex: HERO, visited: [HERO], score: 1000, ...over };
};
const shoot = (s: GameState, direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' = 'RIGHT') => gameReducer(s, { type: 'ATTACK', direction });

describe('the roster carries the weapons', () => {
  it('archers keep the bow, Mira casts orbs, Bram throws bombs', () => {
    expect([0, 1, 2, 3].map(weaponOfHero)).toEqual(['bow', 'bow', 'bow', 'bow']);
    expect(weaponOfHero(4)).toBe('orb');
    expect(weaponOfHero(5)).toBe('bomb');
    expect(HEROES[4].perks.bonusArrows).toBe(-1);
    expect(HEROES[5].perks.arrowReach).toBe(2);
  });

  it('an old save without a weapon plays the bow', () => {
    const { weapon: _w, ...old } = BRAM;
    expect(weaponOf({ perks: old as HeroPerks })).toBe('bow');
    const s = floor(old as HeroPerks, [enemy(23), enemy(30)]);
    expect(shotPlan(s, 'RIGHT').area).toEqual([]);
    const after = shoot(s);
    expect(after.entityMap[23]).toBeUndefined();
    expect(after.entityMap[30]).toBeDefined(); // no blast
    expect(weaponOf(createState())).toBe('bow');
  });
});

describe('the bow is unchanged', () => {
  it('its plan is exactly arrowPath, with no area', () => {
    const boards: GameEntity[][] = [[], [enemy(23)], [boss(22, 3)], [thief(24, 1), enemy(25)], [pit(22), enemy(24)]];
    for (const entities of boards) {
      for (const reach of [1, 2, 4]) {
        const s = floor({ ...NO_PERKS, arrowReach: reach }, entities);
        for (const dir of ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const) {
          const plan = shotPlan(s, dir);
          const path = arrowPath(s, dir);
          expect(plan.tiles).toEqual(path.tiles);
          expect(plan.targetIndex).toBe(path.targetIndex);
          expect(plan.area).toEqual([]);
          expect(plan.weapon).toBe('bow');
        }
      }
    }
  });
});

describe("Mira's orb", () => {
  it('slays like an arrow and bursts on the target: safe tiles explored, hazards flagged', () => {
    const s = floor(MIRA, [enemy(22), pit(15), trap(23), enemy(29)]);
    const plan = shotPlan(s, 'RIGHT');
    expect(plan.landing).toBe(22);
    expect(plan.area.sort((a, b) => a - b)).toEqual([15, 22, 23, 29]); // the hero's tile (21) is left out
    const after = shoot(s);
    expect(after.entityMap[22]).toBeUndefined();
    expect(after.score).toBe(1000 + killValue(1));
    expect(after.attack).toBe(s.attack - 1);
    expect(after.visited).toContain(22);
    for (const lethal of [15, 23, 29]) {
      expect(after.visited).not.toContain(lethal); // never explores a deadly tile (nor a trap)
      expect(after.marked).toContain(lethal);
    }
  });

  it('a miss still costs the orb and 25 points, and bursts at the end of its flight', () => {
    const s = floor(MIRA, []);
    const plan = shotPlan(s, 'RIGHT');
    expect(plan.targetIndex).toBe(-1);
    expect(plan.landing).toBe(22);
    const after = shoot(s);
    expect(after.score).toBe(1000 + GAME_CONFIG.scoring.missPenalty);
    expect(after.attack).toBe(s.attack - 1);
    expect([...after.visited].sort((a, b) => a - b)).toEqual([15, 21, 22, 23, 29]);
  });

  it('never re-explores what is already explored and never bursts on the hero', () => {
    const s = floor(MIRA, [], { visited: [HERO, 29] });
    const after = shoot(s);
    expect(after.visited.filter(i => i === 29)).toHaveLength(1);
    expect(after.visited.filter(i => i === HERO)).toHaveLength(1);
    expect(shotPlan(s, 'RIGHT').area).not.toContain(HERO);
  });

  it('flies on through the kill with the Piercing Head and bursts on the second target', () => {
    const s = floor({ ...MIRA, arrowReach: 4 }, [enemy(22), enemy(24)], { relics: ['piercing'] });
    const plan = shotPlan(s, 'RIGHT');
    expect(plan.targetIndex).toBe(22);
    expect(plan.landing).toBe(24);
    const after = shoot(s);
    expect(after.entityMap[22]).toBeUndefined();
    expect(after.entityMap[24]).toBeUndefined();
    expect(after.visited).toEqual(expect.arrayContaining([17, 24, 25, 31]));
  });

  it('the Flare Arrow widens the burst to two tiles', () => {
    const s = floor(MIRA, [], { relics: ['flare_arrow'] });
    const plan = shotPlan(s, 'RIGHT');
    expect(plan.area.every(i => manhattan(i, 22, COLS) <= 2)).toBe(true);
    expect(plan.area).toContain(8); // two rows above the landing tile
    expect(plan.area.length).toBeGreaterThan(4);
    expect(shoot(s).visited).toContain(8);
    expect(ORB_BURST).toBe(1);
  });

  it('Echo Arrow gives the orb back for a kill two tiles away', () => {
    const s = floor({ ...MIRA, arrowReach: 2 }, [enemy(23)], { relics: ['echo_arrow'] });
    expect(shoot(s).attack).toBe(s.attack);
  });
});

describe("Bram's bomb", () => {
  it('is thrown two tiles and blows up a plus where it lands', () => {
    const s = floor(BRAM, []);
    const plan = shotPlan(s, 'RIGHT');
    expect(plan.tiles).toEqual([22, 23]);
    expect(plan.landing).toBe(23);
    expect([...plan.area].sort((a, b) => a - b)).toEqual([16, 22, 23, 24, 30]);
  });

  it('kills every guardian in the blast, each raising the combo', () => {
    const s = floor(BRAM, [enemy(16), sleeper(30), { index: 24, type: 'mimic' }]);
    const after = shoot(s);
    for (const i of [16, 30, 24]) expect(after.entityMap[i]).toBeUndefined();
    expect(after.enemyCombo).toBe(3);
    expect(after.score).toBe(1000 + killValue(1) + killValue(2) + killValue(3));
    expect(after.attack).toBe(s.attack - 1);
    expect(after.isGameOver).toBe(false);
  });

  it('explodes on the first hostile tile', () => {
    const s = floor(BRAM, [enemy(22), enemy(15), enemy(23)]);
    const plan = shotPlan(s, 'RIGHT');
    expect(plan.landing).toBe(22);
    expect(plan.area).not.toContain(HERO); // the hero is never in the blast
    const after = shoot(s);
    expect(after.isGameOver).toBe(false);
    expect(after.entityMap[22]).toBeUndefined();
    expect(after.entityMap[15]).toBeUndefined();
    expect(after.entityMap[23]).toBeUndefined();
  });

  it('takes at most one heart from the Grimbur per throw', () => {
    const s = floor(BRAM, [boss(23, 3)], { relics: ['piercing'] });
    const after = shoot(s);
    expect(after.entityMap[23]?.hp ?? after.entities.find(e => e.type === 'boss')?.hp).toBe(2);
    expect(after.score).toBe(1000 + GAME_CONFIG.boss.hitScore);
  });

  it('a thief in the blast drops its loot', () => {
    const s = floor(BRAM, [thief(24, 2)]);
    expect(s.coins).toBe(3);
    const after = shoot(s);
    expect(after.entityMap[24]).toBeUndefined();
    expect(after.coins).toBe(1);
    expect(after.gems).toBe(s.gems + 2);
    expect(after.totalCoins).toBe(s.totalCoins + 2);
  });

  it('vortexes survive (flagged) and traps are disarmed', () => {
    const s = floor(BRAM, [pit(24), trap(30)]);
    const after = shoot(s);
    expect(after.entityMap[24]?.type).toBe('pit');
    expect(after.marked).toContain(24);
    expect(after.entityMap[30]).toBeUndefined();
  });

  it('a miss costs 25 points and resets the combo', () => {
    const s = floor(BRAM, [], { enemyCombo: 2 });
    const after = shoot(s);
    expect(after.score).toBe(1000 + GAME_CONFIG.scoring.missPenalty);
    expect(after.enemyCombo).toBe(0);
    expect(after.attack).toBe(s.attack - 1);
    expect(shoot(floor(BRAM, [], { relics: ['reaper'] })).attack).toBe(s.attack - 2);
  });

  it('is loud: sleepers within BOMB_WAKE of the blast wake up (not with the Lullaby)', () => {
    expect(BOMB_WAKE).toBe(3);
    // 2 is three tiles from the landing tile (23) and five from the hero; 27 is four tiles away.
    const s = floor(BRAM, [sleeper(2), sleeper(27)]);
    const after = shoot(s);
    expect(after.entityMap[2]?.type).toBe('stalker');
    expect(after.entityMap[27]?.type).toBe('sleeper');
    const calm = shoot(floor(BRAM, [sleeper(2)], { relics: ['lullaby'] }));
    expect(calm.entityMap[2]?.type).toBe('sleeper');
  });

  it('the Piercing Head makes the blast a 3x3 square', () => {
    const plain = shoot(floor(BRAM, [enemy(17), enemy(31)]));
    expect(plain.entityMap[17]).toBeDefined();
    const s = floor(BRAM, [enemy(17), enemy(31)], { relics: ['piercing'] });
    expect([...shotPlan(s, 'RIGHT').area].sort((a, b) => a - b)).toEqual([15, 16, 17, 22, 23, 24, 29, 30, 31]);
    const after = shoot(s);
    expect(after.entityMap[17]).toBeUndefined();
    expect(after.entityMap[31]).toBeUndefined();
  });

  it('Echo Arrow gives the bomb back for a throw that kills two or more', () => {
    const two = floor(BRAM, [enemy(16), enemy(30)], { relics: ['echo_arrow'] });
    expect(shoot(two).attack).toBe(two.attack);
    const one = floor(BRAM, [enemy(16)], { relics: ['echo_arrow'] });
    expect(shoot(one).attack).toBe(one.attack - 1);
  });

  it('the Flare Arrow lights the blast: tiles explored, vortexes flagged', () => {
    const s = floor(BRAM, [pit(24)], { relics: ['flare_arrow'] });
    const after = shoot(s);
    expect(after.visited).toEqual(expect.arrayContaining([16, 22, 23, 30]));
    expect(after.visited).not.toContain(24);
    expect(after.marked).toContain(24);
    // Without it the blast lights nothing.
    expect(shoot(floor(BRAM, [])).visited).toEqual([HERO]);
  });

  it('reports every guardian it slew to the feedback', () => {
    const s = floor(BRAM, [enemy(16), enemy(30), enemy(24)]);
    const events = diffFeedback(s, shoot(s));
    const kill = events.find(e => e.kind === 'kill');
    expect(kill && kill.kind === 'kill' && [...(kill.tiles ?? [])].sort((a, b) => a - b)).toEqual([16, 24, 30]);
    // A single kill keeps the old shape (no list).
    const one = floor(BRAM, [enemy(16)]);
    const single = diffFeedback(one, shoot(one)).find(e => e.kind === 'kill');
    expect(single).toBeDefined();
    expect(single && single.kind === 'kill' && single.tile).toBe(16);
    expect(single && single.kind === 'kill' && single.tiles).toBeUndefined();
  });
});

describe('bombs are scarcer: every grant goes through scaleAmmo', () => {
  it('halves (rounding up) only for the bomb', () => {
    expect(scaleAmmo('bomb', 2)).toBe(1);
    expect(scaleAmmo('bomb', 3)).toBe(2);
    expect(scaleAmmo('bomb', 4)).toBe(2);
    expect(scaleAmmo('bow', 3)).toBe(3);
    expect(scaleAmmo('orb', 3)).toBe(3);
  });

  it('the floor start is halved for Bram and one fewer (never below one) for Mira', () => {
    expect(createState({ perks: BRAM, attack: 3 }).attack).toBe(2);
    expect(createState({ perks: MIRA, attack: 3 }).attack).toBe(2);
    expect(createState({ perks: MIRA, attack: 1 }).attack).toBe(1);
    expect(createState({ perks: NO_PERKS, attack: 3 }).attack).toBe(3);
  });

  it('a bundle on the floor holds one bomb', () => {
    const s = createState({ perks: BRAM, entities: [ammoItem(1), coin(100)] });
    expect(gameReducer(s, { type: 'MOVE', direction: 'RIGHT' }).attack).toBe(s.attack + 1);
    const bow = createState({ entities: [ammoItem(1), coin(100)] });
    expect(gameReducer(bow, { type: 'MOVE', direction: 'RIGHT' }).attack).toBe(bow.attack + 2);
  });

  it('the shop pack, the merchant, a revive and a refill', () => {
    const shop = { ...createState({ perks: BRAM }), isLevelUp: true, gems: 20 };
    expect(gameReducer(shop, { type: 'BUY', item: 'arrows' }).pendingArrows).toBe(1);
    const sold = gameReducer({ ...shop, attack: 1 }, { type: 'SELL_ARROWS' });
    expect(sold.attack).toBe(0);
    expect(sold.merchantUsed).toBe(true);

    const alive = { ...createState({ perks: BRAM }), attack: 0 };
    const { undo: _u, ...snapshot } = alive;
    const dead: GameState = { ...alive, isGameOver: true, lastBreath: snapshot };
    expect(gameReducer(dead, { type: 'REVIVE' }).attack).toBe(2);
    expect(gameReducer(alive, { type: 'REFILL' }).attack).toBe(2);
  });

  it('the next floor: the grant halved and at most two bombs carried over', () => {
    const payload = { rows: 6, cols: 9, entities: [coin(30)], coins: 1, attack: 4, seed: 5 };
    const cleared = (perks: HeroPerks) => ({ ...createState({ perks }), isLevelUp: true, attack: 10 });
    expect(gameReducer(cleared(BRAM), { type: 'LEVEL_UP', payload }).attack).toBe(2 + 2);
    expect(gameReducer(cleared(NO_PERKS), { type: 'LEVEL_UP', payload }).attack).toBe(4 + 4);
    const mira = { ...createState({ perks: MIRA }), isLevelUp: true, attack: 0 };
    expect(gameReducer(mira, { type: 'LEVEL_UP', payload: { ...payload, attack: 1 } }).attack).toBe(1);
  });

  it('the scout costs one bomb, the smith gives two, the Quiver one', () => {
    expect(scoutCost({ perks: BRAM })).toBe(1);
    expect(scoutCost({ perks: NO_PERKS })).toBe(2);
    expect(smithAmmo({ perks: BRAM })).toBe(2);
    const scout = { ...createState({ perks: BRAM }), attack: 1, encounter: { id: 'scout' as const } };
    const took = resolveEncounter(scout, true);
    expect(took.encounter?.outcome).toBe('done');
    expect(took.attack).toBe(0);
    const smith = { ...createState({ perks: BRAM }), shield: true, encounter: { id: 'smith' as const } };
    expect(resolveEncounter(smith, true).attack).toBe(smith.attack + 2);
    const s = createState({ perks: BRAM });
    expect(gainRelicNow(s, 'quiver').attack).toBe(s.attack + 1);
    expect(gainRelicNow(createState(), 'quiver').attack).toBe(createState().attack + 2);
  });

  it('Blood Gems: a bomb for every second gem', () => {
    const s = { ...createState({ perks: BRAM, entities: [coin(1), coin(2), coin(100)] }), relics: ['blood_gems'] as RelicId[] };
    const one = gameReducer(s, { type: 'MOVE', direction: 'RIGHT' });
    expect(one.attack).toBe(s.attack);
    const two = gameReducer(one, { type: 'MOVE', direction: 'RIGHT' });
    expect(two.attack).toBe(s.attack + 1);
  });
});

describe('the lair stays winnable with bombs', () => {
  it('a floor with a Grimbur starts with at least its hearts plus one bombs', () => {
    expect(createState({ perks: BRAM, entities: [boss(40, 3), coin(10)], attack: 2 }).attack).toBe(4);
    const payload = { rows: 6, cols: 9, entities: [boss(40, 3), coin(30)], coins: 1, attack: 2, seed: 5 };
    const cleared = { ...createState({ perks: BRAM }), isLevelUp: true, attack: 0 };
    expect(gameReducer(cleared, { type: 'LEVEL_UP', payload }).attack).toBe(4);
  });

  it('a rescue sends one bundle per heart (a bundle holds one bomb)', () => {
    const lair = { ...createState({ perks: BRAM, entities: [boss(100, 3)], coins: 0 }), coins: 0, attack: 0 };
    expect(ensureWinnable(lair).entities.filter(e => e.type === 'ammo')).toHaveLength(3);
  });
});

describe('drafts', () => {
  it('never offer the Glass Bow to Bram', () => {
    expect(isUsefulRelic('glass_bow', [], draftContext({ perks: BRAM }))).toBe(false);
    expect(isUsefulRelic('glass_bow', [], draftContext({ perks: MIRA }))).toBe(true);
    expect(isUsefulRelic('glass_bow', [], draftContext({ perks: NO_PERKS }))).toBe(true);
    for (let seed = 1; seed < 200; seed++) {
      expect(draftRelics(seed, 1, [], 5, draftContext({ perks: BRAM }))).not.toContain('glass_bow');
    }
  });
});

describe('determinism', () => {
  it('the same shot always gives the same state, without Math.random', () => {
    const spy = jest.spyOn(Math, 'random');
    for (const perks of [MIRA, BRAM]) {
      const s = floor(perks, [enemy(16), sleeper(2), boss(23, 3), pit(30), thief(24, 1)]);
      expect(shoot(s)).toEqual(shoot(s));
    }
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
