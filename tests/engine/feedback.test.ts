import { gameReducer } from '../../src/core/engine/reducer';
import { diffFeedback, killerTile, chargedHunters } from '../../src/core/feedback/diffFeedback';
import {
  addGem,
  comboLook,
  comboRate,
  EMPTY_STREAK,
  gemPopScale,
  gemRate,
  gemStreakLabel,
  GEM_STREAK_WINDOW_MS,
} from '../../src/core/feedback/combo';
import { popupStackOffset, tileCenter } from '../../src/core/feedback/geometry';
import { shouldShowShop } from '../../src/core/feedback/flow';
import { nextHint, HintFacts } from '../../src/core/feedback/hints';
import { boss, coin, createState, enemy } from '../helpers/state';
import type { GameState } from '../../src/core/engine/types';

const kinds = (prev: GameState, next: GameState) => diffFeedback(prev, next).map(e => e.kind);

describe('diffFeedback', () => {
  it('reports a gem exactly once and nothing for the next identical state', () => {
    const a = createState({ entities: [coin(1), coin(100)] });
    const b = gameReducer(a, { type: 'MOVE', direction: 'RIGHT' });
    expect(kinds(a, b)).toEqual(['coin']);
    expect(kinds(b, b)).toEqual([]);
  });

  it('does not replay a pickup when a non-turn action follows (detector, buy)', () => {
    const base = createState({ entities: [{ index: 1, type: 'shield' }, coin(100)] });
    const picked = gameReducer(base, { type: 'MOVE', direction: 'RIGHT' });
    expect(kinds(base, picked)).toContain('pickup');
    const afterDetector = gameReducer({ ...picked, items: { detector: 1, bomb: 0 } }, { type: 'USE_ITEM', item: 'detector' });
    expect(kinds(picked, afterDetector)).toEqual([]);
  });

  it('reports a trap pickup with its kind', () => {
    const base = createState({ entities: [{ index: 1, type: 'trap' }, coin(100)] });
    const next = gameReducer(base, { type: 'MOVE', direction: 'RIGHT' });
    expect(diffFeedback(base, next)).toContainEqual({ kind: 'pickup', pickup: 'trap', tile: 1 });
  });

  it('reports a kill with the combo, and a miss when the arrow hits nothing', () => {
    const base = createState({ entities: [enemy(1), coin(100)], attack: 3 });
    const killed = gameReducer(base, { type: 'ATTACK', direction: 'RIGHT' });
    expect(diffFeedback(base, killed)).toContainEqual({ kind: 'kill', combo: 1, tile: 1 });
    const missed = gameReducer(base, { type: 'ATTACK', direction: 'UP' });
    expect(kinds(base, missed)).toEqual(['miss']);
  });

  it('reports boss hits and the boss death', () => {
    const base = createState({ entities: [boss(1, 2), coin(100)], attack: 3 });
    const hit = gameReducer(base, { type: 'ATTACK', direction: 'RIGHT' });
    expect(diffFeedback(base, hit)).toContainEqual({ kind: 'bossHit', dead: false, hearts: 1, tile: 1 });
    const dead = gameReducer(hit, { type: 'ATTACK', direction: 'RIGHT' });
    expect(diffFeedback(hit, dead)).toContainEqual(expect.objectContaining({ kind: 'bossHit', dead: true }));
  });

  it('reports a shield absorbing a lethal touch (no death)', () => {
    const base = { ...createState({ entities: [enemy(1), coin(100)] }), shield: true };
    const next = gameReducer(base, { type: 'MOVE', direction: 'RIGHT' });
    expect(next.isGameOver).toBe(false);
    expect(kinds(base, next)).toContain('shieldBreak');
  });

  it('reports a death once and not shieldBreak', () => {
    const base = createState({ entities: [enemy(1), coin(100)] });
    const next = gameReducer(base, { type: 'MOVE', direction: 'RIGHT' });
    expect(next.isGameOver).toBe(true);
    expect(kinds(base, next)).toEqual(['death']);
    expect(killerTile(next)).toBe(1);
  });

  it('reports becoming adjacent to a hazard only on the step that gets next to it', () => {
    const base = createState({ entities: [enemy(3), coin(100)] });
    const one = gameReducer(base, { type: 'MOVE', direction: 'RIGHT' });
    expect(kinds(base, one)).toEqual([]);
    const two = gameReducer(one, { type: 'MOVE', direction: 'RIGHT' });
    expect(kinds(one, two)).toEqual(['hazardNear']);
  });

  it('is silent across floors and runs', () => {
    const a = createState({ entities: [coin(1), coin(100)] });
    const b = { ...a, seed: a.seed + 1, level: a.level + 1, coins: a.coins + 5 };
    expect(diffFeedback(a, b)).toEqual([]);
  });

  it('counts charged hunters', () => {
    expect(chargedHunters({ entities: [{ index: 1, type: 'boss', charge: 1 }, { index: 2, type: 'stalker', charge: 0 }] })).toBe(1);
  });
});

describe('combo and streak presentation', () => {
  it('labels combos and caps them', () => {
    expect(comboLook(1, 3).label).toBeNull();
    expect(comboLook(2, 3).label).toBe('x2 COMBO');
    expect(comboLook(3, 3).label).toBe('x3 MAX');
    expect(comboLook(3, 3).scale).toBeGreaterThan(comboLook(2, 3).scale);
    expect(comboRate(3)).toBeGreaterThan(comboRate(2));
    expect(comboRate(1)).toBe(1);
  });

  it('keeps a gem streak inside the window and resets after a pause', () => {
    let s = addGem(EMPTY_STREAK, 1000);
    s = addGem(s, 1000 + 500);
    s = addGem(s, 1500 + 500);
    expect(s.count).toBe(3);
    expect(gemStreakLabel(s.count)).toBe('x3');
    expect(gemStreakLabel(2)).toBeNull();
    s = addGem(s, 2000 + GEM_STREAK_WINDOW_MS + 1);
    expect(s.count).toBe(1);
  });

  it('raises pitch and pop with the streak, with caps', () => {
    expect(gemRate(3)).toBeGreaterThan(gemRate(2));
    expect(gemRate(50)).toBe(gemRate(8));
    expect(gemPopScale(40)).toBeLessThanOrEqual(1.45);
    expect(gemPopScale(3)).toBeGreaterThan(gemPopScale(1));
  });
});

describe('tileCenter', () => {
  const layout = { originX: 100, originY: 50, tileSize: 40, cols: 15 };
  it('finds the centre of a tile', () => {
    expect(tileCenter(0, layout)).toEqual({ x: 120, y: 70 });
    expect(tileCenter(16, layout)).toEqual({ x: 160, y: 110 });
    expect(tileCenter(14, layout)).toEqual({ x: 100 + 14.5 * 40, y: 70 });
  });
  it('stacks popups upward', () => {
    expect(popupStackOffset(0)).toBe(-0);
    expect(popupStackOffset(2, 20)).toBe(-40);
  });
});

describe('between floors', () => {
  it('skips the shop on the first two descents only', () => {
    expect(shouldShowShop(2)).toBe(false);
    expect(shouldShowShop(3)).toBe(true);
  });
});

describe('nextHint', () => {
  const facts: HintFacts = { turn: 3, ability: null, canUndo: false, detector: 0, bomb: 0, cluesShown: false, explored: 1, arrows: 0 };
  it('is quiet before the first move', () => {
    expect(nextHint({ ...facts, turn: 0, cluesShown: true }, [])).toBeNull();
  });
  it('returns each hint once, in priority order', () => {
    const rich: HintFacts = { ...facts, cluesShown: true, explored: 9, arrows: 3, canUndo: true };
    const seen: string[] = [];
    const order: string[] = [];
    for (let i = 0; i < 10; i++) {
      const h = nextHint(rich, seen);
      if (!h) break;
      order.push(h);
      seen.push(h);
    }
    expect(order).toEqual(['clues', 'undo', 'travel', 'flag', 'aim']);
    expect(nextHint(rich, seen)).toBeNull();
  });
});
