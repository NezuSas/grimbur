import { gameReducer } from '../../src/core/engine/reducer';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { coin, createState, enemy, pit } from '../helpers/state';

const { scoring } = GAME_CONFIG;

describe('gameReducer', () => {
  describe('RESET', () => {
    it('starts a playing session at the origin with a fresh score', () => {
      const state = createState({ entities: [coin(5)], attack: 4 });

      expect(state.playerIndex).toBe(0);
      expect(state.visited).toEqual([0]);
      expect(state.score).toBe(0);
      expect(state.level).toBe(1);
      expect(state.attack).toBe(4);
      expect(state.coins).toBe(1);
      expect(state.entityMap[5]?.type).toBe('coin');
    });
  });

  describe('Movement', () => {
    it('moves and applies step cost plus the new-tile bonus', () => {
      const state = { ...createState(), score: 1000 };
      const next = gameReducer(state, { type: 'MOVE', direction: 'RIGHT' });

      expect(next.playerIndex).toBe(1);
      expect(next.score).toBe(1000 + scoring.stepCost + scoring.newTile);
      expect(next.visited).toEqual([0, 1]);
    });

    it('does not pay the new-tile bonus when revisiting', () => {
      let state = { ...createState(), score: 1000 };
      state = gameReducer(state, { type: 'MOVE', direction: 'RIGHT' });
      const before = state.score;
      state = gameReducer(state, { type: 'MOVE', direction: 'LEFT' });

      expect(state.score).toBe(before + scoring.stepCost);
      expect(state.visited).toEqual([0, 1]);
    });

    it.each(['LEFT', 'UP'] as const)('blocks %s at the board edge without penalty', (direction) => {
      const state = createState();
      const next = gameReducer(state, { type: 'MOVE', direction });

      expect(next.playerIndex).toBe(0);
      expect(next.facingDir).toBe(direction);
      expect(next.score).toBe(state.score);
    });

    it('does not wrap around rows horizontally', () => {
      const state = { ...createState({ cols: 5, rows: 3 }), playerIndex: 4 };
      const next = gameReducer(state, { type: 'MOVE', direction: 'RIGHT' });

      expect(next.playerIndex).toBe(4);
    });

    it('never lets the score go negative', () => {
      const next = gameReducer(createState(), { type: 'MOVE', direction: 'RIGHT' });

      expect(next.score).toBeGreaterThanOrEqual(0);
    });

    it('ignores input once the game is over or a level is cleared', () => {
      const over = { ...createState(), isGameOver: true };
      const cleared = { ...createState(), isLevelUp: true };

      expect(gameReducer(over, { type: 'MOVE', direction: 'RIGHT' })).toBe(over);
      expect(gameReducer(cleared, { type: 'MOVE', direction: 'RIGHT' })).toBe(cleared);
    });
  });

  describe('Combat', () => {
    it('kills the enemy in the facing direction and scores the combo', () => {
      const state = createState({ entities: [enemy(1), coin(100)], attack: 3 });
      const next = gameReducer(state, { type: 'ATTACK' });

      expect(next.entityMap[1]).toBeUndefined();
      expect(next.entities.some(e => e.type === 'enemy')).toBe(false);
      expect(next.enemyCombo).toBe(1);
      expect(next.score).toBe(scoring.killEnemy);
      expect(next.attack).toBe(2);
    });

    it('caps the combo multiplier', () => {
      const state = {
        ...createState({ entities: [enemy(1), coin(100)], attack: 5 }),
        enemyCombo: GAME_CONFIG.multipliers.maxCombo,
      };
      const next = gameReducer(state, { type: 'ATTACK' });

      expect(next.enemyCombo).toBe(GAME_CONFIG.multipliers.maxCombo);
    });

    it('penalises a miss, resets the combo and still consumes an arrow', () => {
      const state = { ...createState({ attack: 3 }), score: 100, enemyCombo: 2 };
      const next = gameReducer(state, { type: 'ATTACK' });

      expect(next.score).toBe(100 + scoring.missPenalty);
      expect(next.enemyCombo).toBe(0);
      expect(next.attack).toBe(2);
    });

    it('does nothing without arrows', () => {
      const state = createState({ attack: 0 });
      expect(gameReducer(state, { type: 'ATTACK' })).toBe(state);
    });
  });

  describe('Coins and level clear', () => {
    it('collects a coin and removes it from entities and the lookup map', () => {
      const state = { ...createState({ entities: [coin(1), coin(50)] }), score: 1000 };
      const next = gameReducer(state, { type: 'MOVE', direction: 'RIGHT' });

      expect(next.coins).toBe(1);
      expect(next.totalCoins).toBe(1);
      expect(next.entityMap[1]).toBeUndefined();
      expect(next.entities).toHaveLength(1);
      expect(next.score).toBe(1000 + scoring.stepCost + scoring.newTile + GAME_CONFIG.coins.value);
      expect(next.isLevelUp).toBe(false);
    });

    it('scales coin value with the level', () => {
      const state = { ...createState({ entities: [coin(1), coin(50)] }), level: 6, score: 1000 };
      const next = gameReducer(state, { type: 'MOVE', direction: 'RIGHT' });
      const scaled = Math.round(GAME_CONFIG.coins.value * (1 + 5 * GAME_CONFIG.multipliers.levelScale));

      expect(next.score).toBe(1000 + scoring.stepCost + scoring.newTile + scaled);
    });

    it('flags level-up and awards the clear bonus on the last coin', () => {
      const state = { ...createState({ entities: [coin(1)] }), score: 1000 };
      const next = gameReducer(state, { type: 'MOVE', direction: 'RIGHT' });

      expect(next.coins).toBe(0);
      expect(next.isLevelUp).toBe(true);
      expect(next.score).toBe(
        1000 + scoring.stepCost + scoring.newTile + GAME_CONFIG.coins.value + scoring.levelClear,
      );
    });
  });

  describe('Hazards', () => {
    it('ends the game on enemy collision', () => {
      const next = gameReducer(createState({ entities: [enemy(1), coin(50)] }), {
        type: 'MOVE',
        direction: 'RIGHT',
      });

      expect(next.isGameOver).toBe(true);
      expect(next.deathCause).toBe('enemy');
    });

    it('consumes the shield instead of dying', () => {
      const state = { ...createState({ entities: [enemy(1), coin(50)] }), shield: true };
      const next = gameReducer(state, { type: 'MOVE', direction: 'RIGHT' });

      expect(next.isGameOver).toBe(false);
      expect(next.shield).toBe(false);
    });

    it('teleports from a vortex to a safe tile, deterministically', () => {
      const state = createState({ entities: [pit(1), enemy(2), coin(50)] });
      const first = gameReducer(state, { type: 'MOVE', direction: 'RIGHT' });
      const second = gameReducer(state, { type: 'MOVE', direction: 'RIGHT' });

      expect(first.isGameOver).toBe(false);
      expect(first.wasTeleported).toBe(true);
      expect(first.playerIndex).not.toBe(1);
      expect(first.entityMap[first.playerIndex]?.type).not.toBe('pit');
      expect(first.entityMap[first.playerIndex]?.type).not.toBe('enemy');
      expect(second.playerIndex).toBe(first.playerIndex);
    });
  });

  describe('LEVEL_UP', () => {
    it('advances the level keeping the score and installing the new board', () => {
      const state = { ...createState({ entities: [coin(1)] }), score: 5000, isLevelUp: true };
      const next = gameReducer(state, {
        type: 'LEVEL_UP',
        payload: { rows: 6, cols: 9, entities: [coin(10), coin(11)], coins: 2, attack: 4, seed: 7 },
      });

      expect(next.level).toBe(2);
      expect(next.isLevelUp).toBe(false);
      expect(next.score).toBe(5000);
      expect(next.playerIndex).toBe(0);
      expect(next.visited).toEqual([0]);
      expect(next.rows).toBe(6);
      expect(next.cols).toBe(9);
      expect(next.coins).toBe(2);
      expect(next.attack).toBe(4);
      expect(next.entityMap[10]?.type).toBe('coin');
    });
  });
});
