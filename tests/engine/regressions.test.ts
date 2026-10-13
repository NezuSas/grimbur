import { gameReducer } from '../../src/core/engine/reducer';
import { generateBoard } from '../../src/core/engine/generator';
import { GAME_CONFIG } from '../../src/config/gameConfig';
import { boss, coin, createState, pit, shieldItem } from '../helpers/state';
import { RelicId } from '../../src/core/engine/relics';
import { GameAction } from '../../src/core/engine/types';

const move = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => ({ type: 'MOVE', direction }) as const;
const levelUp: GameAction = { type: 'LEVEL_UP', payload: { rows: 5, cols: 8, entities: [], coins: 1, attack: 3, seed: 9 } };

describe('regressions found by the bug hunt', () => {
  describe('LEVEL_UP is guarded', () => {
    it('only advances a cleared floor, once', () => {
      const playing = createState();
      expect(gameReducer(playing, levelUp)).toBe(playing);

      const cleared = { ...playing, isLevelUp: true };
      const once = gameReducer(cleared, levelUp);
      expect(once.level).toBe(2);
      expect(gameReducer(once, levelUp)).toBe(once); // second dispatch is ignored (draft pending)
    });

    it('cannot revive a dead run or leave a won expedition', () => {
      const dead = { ...createState(), isLevelUp: true, isGameOver: true };
      expect(gameReducer(dead, levelUp)).toBe(dead);

      const won = { ...createState(), isLevelUp: true, isVictory: true };
      expect(gameReducer(won, levelUp)).toBe(won);
    });
  });

  describe('bumping into the Wumpus with a shield', () => {
    it('gives no exploration bonus and costs no step', () => {
      const state = { ...createState({ entities: [boss(1)], coins: 0 }), shield: true, score: 500 };
      const next = gameReducer(state, move('RIGHT'));
      expect(next.score).toBe(500);
      expect(next.playerIndex).toBe(0);
    });
  });

  describe('vortex destination', () => {
    it('never "teleports" the player onto the tile it already stands on while others exist', () => {
      for (let seed = 1; seed <= 60; seed++) {
        const state = createState({ rows: 1, cols: 6, entities: [pit(1), coin(5)], seed });
        const next = gameReducer(state, move('RIGHT'));
        expect(next.wasTeleported).toBe(true);
        expect(next.playerIndex).not.toBe(0);
      }
    });

    it('falls back to the origin only when nothing else is safe', () => {
      const state = createState({ rows: 1, cols: 3, entities: [pit(1), boss(2)], coins: 0 });
      const next = gameReducer(state, move('RIGHT'));
      expect(next.isGameOver).toBe(false);
      expect(next.playerIndex).toBe(0);
    });
  });

  describe('shooting is a turn on the boss floor', () => {
    it('lets the Wumpus close in while the player shoots at nothing', () => {
      let state = createState({ entities: [boss(60)], coins: 0, attack: 9 });
      const start = state.entities[0].index;
      state = gameReducer(state, { type: 'ATTACK' });
      expect(state.entities[0].index).toBe(start); // turn 1: waits
      state = gameReducer(state, { type: 'ATTACK' });
      expect(state.entities[0].index).not.toBe(start); // turn 2: steps
    });

    it('kills a player the Wumpus reaches, a shield absorbs it, and the kill ends the fight first', () => {
      // A charged Wumpus directly below the spawn is about to strike on its next action.
      const adjacent = createState({ entities: [{ ...boss(15), charge: 1 }], coins: 0, attack: 9 });
      const facingRight = { ...adjacent, facingDir: 'RIGHT' as const, turn: 1 };
      const dead = gameReducer(facingRight, { type: 'ATTACK' });
      expect(dead.isGameOver).toBe(true);
      expect(dead.deathCause).toBe('boss');

      const saved = gameReducer({ ...facingRight, shield: true }, { type: 'ATTACK' });
      expect(saved.isGameOver).toBe(false);
      expect(saved.shield).toBe(false);

      const lastHeart = { ...createState({ entities: [boss(1, 1)], coins: 0, attack: 9 }), turn: 1 };
      const won = gameReducer(lastHeart, { type: 'ATTACK' });
      expect(won.isVictory).toBe(true);
      expect(won.isGameOver).toBe(false);
    });

    it('does not advance the turn when there are no arrows', () => {
      const state = createState({ entities: [boss(60)], coins: 0, attack: 0 });
      expect(gameReducer(state, { type: 'ATTACK' })).toBe(state);
    });
  });

  describe('the Wumpus winds up before it strikes', () => {
    it('gives a bare hero three shots at an adjacent Wumpus before it can hit', () => {
      let state = createState({ entities: [boss(1)], coins: 0, attack: 9 });
      state = gameReducer(state, { type: 'ATTACK' }); // turn 1, hp 2
      state = gameReducer(state, { type: 'ATTACK' }); // turn 2: the Wumpus winds up, hp 1
      expect(state.isGameOver).toBe(false);
      expect(state.entities[0].charge).toBe(1);
      state = gameReducer(state, { type: 'ATTACK' }); // hp 0
      expect(state.isVictory).toBe(true);
    });

    it('strikes on the action after the wind-up if it is still alive and adjacent', () => {
      let state = createState({ entities: [boss(1)], coins: 0, attack: 9 });
      state = { ...state, facingDir: 'DOWN' }; // shots go nowhere
      for (let i = 0; i < 3 && !state.isGameOver; i++) state = gameReducer(state, { type: 'ATTACK' });
      expect(state.isGameOver).toBe(false); // turns 1-3: wind-up happened on turn 2
      state = gameReducer(state, { type: 'ATTACK' }); // turn 4: strike
      expect(state.isGameOver).toBe(true);
      expect(state.deathCause).toBe('boss');
    });

    it('loses the charge when it has to move again', () => {
      let state = createState({ entities: [{ ...boss(60), charge: 1 }], coins: 0 });
      state = gameReducer(state, { type: 'MOVE', direction: 'RIGHT' });
      state = gameReducer(state, { type: 'MOVE', direction: 'RIGHT' });
      expect(state.entities[0].charge).toBe(0);
    });
  });

  describe('boss floor generation', () => {
    it('always leaves a way to reach the Wumpus without crossing a vortex', () => {
      const cols = 13;
      for (let seed = 1; seed <= 600; seed++) {
        const board = generateBoard(GAME_CONFIG.expedition.floors, seed * 31, { boss: true });
        const lair = board.entities.find(e => e.type === 'boss')!;
        const pits = new Set(board.entities.filter(e => e.type === 'pit').map(e => e.index));

        const seen = new Set([0]);
        const queue = [0];
        let reached = false;
        for (let head = 0; head < queue.length && !reached; head++) {
          const cur = queue[head];
          const r = Math.floor(cur / board.cols);
          const c = cur % board.cols;
          const next = [
            r > 0 ? cur - board.cols : -1,
            r < board.rows - 1 ? cur + board.cols : -1,
            c > 0 ? cur - 1 : -1,
            c < board.cols - 1 ? cur + 1 : -1,
          ];
          for (const n of next) {
            if (n < 0 || seen.has(n) || pits.has(n)) continue;
            if (n === lair.index) {
              reached = true;
              break;
            }
            seen.add(n);
            queue.push(n);
          }
        }
        expect(reached).toBe(true);
        expect(board.cols).toBe(cols);
      }
    });
  });

  describe('relic and shield bookkeeping stays consistent on the boss floor', () => {
    it('spends a shield before a feather when the Wumpus reaches the player', () => {
      const relics: RelicId[] = ['phoenix'];
      const state = { ...createState({ entities: [{ ...boss(15), charge: 1 }, shieldItem(100)], coins: 0, attack: 9 }), relics, shield: true, turn: 1 };
      const next = gameReducer(state, { type: 'ATTACK' });
      expect(next.shield).toBe(false);
      expect(next.relics).toEqual(['phoenix']);
    });
  });
});
