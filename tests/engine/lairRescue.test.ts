import { MAX_LAIR_RESCUES, ensureWinnable, gameReducer } from '../../src/core/engine/reducer';
import { boss, createState } from '../helpers/state';
import type { GameState } from '../../src/core/engine/types';

const lair = (over: Partial<GameState> = {}): GameState => ({
  ...createState({ entities: [boss(100, 3)], coins: 0, attack: 0 }),
  coins: 0,
  ...over,
});

describe('the lair never leaves a fight that cannot be won', () => {
  it('sends arrows when the hero has none, none lie on the floor and the Wumpus is alive', () => {
    const s = ensureWinnable(lair());
    const bundles = s.entities.filter(e => e.type === 'ammo');
    expect(bundles.length).toBe(2); // 3 hearts at 2 arrows a bundle
    expect(s.lairRescues).toBe(1);
    expect(Object.keys(s.entityMap)).toHaveLength(s.entities.length);
    for (const b of bundles) {
      expect(b.index).not.toBe(s.playerIndex);
      expect(s.entities.filter(e => e.index === b.index)).toHaveLength(1); // never on top of something else
    }
  });

  it('does nothing while the hero still holds an arrow or one lies on the floor', () => {
    expect(ensureWinnable(lair({ attack: 1 }))).toEqual(lair({ attack: 1 }));
    const withBundle = lair({ entities: [boss(100, 3), { index: 50, type: 'ammo' }], entityMap: { 100: { index: 100, type: 'boss', hp: 3 }, 50: { index: 50, type: 'ammo' } } });
    expect(ensureWinnable(withBundle).entities.filter(e => e.type === 'ammo')).toHaveLength(1);
  });

  it('is not a free refill: it stops after MAX_LAIR_RESCUES', () => {
    const empty = (s: GameState): GameState => ({ ...s, attack: 0, entities: s.entities.filter(e => e.type !== 'ammo'), entityMap: Object.fromEntries(s.entities.filter(e => e.type !== 'ammo').map(e => [e.index, e])) });
    let s = lair();
    for (let i = 0; i < MAX_LAIR_RESCUES; i++) {
      s = ensureWinnable(s);
      expect(s.entities.some(e => e.type === 'ammo')).toBe(true);
      s = empty(s);
    }
    expect(ensureWinnable(s).entities.some(e => e.type === 'ammo')).toBe(false);
  });

  it('only exists where there is a Wumpus', () => {
    const plain = createState({ entities: [{ index: 100, type: 'coin' }], attack: 0 });
    expect(ensureWinnable(plain)).toBe(plain);
  });

  it('is the same for the same moment (a daily challenge stays identical for everyone)', () => {
    expect(ensureWinnable(lair()).entities).toEqual(ensureWinnable(lair()).entities);
  });

  it('leaves a finished run alone', () => {
    const dead = lair({ isGameOver: true });
    expect(ensureWinnable(dead)).toBe(dead);
    const won = lair({ isVictory: true });
    expect(ensureWinnable(won)).toBe(won);
  });

  it('runs on every action of the reducer, and a new floor starts with its own count', () => {
    const after = gameReducer(lair(), { type: 'MOVE', direction: 'RIGHT' });
    expect(after.lairRescues).toBe(1);
    expect(after.entities.some(e => e.type === 'ammo')).toBe(true);
  });
});
