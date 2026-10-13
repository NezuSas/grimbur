import { GameState, GameAction, GameEntity } from './types';
import { GAME_CONFIG } from '../../config/gameConfig';
import { createPRNG } from '../random/prng';
import { coinValue, killValue, levelClearBonus } from './scoring';

// ─── Helpers ───────────────────────────────────────────────────────────────
const createEntityMap = (entities: GameEntity[]): Record<number, GameEntity> => {
  const map: Record<number, GameEntity> = {};
  for (const entity of entities) {
    map[entity.index] = entity;
  }
  return map;
};

/**
 * Deterministic pick so the reducer stays pure: the same state + action always
 * yields the same teleport destination.
 */
const pickDeterministic = <T,>(pool: T[], seed: number, salt: number): T => {
  const next = createPRNG(seed + salt);
  next(); // discard the weakly-mixed first sample of the LCG
  return pool[Math.floor(next() * pool.length)];
};

// ─── Initial State ─────────────────────────────────────────────────────────
export const initialState: GameState = {
  playerIndex: 0,
  rows: 8,
  cols: 15,
  entities: [],
  entityMap: {},
  visited: [0],
  score: 0,
  attack: 6,
  coins: 0,
  facingDir: 'RIGHT',
  level: 1,
  isGameOver: false,
  isLevelUp: false,
  selectedCharacter: null,
  shield: false,
  enemyCombo: 0,
  gameStatus: 'idle',
  seed: 0, 
  totalCoins: 0,
  deathCause: null,
  wasTeleported: false,
};

// ─── Reducer ───────────────────────────────────────────────────────────────
/**
 * Wumpus Adventures — Pure Reducer
 * No side-effects (logs, events, replays) allowed here.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'MOVE': {
      if (state.isGameOver || state.isLevelUp) return state;

      const { rows, cols } = state;
      const { direction } = action;

      let nextIndex = state.playerIndex;

      const isTop    = state.playerIndex < cols;
      const isBottom = state.playerIndex >= cols * (rows - 1);
      const isLeft   = state.playerIndex % cols === 0;
      const isRight  = (state.playerIndex + 1) % cols === 0;

      if (direction === 'UP'    && !isTop)    nextIndex -= cols;
      if (direction === 'DOWN'  && !isBottom) nextIndex += cols;
      if (direction === 'LEFT'  && !isLeft)   nextIndex -= 1;
      if (direction === 'RIGHT' && !isRight)  nextIndex += 1;

      if (nextIndex === state.playerIndex) {
        return { ...state, facingDir: direction };
      }

      const isNewTile = !state.visited.includes(nextIndex);
      let newVisited = isNewTile
        ? [...state.visited, nextIndex]
        : [...state.visited];

      let newScore = Math.max(0, state.score + GAME_CONFIG.scoring.stepCost);
      if (isNewTile) newScore += GAME_CONFIG.scoring.newTile;

      let newIsGameOver: boolean = state.isGameOver;
      let newCoins = state.coins;
      let newEntities = state.entities;
      let newEntityMap = state.entityMap;
      let newShield = state.shield;
      let newEnemyCombo = 0;
      let newTotalCoins = state.totalCoins;

      // O(1) Collision Check via Map
      const entityAtPoint = state.entityMap[nextIndex];

      let newDeathCause: typeof state.deathCause = null;
      let newWasTeleported = false;

      if (entityAtPoint?.type === 'enemy') {
        // Direct enemy collision
        if (state.shield) {
          newShield = false;
        } else {
          newIsGameOver = true;
          newDeathCause = 'enemy';
        }
      } else if (entityAtPoint?.type === 'pit') {
        // ── Vortex Teleportation ──────────────────────────────────────────
        // 1. Collect all safe destination cells (no pit, no enemy)
        const totalCells = rows * cols;
        const safeUnvisited: number[] = [];
        const safeVisited:   number[] = [];

        for (let idx = 0; idx < totalCells; idx++) {
          const e = state.entityMap[idx];
          const isSafe = !e || (e.type !== 'pit' && e.type !== 'enemy');
          if (!isSafe || idx === nextIndex) continue; // skip current vortex cell
          if (newVisited.includes(idx)) {
            safeVisited.push(idx);
          } else {
            safeUnvisited.push(idx);
          }
        }

        // 2. Pick destination: unvisited first, then visited, then death
        const pool = safeUnvisited.length > 0 ? safeUnvisited : safeVisited;

        if (pool.length === 0) {
          // No safe landing — vortex consumes the player
          newIsGameOver = true;
          newDeathCause = 'pit';
        } else {
          // Teleport!
          const destIndex = pickDeterministic(pool, state.seed, nextIndex * 31 + newVisited.length);
          const destEntity = state.entityMap[destIndex];

          // If we land on a guardian after teleport → death
          if (destEntity?.type === 'enemy') {
            newIsGameOver = true;
            newDeathCause = 'enemy';
            nextIndex = destIndex; // Show player at enemy location on death screen
          } else {
            // Safe landing
            nextIndex = destIndex;
            newWasTeleported = true;
            if (!newVisited.includes(destIndex)) {
              newVisited = [...newVisited, destIndex];
            }
          }
        }
        // ─────────────────────────────────────────────────────────────────
      } else if (entityAtPoint?.type === 'coin') {
        newScore += coinValue(state.level);
        newCoins -= 1;
        newTotalCoins += 1;
        
        // Remove coin from entities and sync map
        newEntities = state.entities.filter(e => e.index !== nextIndex);
        newEntityMap = { ...state.entityMap };
        delete newEntityMap[nextIndex];
      }

      let newIsLevelUp: boolean = state.isLevelUp;
      if (newCoins === 0 && !newIsGameOver) {
        newScore += levelClearBonus(state.level);
        newIsLevelUp = true;
      }

      newScore = Math.max(0, newScore);

      return {
        ...state,
        playerIndex: nextIndex,
        facingDir: direction,
        score: newScore,
        visited: newVisited,
        isGameOver: newIsGameOver,
        isLevelUp: newIsLevelUp,
        coins: newCoins,
        entities: newEntities,
        entityMap: newEntityMap,
        enemyCombo: newEnemyCombo,
        shield: newShield,
        totalCoins: newTotalCoins,
        wasTeleported: newWasTeleported,
        deathCause: newIsGameOver ? newDeathCause : null,
      };
    }

    case 'ATTACK': {
      if (state.isGameOver || state.isLevelUp || state.attack <= 0) return state;

      const { rows, cols } = state;
      let targetIndex = -1;

      const isTop    = state.playerIndex < cols;
      const isBottom = state.playerIndex >= cols * (rows - 1);
      const isLeft   = state.playerIndex % cols === 0;
      const isRight  = (state.playerIndex + 1) % cols === 0;

      if (state.facingDir === 'UP'    && !isTop)    targetIndex = state.playerIndex - cols;
      if (state.facingDir === 'DOWN'  && !isBottom) targetIndex = state.playerIndex + cols;
      if (state.facingDir === 'LEFT'  && !isLeft)   targetIndex = state.playerIndex - 1;
      if (state.facingDir === 'RIGHT' && !isRight)  targetIndex = state.playerIndex + 1;

      let newEntities = state.entities;
      let newEntityMap = state.entityMap;
      let newScore = state.score;
      let newEnemyCombo = state.enemyCombo;

      if (targetIndex !== -1) {
        const entityNearby = state.entityMap[targetIndex];
        const isEnemy = entityNearby?.type === 'enemy';

        if (isEnemy) {
          newEnemyCombo = Math.min(state.enemyCombo + 1, GAME_CONFIG.multipliers.maxCombo);
          newScore += killValue(newEnemyCombo);

          // Remove enemy and sync map
          newEntities = state.entities.filter(e => e.index !== targetIndex);
          newEntityMap = { ...state.entityMap };
          delete newEntityMap[targetIndex];
        } else {
          newScore += GAME_CONFIG.scoring.missPenalty;
          newEnemyCombo = 0;
        }
      } else {
        newScore += GAME_CONFIG.scoring.missPenalty;
        newEnemyCombo = 0;
      }

      newScore = Math.max(0, newScore);

      return {
        ...state,
        attack: state.attack - 1,
        score: newScore,
        entities: newEntities,
        entityMap: newEntityMap,
        enemyCombo: newEnemyCombo,
      };
    }

    case 'LEVEL_UP': {
      const { rows, cols, entities, coins, attack, seed } = action.payload;
      return {
        ...state,
        level: state.level + 1,
        rows,
        cols,
        entities,
        entityMap: createEntityMap(entities),
        coins,
        attack,
        seed: seed || state.seed,
        playerIndex: 0,
        visited: [0],
        isLevelUp: false,
        isGameOver: false,
        enemyCombo: 0,
        deathCause: null,
      };
    }

    case 'RESET': {
      const { character, rows, cols, entities, coins, attack, seed } = action;
      return {
        ...initialState,
        selectedCharacter: character,
        rows,
        cols,
        entities,
        entityMap: createEntityMap(entities),
        coins,
        attack,
        seed: seed || Date.now(),
        visited: [0],
        playerIndex: 0,
        totalCoins: 0,
      };
    }

    default:
      return state;
  }
}
