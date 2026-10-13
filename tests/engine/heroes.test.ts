import { gameReducer } from '../../src/core/engine/reducer';
import { HEROES, NO_PERKS, getHeroPerks } from '../../src/core/engine/heroes';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { coin, createState, enemy, trap } from '../helpers/state';

const move = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => ({ type: 'MOVE', direction }) as const;
const levelUp = { rows: 6, cols: 9, entities: [coin(10)], coins: 1, attack: 3, seed: 5 };

describe('hero table', () => {
  it('has a distinct perk per hero and a safe fallback', () => {
    expect(HEROES).toHaveLength(4);
    expect(new Set(HEROES.map(h => h.perkName)).size).toBe(4);
    expect(getHeroPerks(99)).toBe(NO_PERKS);
  });
});

describe('Trapfinder (Cyan)', () => {
  const perks = getHeroPerks(0);

  it('walks over traps for free and starts with an extra arrow', () => {
    const base = { ...createState({ entities: [trap(1), coin(60)], perks, attack: 3 }), score: 1000 };
    expect(base.attack).toBe(4);

    const next = gameReducer(base, move('RIGHT'));
    expect(next.score).toBe(1000 + GAME_CONFIG.scoring.stepCost + GAME_CONFIG.scoring.newTile);
    expect(next.lastPickup).toBeNull();
    expect(next.entityMap[1]).toBeUndefined(); // the trap is disarmed
  });

  it('gets the extra arrow again on every floor', () => {
    const next = gameReducer({ ...createState({ perks }), isLevelUp: true }, { type: 'LEVEL_UP', payload: levelUp });
    expect(next.attack).toBe(levelUp.attack + 1);
  });
});

describe('Piercing arrows (Knight)', () => {
  const entities = [enemy(2), coin(60)];

  it('hits a guardian two tiles away', () => {
    const state = createState({ entities, perks: getHeroPerks(1), attack: 3 });
    const next = gameReducer(state, { type: 'ATTACK' });
    expect(next.entityMap[2]).toBeUndefined();
  });

  it('other heroes miss the same shot', () => {
    const state = createState({ entities, perks: NO_PERKS, attack: 3 });
    const next = gameReducer(state, { type: 'ATTACK' });
    expect(next.entityMap[2]).toBeDefined();
  });

  it('does not shoot through the board edge', () => {
    const state = { ...createState({ entities, perks: getHeroPerks(1) }), facingDir: 'LEFT' as const };
    expect(() => gameReducer(state, { type: 'ATTACK' })).not.toThrow();
  });
});

describe('Stoneskin (Warden)', () => {
  const perks = getHeroPerks(2);

  it('starts the run with a shield and re-arms it on every floor', () => {
    const start = createState({ perks });
    expect(start.shield).toBe(true);

    const spent = { ...start, shield: false, isLevelUp: true };
    const next = gameReducer(spent, { type: 'LEVEL_UP', payload: levelUp });
    expect(next.shield).toBe(true);
  });
});

describe('Treasure hunter (Rogue)', () => {
  const perks = getHeroPerks(3);

  it('earns more per gem and doubles the exploration bonus', () => {
    const plain = { ...createState({ entities: [coin(1), coin(60)] }), score: 1000 };
    const rogue = { ...createState({ entities: [coin(1), coin(60)], perks }), score: 1000 };

    const a = gameReducer(plain, move('RIGHT')).score;
    const b = gameReducer(rogue, move('RIGHT')).score;

    expect(b - a).toBe(
      Math.round(GAME_CONFIG.coins.value * 1.3) - GAME_CONFIG.coins.value + GAME_CONFIG.scoring.newTile,
    );
  });
});
