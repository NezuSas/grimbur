import { gameReducer } from '../../src/core/engine/reducer';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { ammoItem, coin, createState, enemy, pit, shieldItem, trap } from '../helpers/state';

const { scoring } = GAME_CONFIG;
const moveRight = { type: 'MOVE', direction: 'RIGHT' } as const;

describe('Shield', () => {
  it('consumes the shield and destroys the guardian instead of dying', () => {
    const state = { ...createState({ entities: [enemy(1), coin(50)] }), shield: true };
    const next = gameReducer(state, moveRight);

    expect(next.isGameOver).toBe(false);
    expect(next.shield).toBe(false);
    expect(next.playerIndex).toBe(1);
    expect(next.entityMap[1]).toBeUndefined();
  });

  it('survives into the next level', () => {
    const state = { ...createState(), shield: true, isLevelUp: true };
    const next = gameReducer(state, {
      type: 'LEVEL_UP',
      payload: { rows: 6, cols: 9, entities: [coin(10)], coins: 1, attack: 3, seed: 1 },
    });

    expect(next.shield).toBe(true);
  });
});

describe('Traps', () => {
  it('cost points once and disappear', () => {
    const state = { ...createState({ entities: [trap(1), coin(50)] }), score: 1000 };
    const next = gameReducer(state, moveRight);

    expect(next.score).toBe(1000 + scoring.stepCost + scoring.newTile + scoring.trapPenalty);
    expect(next.lastPickup).toBe('trap');
    expect(next.entityMap[1]).toBeUndefined();
    expect(next.isGameOver).toBe(false);
  });

  it('never drive the score below zero', () => {
    const state = { ...createState({ entities: [trap(1), coin(50)] }), score: 10 };
    expect(gameReducer(state, moveRight).score).toBe(0);
  });
});

describe('Pickups', () => {
  it('a shield pickup arms the shield and pays a bonus', () => {
    const state = { ...createState({ entities: [shieldItem(1), coin(50)] }), score: 1000 };
    const next = gameReducer(state, moveRight);

    expect(next.shield).toBe(true);
    expect(next.lastPickup).toBe('shield');
    expect(next.score).toBe(1000 + scoring.stepCost + scoring.newTile + scoring.pickup);
    expect(next.entityMap[1]).toBeUndefined();
  });

  it('an ammo pickup grants extra arrows', () => {
    const state = createState({ entities: [ammoItem(1), coin(50)], attack: 2 });
    const next = gameReducer(state, moveRight);

    expect(next.attack).toBe(2 + GAME_CONFIG.pickups.ammoAmount);
    expect(next.lastPickup).toBe('ammo');
  });

  it('lastPickup only lasts for one action', () => {
    let state = createState({ entities: [ammoItem(1), coin(50)] });
    state = gameReducer(state, moveRight);
    state = gameReducer(state, moveRight);

    expect(state.lastPickup).toBeNull();
  });
});

describe('Vortex landing', () => {
  it('never drops the player onto another entity while empty tiles exist', () => {
    const entities = [pit(1), coin(20), trap(21), shieldItem(22), ammoItem(23)];
    for (let seed = 1; seed <= 40; seed++) {
      const next = gameReducer(createState({ entities, seed }), moveRight);
      expect(next.wasTeleported).toBe(true);
      expect(next.entityMap[next.playerIndex]).toBeUndefined();
    }
  });
});
