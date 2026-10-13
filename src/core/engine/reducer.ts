import { GameState, GameAction, GameEntity, PickupKind, LETHAL_TYPES, Direction } from './types';
import { GAME_CONFIG } from '../../config/gameConfig';
import { createPRNG } from '../random/prng';
import { coinValue, killValue, levelClearBonus } from './scoring';
import { NO_PERKS } from './heroes';

// ─── Helpers ───────────────────────────────────────────────────────────────
const createEntityMap = (entities: GameEntity[]): Record<number, GameEntity> => {
  const map: Record<number, GameEntity> = {};
  for (const entity of entities) {
    map[entity.index] = entity;
  }
  return map;
};

type World = { entities: GameEntity[]; entityMap: Record<number, GameEntity> };

/** Returns a new world without the entity at `index`. */
const removeEntityAt = (world: World, index: number): World => {
  const entityMap = { ...world.entityMap };
  delete entityMap[index];
  return { entities: world.entities.filter(e => e.index !== index), entityMap };
};

/** Returns a new world where the entity at `index` is replaced by `next`. */
const replaceEntityAt = (world: World, index: number, next: GameEntity): World => {
  const entityMap = { ...world.entityMap };
  delete entityMap[index];
  entityMap[next.index] = next;
  return {
    entities: world.entities.map(e => (e.index === index ? next : e)),
    entityMap,
  };
};

const hasBoss = (world: World) => world.entities.some(e => e.type === 'boss');

/** The tile one step from `index` in `direction`, or -1 at the board edge. */
const neighbour = (index: number, direction: Direction, rows: number, cols: number): number => {
  const isTop    = index < cols;
  const isBottom = index >= cols * (rows - 1);
  const isLeft   = index % cols === 0;
  const isRight  = (index + 1) % cols === 0;

  if (direction === 'UP'    && !isTop)    return index - cols;
  if (direction === 'DOWN'  && !isBottom) return index + cols;
  if (direction === 'LEFT'  && !isLeft)   return index - 1;
  if (direction === 'RIGHT' && !isRight)  return index + 1;
  return -1;
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

/**
 * Decides the Wumpus' move: one step toward the player along the longer axis
 * (then the shorter one), onto an empty tile. Reaching the player is an attack.
 */
const bossStep = (
  bossIndex: number,
  playerIndex: number,
  rows: number,
  cols: number,
  entityMap: Record<number, GameEntity>,
): { kind: 'attack' } | { kind: 'move'; to: number } | { kind: 'stay' } => {
  const dr = Math.floor(playerIndex / cols) - Math.floor(bossIndex / cols);
  const dc = (playerIndex % cols) - (bossIndex % cols);

  const vertical: Direction | null = dr === 0 ? null : dr > 0 ? 'DOWN' : 'UP';
  const horizontal: Direction | null = dc === 0 ? null : dc > 0 ? 'RIGHT' : 'LEFT';
  const order = Math.abs(dr) >= Math.abs(dc) ? [vertical, horizontal] : [horizontal, vertical];

  for (const direction of order) {
    if (!direction) continue;
    const target = neighbour(bossIndex, direction, rows, cols);
    if (target === -1) continue;
    if (target === playerIndex) return { kind: 'attack' };
    if (!entityMap[target]) return { kind: 'move', to: target };
  }
  return { kind: 'stay' };
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
  runSeed: 0,
  mode: 'expedition',
  totalCoins: 0,
  deathCause: null,
  wasTeleported: false,
  perks: NO_PERKS,
  turn: 0,
  isVictory: false,
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

      const { rows, cols, perks } = state;
      const { direction } = action;

      let nextIndex = neighbour(state.playerIndex, direction, rows, cols);
      if (nextIndex === -1) {
        return { ...state, facingDir: direction, lastPickup: null };
      }

      const isNewTile = !state.visited.includes(nextIndex);
      let newVisited = isNewTile
        ? [...state.visited, nextIndex]
        : [...state.visited];

      let newScore = Math.max(0, state.score + GAME_CONFIG.scoring.stepCost);
      if (isNewTile) newScore += GAME_CONFIG.scoring.newTile * perks.newTileMultiplier;

      let newIsGameOver: boolean = false;
      let newCoins = state.coins;
      let newAttack = state.attack;
      let world: World = { entities: state.entities, entityMap: state.entityMap };
      let newShield = state.shield;
      let newTotalCoins = state.totalCoins;
      let newDeathCause: GameState['deathCause'] = null;
      let newWasTeleported = false;
      let newLastPickup: PickupKind | null = null;

      const consumeEntity = () => {
        world = removeEntityAt(world, nextIndex);
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

        case 'boss':
          if (state.shield) {
            // The shield breaks and throws the player back; the Wumpus survives.
            newShield = false;
            nextIndex = state.playerIndex;
            newVisited = [...state.visited];
          } else {
            newIsGameOver = true;
            newDeathCause = 'boss';
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
          newScore += Math.round(coinValue(state.level) * perks.coinMultiplier);
          newCoins -= 1;
          newTotalCoins += 1;
          consumeEntity();
          break;

        case 'trap':
          if (!perks.trapImmune) {
            newScore += GAME_CONFIG.scoring.trapPenalty;
            newLastPickup = 'trap';
          }
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

      // The Wumpus hunts: every Nth move it steps toward the player.
      const newTurn = state.turn + 1;
      if (!newIsGameOver && hasBoss(world) && newTurn % GAME_CONFIG.boss.moveEvery === 0) {
        const boss = world.entities.find(e => e.type === 'boss')!;
        const step = bossStep(boss.index, nextIndex, rows, cols, world.entityMap);

        if (step.kind === 'move') {
          world = replaceEntityAt(world, boss.index, { ...boss, index: step.to });
        } else if (step.kind === 'attack') {
          if (newShield) {
            newShield = false; // absorbed; the Wumpus stays where it is
          } else {
            newIsGameOver = true;
            newDeathCause = 'boss';
          }
        }
      }

      let newIsLevelUp: boolean = state.isLevelUp;
      if (newCoins === 0 && !newIsGameOver && !hasBoss(world)) {
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
        entities: world.entities,
        entityMap: world.entityMap,
        enemyCombo: 0,
        shield: newShield,
        totalCoins: newTotalCoins,
        wasTeleported: newWasTeleported,
        lastPickup: newLastPickup,
        turn: newTurn,
        deathCause: newIsGameOver ? newDeathCause : null,
      };
    }

    case 'ATTACK': {
      if (state.isGameOver || state.isLevelUp || state.attack <= 0) return state;

      const { rows, cols } = state;

      // The arrow flies up to `arrowReach` tiles and hits the first hostile one.
      let targetIndex = -1;
      let cursor = state.playerIndex;
      for (let step = 0; step < state.perks.arrowReach; step++) {
        cursor = neighbour(cursor, state.facingDir, rows, cols);
        if (cursor === -1) break;
        const type = state.entityMap[cursor]?.type;
        if (type === 'enemy' || type === 'boss') {
          targetIndex = cursor;
          break;
        }
      }

      let world: World = { entities: state.entities, entityMap: state.entityMap };
      let newScore = state.score;
      let newEnemyCombo = state.enemyCombo;
      let newIsLevelUp = false;
      let newIsVictory = false;

      const target = targetIndex !== -1 ? state.entityMap[targetIndex] : undefined;

      if (target?.type === 'boss') {
        const hp = (target.hp ?? GAME_CONFIG.boss.hp) - 1;
        if (hp > 0) {
          newScore += GAME_CONFIG.boss.hitScore;
          world = replaceEntityAt(world, targetIndex, { ...target, hp });
        } else {
          newScore += GAME_CONFIG.boss.killScore;
          world = removeEntityAt(world, targetIndex);
          if (state.coins === 0) {
            newScore += levelClearBonus(state.level);
            newIsLevelUp = true;
            newIsVictory = true;
          }
        }
        newEnemyCombo = 0;
      } else if (target?.type === 'enemy') {
        newEnemyCombo = Math.min(state.enemyCombo + 1, GAME_CONFIG.multipliers.maxCombo);
        newScore += killValue(newEnemyCombo);
        world = removeEntityAt(world, targetIndex);
      } else {
        newScore += GAME_CONFIG.scoring.missPenalty;
        newEnemyCombo = 0;
      }

      return {
        ...state,
        attack: state.attack - 1,
        score: Math.max(0, newScore),
        entities: world.entities,
        entityMap: world.entityMap,
        enemyCombo: newEnemyCombo,
        isLevelUp: newIsLevelUp,
        isVictory: newIsVictory,
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
        attack: attack + state.perks.bonusArrows,
        shield: state.shield || state.perks.startShield,
        seed: seed || state.seed,
        playerIndex: 0,
        visited: [0],
        turn: 0,
        isLevelUp: false,
        isGameOver: false,
        enemyCombo: 0,
        deathCause: null,
        lastPickup: null,
      };
    }

    case 'RESET': {
      const { character, rows, cols, entities, coins, attack, seed, mode, runSeed, perks } = action;
      const heroPerks = perks ?? NO_PERKS;
      return {
        ...initialState,
        selectedCharacter: character,
        rows,
        cols,
        entities,
        entityMap: createEntityMap(entities),
        coins,
        attack: attack + heroPerks.bonusArrows,
        shield: heroPerks.startShield,
        perks: heroPerks,
        seed: seed || Date.now(),
        runSeed: runSeed ?? seed ?? 0,
        mode: mode ?? 'expedition',
        visited: [0],
        playerIndex: 0,
        totalCoins: 0,
      };
    }

    default:
      return state;
  }
}
