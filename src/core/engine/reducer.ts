import { GameState, GameAction, GameEntity, PickupKind, LETHAL_TYPES } from './types';
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

/** Returns new `entities` / `entityMap` without the entity at `index`. */
const removeEntityAt = (state: GameState, index: number) => {
  const entityMap = { ...state.entityMap };
  delete entityMap[index];
  return { entities: state.entities.filter(e => e.index !== index), entityMap };
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

/** Picks where a vortex sends the player. Prefers empty, unexplored tiles. */
const pickTeleportDestination = (
  state: GameState,
  vortexIndex: number,
  visited: number[],
): number | null => {
  const total = state.rows * state.cols;
  const emptyUnvisited: number[] = [];
  const emptyVisited: number[] = [];
  const nonLethal: number[] = [];
  const visitedSet = new Set(visited);

  for (let idx = 0; idx < total; idx++) {
    if (idx === vortexIndex) continue;
    const entity = state.entityMap[idx];
    if (entity && LETHAL_TYPES.includes(entity.type)) continue;
    if (entity) {
      nonLethal.push(idx);
    } else if (visitedSet.has(idx)) {
      emptyVisited.push(idx);
    } else {
      emptyUnvisited.push(idx);
    }
  }

  const pool =
    emptyUnvisited.length > 0 ? emptyUnvisited :
    emptyVisited.length > 0 ? emptyVisited :
    nonLethal;

  if (pool.length === 0) return null;
  return pickDeterministic(pool, state.seed, vortexIndex * 31 + visited.length);
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
  lastPickup: null,
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
        return { ...state, facingDir: direction, lastPickup: null };
      }

      const isNewTile = !state.visited.includes(nextIndex);
      let newVisited = isNewTile
        ? [...state.visited, nextIndex]
        : [...state.visited];

      let newScore = Math.max(0, state.score + GAME_CONFIG.scoring.stepCost);
      if (isNewTile) newScore += GAME_CONFIG.scoring.newTile;

      let newIsGameOver: boolean = false;
      let newCoins = state.coins;
      let newAttack = state.attack;
      let newEntities = state.entities;
      let newEntityMap = state.entityMap;
      let newShield = state.shield;
      let newTotalCoins = state.totalCoins;
      let newDeathCause: GameState['deathCause'] = null;
      let newWasTeleported = false;
      let newLastPickup: PickupKind | null = null;

      const consumeEntity = () => {
        ({ entities: newEntities, entityMap: newEntityMap } = removeEntityAt(state, nextIndex));
      };

      // O(1) collision check via the entity map
      const entityAtPoint = state.entityMap[nextIndex];

      switch (entityAtPoint?.type) {
        case 'enemy':
          if (state.shield) {
            // The shield shatters and takes the guardian with it.
            newShield = false;
            consumeEntity();
          } else {
            newIsGameOver = true;
            newDeathCause = 'enemy';
          }
          break;

        case 'pit': {
          // Vortex: teleport to a safe tile (never onto a hazard).
          const destination = pickTeleportDestination(state, nextIndex, newVisited);
          if (destination === null) {
            newIsGameOver = true;
            newDeathCause = 'pit';
          } else {
            nextIndex = destination;
            newWasTeleported = true;
            if (!newVisited.includes(destination)) {
              newVisited = [...newVisited, destination];
            }
          }
          break;
        }

        case 'coin':
          newScore += coinValue(state.level);
          newCoins -= 1;
          newTotalCoins += 1;
          consumeEntity();
          break;

        case 'trap':
          newScore += GAME_CONFIG.scoring.trapPenalty;
          newLastPickup = 'trap';
          consumeEntity();
          break;

        case 'shield':
          newShield = true;
          newScore += GAME_CONFIG.scoring.pickup;
          newLastPickup = 'shield';
          consumeEntity();
          break;

        case 'ammo':
          newAttack += GAME_CONFIG.pickups.ammoAmount;
          newScore += GAME_CONFIG.scoring.pickup;
          newLastPickup = 'ammo';
          consumeEntity();
          break;
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
        attack: newAttack,
        entities: newEntities,
        entityMap: newEntityMap,
        enemyCombo: 0,
        shield: newShield,
        totalCoins: newTotalCoins,
        wasTeleported: newWasTeleported,
        lastPickup: newLastPickup,
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

      if (targetIndex !== -1 && state.entityMap[targetIndex]?.type === 'enemy') {
        newEnemyCombo = Math.min(state.enemyCombo + 1, GAME_CONFIG.multipliers.maxCombo);
        newScore += killValue(newEnemyCombo);
        ({ entities: newEntities, entityMap: newEntityMap } = removeEntityAt(state, targetIndex));
      } else {
        newScore += GAME_CONFIG.scoring.missPenalty;
        newEnemyCombo = 0;
      }

      return {
        ...state,
        attack: state.attack - 1,
        score: Math.max(0, newScore),
        entities: newEntities,
        entityMap: newEntityMap,
        enemyCombo: newEnemyCombo,
        lastPickup: null,
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
        lastPickup: null,
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
