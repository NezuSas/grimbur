// Regressions for the relic / hazard audit: each test is a rule whose text and engine used to disagree.
import { gameReducer } from '../../src/core/engine/reducer';
import { getHeroPerks, NO_PERKS } from '../../src/core/engine/heroes';
import { killValue } from '../../src/core/engine/scoring';
import { reviewDeath } from '../../src/core/engine/deathReview';
import { OWL_EVERY } from '../../src/core/engine/relics';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import type { GameEntity, GameState } from '../../src/core/engine/types';
import { coin, createState, enemy, pit } from '../helpers/state';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

const MID_BOSS_GEMS = 4;
const stalker = (index: number, charge = 0): GameEntity => ({ index, type: 'stalker', charge });
const thief = (index: number, loot: number): GameEntity => ({ index, type: 'thief', loot });
const map = (es: GameEntity[]) => Object.fromEntries(es.map(e => [e.index, e]));
const withEnts = (s: GameState, entities: GameEntity[]): GameState => ({ ...s, entities, entityMap: map(entities) });
const lvl = (attack: number, entities: GameEntity[] = [coin(100)]) => ({
  type: 'LEVEL_UP' as const,
  payload: { rows: 8, cols: 15, entities, coins: entities.filter(e => e.type === 'coin').length, attack, seed: 7, omen: null },
});

describe("Reaper's Scythe doubles every kill", () => {
  it('counts the Piercing Head second kill', () => {
    const s0 = createState({ entities: [enemy(1), enemy(2), coin(100)], perks: { ...NO_PERKS, arrowReach: 3 } });
    const s: GameState = { ...s0, relics: ['reaper', 'piercing'], facingDir: 'RIGHT', score: 0 };
    const n = gameReducer(s, { type: 'ATTACK' });
    expect(n.entities.filter(e => e.type === 'enemy')).toHaveLength(0);
    expect(n.score).toBe(2 * (killValue(1) + killValue(2)));
  });

  it("counts Sera's Volley kills", () => {
    const s0 = createState({ entities: [enemy(1), enemy(2), coin(100)], perks: getHeroPerks(1) });
    const s: GameState = { ...s0, relics: ['reaper'], facingDir: 'RIGHT', score: 0 };
    const n = gameReducer(s, { type: 'USE_ABILITY' });
    expect(n.score).toBe(2 * (killValue(1) + killValue(2)));
  });
});

describe('Thorn Mail', () => {
  it('kills the stalker that strikes into the shield after an ability (settle)', () => {
    const s0 = createState({ entities: [stalker(1, 1), coin(100)], perks: getHeroPerks(0) });
    const s: GameState = { ...s0, relics: ['thorns'], shield: true, turn: 3 };
    const n = gameReducer(s, { type: 'USE_ABILITY' });
    expect(n.isGameOver).toBe(false);
    expect(n.shield).toBe(false);
    expect(n.entities.some(e => e.type === 'stalker')).toBe(false);
  });

  it('kills only the stalker that struck, not one standing by', () => {
    const s0 = createState({ entities: [stalker(1, 1), stalker(15, 0), coin(50), coin(100)], perks: getHeroPerks(3) });
    const s: GameState = { ...s0, relics: ['thorns'], shield: true, turn: 3 };
    const n = gameReducer(s, { type: 'USE_ABILITY' });
    expect(n.isGameOver).toBe(false);
    expect(n.entities.filter(e => e.type === 'stalker').map(e => e.index)).toEqual([15]);
  });

  it('spares a stalker beside the hero when the Grimbur is what struck', () => {
    const s0 = createState({ entities: [coin(100)] });
    const s = withEnts({ ...s0, shield: true, relics: ['thorns'], turn: 3, playerIndex: 16, visited: [0, 16] }, [
      { index: 2, type: 'boss', hp: 3, charge: 1 },
      stalker(0, 0),
      coin(100),
    ]);
    const n = gameReducer(s, { type: 'MOVE', direction: 'UP' });
    expect(n.isGameOver).toBe(false);
    expect(n.shield).toBe(false);
    expect(n.entities.some(e => e.type === 'stalker')).toBe(true);
  });
});

describe("Raven's Eye", () => {
  it('flags the nearest danger at once when picked mid-floor', () => {
    const s0 = createState({ entities: [pit(30), enemy(50), coin(100)] });
    const s: GameState = { ...s0, pendingDraft: ['raven_eye'] };
    const picked = gameReducer(s, { type: 'PICK_RELIC', id: 'raven_eye' });
    expect(picked.marked).toEqual([30]);
  });
});

describe('Owl Totem', () => {
  it("pays for the tiles an orb's burst lights", () => {
    const s0 = createState({ entities: [coin(119)], perks: getHeroPerks(4) });
    const s: GameState = { ...s0, relics: ['owl'], visited: Array.from({ length: OWL_EVERY - 1 }, (_, i) => i), items: { detector: 0, bomb: 0 }, facingDir: 'DOWN' };
    const n = gameReducer(s, { type: 'ATTACK', direction: 'DOWN' });
    expect(n.visited.length).toBeGreaterThanOrEqual(OWL_EVERY);
    expect(n.items.detector).toBe(1);
  });

  it('pays two charges when one action crosses two thresholds, and never twice for the same tiles', () => {
    const s0 = createState({ entities: [coin(119)] });
    const visited = Array.from({ length: 2 * OWL_EVERY - 1 }, (_, i) => i + 15);
    const s: GameState = { ...s0, relics: ['owl'], owlPaid: 0, visited: [0, ...visited.slice(1)], items: { detector: 0, bomb: 0 } };
    const once = gameReducer(s, { type: 'MOVE', direction: 'RIGHT' });
    expect(once.visited.length).toBe(2 * OWL_EVERY);
    expect(once.items.detector).toBe(2);
    const again = gameReducer(once, { type: 'MOVE', direction: 'LEFT' });
    expect(again.items.detector).toBe(2);
  });

  it('starts the count over on a new floor', () => {
    const s0 = createState({ entities: [coin(100)] });
    const s: GameState = { ...s0, relics: ['owl'], owlPaid: 3, isLevelUp: true };
    const next = gameReducer(s, lvl(3));
    expect(next.owlPaid).toBe(0);
    expect(next.items.detector).toBe(s.items.detector);
  });
});

describe("Bram's bombs and the relics' flat bonuses", () => {
  const floor = (relics: GameState['relics'], base: number) => {
    const s0 = createState({ entities: [coin(100)], perks: getHeroPerks(5) });
    return gameReducer({ ...s0, relics, isLevelUp: true, attack: 0 }, lvl(base)).attack;
  };
  it.each([3, 4, 5, 6])('base grant %i: the Quiver adds a bomb and the Blood Pact takes one', base => {
    const none = floor([], base);
    expect(none).toBe(Math.ceil(base / 2));
    expect(floor(['quiver'], base)).toBe(none + 1);
    expect(floor(['blood_pact'], base)).toBe(Math.max(1, none - 1));
  });
  it('never starts a floor without a bomb', () => {
    expect(floor(['blood_pact'], 1)).toBe(1);
  });
});

describe("a thief's loot pays the same however the thief falls", () => {
  const thiefState = (relics: GameState['relics'], perks = NO_PERKS) => {
    const s0 = createState({ entities: [thief(1, 2), coin(100)], perks });
    return { ...s0, coins: 3, relics, gems: 0, facingDir: 'RIGHT' as const };
  };
  it('a shot thief pays the Greedy Idol like a caught one', () => {
    const s = thiefState(['greedy_idol']);
    expect(gameReducer(s, { type: 'ATTACK' }).gems).toBe(4);
    expect(gameReducer(s, { type: 'MOVE', direction: 'RIGHT' }).gems).toBe(4);
  });
  it('a bombed thief pays the Greedy Idol too', () => {
    const s0 = createState({ entities: [thief(2, 2), coin(100)], perks: getHeroPerks(5) });
    const s: GameState = { ...s0, coins: 3, relics: ['greedy_idol'], gems: 0, facingDir: 'RIGHT' };
    expect(gameReducer(s, { type: 'ATTACK' }).gems).toBe(4);
  });
  it('a shot thief pays the Blood Pact score bonus', () => {
    const plain = gameReducer(thiefState([]), { type: 'ATTACK' });
    const pact = gameReducer(thiefState(['blood_pact']), { type: 'ATTACK' });
    expect(pact.score).toBeGreaterThan(plain.score);
  });
});

describe('Blood Gems', () => {
  it("gives an arrow for a gem pulled by Auric's Magnet", () => {
    const s0 = createState({ entities: [coin(2), coin(100)], perks: getHeroPerks(3) });
    const s: GameState = { ...s0, relics: ['blood_gems'] };
    const n = gameReducer(s, { type: 'USE_ABILITY' });
    expect(n.coins).toBe(s.coins - 1);
    expect(n.attack).toBe(s.attack + 1);
  });
  it("gives an arrow for every gem of a caught thief's loot", () => {
    const s0 = createState({ entities: [thief(1, 2), coin(100)] });
    const s: GameState = { ...s0, coins: 3, relics: ['blood_gems'] };
    expect(gameReducer(s, { type: 'MOVE', direction: 'RIGHT' }).attack).toBe(s.attack + 2);
  });
});

describe('Wayfarer Boots', () => {
  const retrace = (boss: GameEntity) => {
    const s0 = createState({ entities: [coin(110)] });
    const s = withEnts({ ...s0, relics: ['iron_boots'], visited: [0, 1], turn: 0 }, [boss, coin(110)]);
    return gameReducer(s, { type: 'MOVE', direction: 'RIGHT' }).turn;
  };
  it("still work on the lieutenant's and the Colossus's floors", () => {
    expect(retrace({ index: 100, type: 'boss', hp: 2, mini: true })).toBe(0);
    expect(retrace({ index: 100, type: 'boss', hp: 2, mini: true, warden: true })).toBe(0);
  });
  it("do not work in the Grimbur's lair", () => {
    expect(retrace({ index: 100, type: 'boss', hp: 3 })).toBe(1);
  });
});

describe('Volley against the bosses, and Stunning Blow', () => {
  it("slaying the lieutenant with a volley pays its bounty and clears the floor, it does not win the run", () => {
    const s0 = createState({ entities: [{ index: 3, type: 'boss', hp: 1, mini: true, calls: 2 }], coins: 0, perks: getHeroPerks(1) });
    const s: GameState = { ...s0, facingDir: 'RIGHT', level: 5 };
    const n = gameReducer(s, { type: 'USE_ABILITY' });
    expect(n.isVictory).toBe(false);
    expect(n.isLevelUp).toBe(true);
    expect(n.gems).toBe(s.gems + MID_BOSS_GEMS);
    expect(n.score - s.score).toBeGreaterThanOrEqual(Math.round(GAME_CONFIG.boss.killScore / 2));
    expect(n.score - s.score).toBeLessThan(GAME_CONFIG.boss.killScore);
  });
  it('a volley that slays a guardian stuns the hunters', () => {
    const s0 = createState({ entities: [enemy(1), stalker(15, 1), coin(100)], perks: getHeroPerks(1) });
    const s: GameState = { ...s0, facingDir: 'RIGHT', turn: 3 };
    expect(gameReducer(s, { type: 'USE_ABILITY' }).isGameOver).toBe(true);
    expect(gameReducer({ ...s, relics: ['stun_shot'] }, { type: 'USE_ABILITY' }).isGameOver).toBe(false);
  });
});

describe('deaths and revives by a hunter', () => {
  it("reads a death to the lieutenant as a hunter's strike, not a gamble", () => {
    const s0 = createState({ entities: [coin(100)] });
    const s = withEnts({ ...s0, turn: 1, playerIndex: 16, visited: [0, 1, 15, 16] }, [{ index: 2, type: 'boss', hp: 2, mini: true, calls: 2, charge: 1 }, coin(100)]);
    const dead = gameReducer(s, { type: 'MOVE', direction: 'UP' });
    expect(dead.deathCause).toBe('brute');
    expect(reviewDeath(dead)).toEqual({ kind: 'hunter', by: 'boss' });
  });
  it('a revive flags the hunter that struck', () => {
    const s0 = createState({ entities: [coin(100)] });
    const s = withEnts({ ...s0, turn: 3, playerIndex: 16, visited: [0, 1, 15, 16] }, [stalker(2, 1), coin(100)]);
    const dead = gameReducer(s, { type: 'MOVE', direction: 'UP' });
    expect(dead.isGameOver).toBe(true);
    const back = gameReducer(dead, { type: 'REVIVE' });
    expect(back.marked).toContain(2);
  });
});

describe('engine flags follow what they flag', () => {
  it('a flag on a stalker goes when it moves', () => {
    const s0 = createState({ entities: [stalker(45), coin(100)] });
    const s: GameState = { ...s0, marked: [45], turn: 3 };
    const n = gameReducer(s, { type: 'MOVE', direction: 'RIGHT' });
    expect(n.entityMap[45]).toBeUndefined();
    expect(n.marked).not.toContain(45);
  });
});

describe('texts that now say what the rules do', () => {
  const dicts: Record<string, string>[] = [en, es];
  it('the shortcut names its extra vortex', () => {
    for (const d of dicts) for (const k of ['omen.shortcut.rule', 'omen.shortcut.rule.orb', 'omen.shortcut.rule.bomb']) expect(d[k]).toMatch(/vortex|vórtice/);
  });
  it("Mira's description names her orb fewer", () => {
    for (const d of dicts) expect(d['hero.4.desc']).toMatch(/orb/);
  });
  it('the magma tunnels promise the bundle they place (two arrows, two orbs)', () => {
    expect(en['biome.magma.rule']).toMatch(/two more arrows/);
    expect(es['biome.magma.rule']).toMatch(/dos flechas/);
  });
});
