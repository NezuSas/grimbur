import { gameReducer, initialState } from '../../src/core/engine/reducer';
import { GameEntity, GameState } from '../../src/core/engine/types';
import type { Character } from '../../src/data/characters';

interface BoardOptions {
  rows?: number;
  cols?: number;
  entities?: GameEntity[];
  coins?: number;
  attack?: number;
  seed?: number;
}

/** Builds a deterministic playing state through the real RESET action. */
export function createState(options: BoardOptions = {}): GameState {
  const { rows = 8, cols = 15, coins, attack = 3, seed = 42 } = options;
  // Default to one far-away coin: a board with zero coins counts as already cleared.
  const entities = options.entities ?? [coin(rows * cols - 1)];
  const coinCount = coins ?? entities.filter(e => e.type === 'coin').length;

  return gameReducer(initialState, {
    type: 'RESET',
    character: { playerName: 'Test' } as Character,
    rows,
    cols,
    entities,
    coins: coinCount,
    attack,
    seed,
  });
}

export function coin(index: number): GameEntity {
  return { index, type: 'coin' };
}
export const enemy = (index: number): GameEntity => ({ index, type: 'enemy' });
export const pit = (index: number): GameEntity => ({ index, type: 'pit' });
export const trap = (index: number): GameEntity => ({ index, type: 'trap' });
export const shieldItem = (index: number): GameEntity => ({ index, type: 'shield' });
export const ammoItem = (index: number): GameEntity => ({ index, type: 'ammo' });
