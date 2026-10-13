import { GameState, GameAction, GameEntity, PickupKind, LETHAL_TYPES, HUNTER_TYPES, Direction, EntityType } from './types';
import { GAME_CONFIG } from '../../config/gameConfig';
import { createPRNG } from '../random/prng';
import { coinReward, killValue, levelClearBonus } from './scoring';
import { omenEffects, omenFor } from './omens';
import { NO_PERKS } from './heroes';
import { modifiersFor } from './ascension';
import { RelicId, draftRelics, relicCount, removeRelic } from './relics';

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

/** Tiles explored at the start of a floor; the Old Lantern reveals the area around the spawn. */
const startingVisited = (cols: number, rows: number, lantern: boolean): number[] => {
  if (!lantern) return [0];
  const tiles: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r + c <= 3) tiles.push(r * cols + c);
    }
  }
  return tiles;
};

/** A shield, then a Phoenix Feather, soaks one deadly touch. */
const tryAbsorb = (shield: boolean, relics: RelicId[]) => {
  if (shield) return { ok: true, shield: false, relics };
  if (relicCount(relics, 'phoenix') > 0) return { ok: true, shield, relics: removeRelic(relics, 'phoenix') };
  return { ok: false, shield, relics };
};

const nonEmpty = <T,>(items: T[]): T[] | null => (items.length > 0 ? items : null);

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
    if (idx === vortexIndex || idx === state.playerIndex) continue;
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

  // The only safe place left may be the tile the player just came from.
  if (pool.length === 0) return state.entityMap[state.playerIndex] ? null : state.playerIndex;
  return pickDeterministic(pool, state.seed, vortexIndex * 31 + visited.length);
};

/**
 * One action of a hunter (the Wumpus or a stalker): it steps toward the player; when already
 * adjacent it first winds up (`charge`) and only strikes on its following action.
 */
const hunterAct = (
  world: World,
  hunterIndex: number,
  playerIndex: number,
  rows: number,
  cols: number,
): { world: World; hit: boolean } => {
  const hunter = world.entityMap[hunterIndex];
  if (!hunter) return { world, hit: false };

  const step = bossStep(hunter.index, playerIndex, rows, cols, world.entityMap);
  if (step.kind === 'move') {
    return { world: replaceEntityAt(world, hunter.index, { ...hunter, index: step.to, charge: 0 }), hit: false };
  }
  if (step.kind === 'attack') {
    if ((hunter.charge ?? 0) >= 1) {
      return { world: replaceEntityAt(world, hunter.index, { ...hunter, charge: 0 }), hit: true };
    }
    return { world: replaceEntityAt(world, hunter.index, { ...hunter, charge: 1 }), hit: false };
  }
  return { world, hit: false };
};

/**
 * Lets every hunter that is due on `turn` act. Returns the types of the hunters that struck
 * (each one has to be absorbed or kills the player).
 */
const huntersAct = (
  world: World,
  playerIndex: number,
  rows: number,
  cols: number,
  turn: number,
  slowdown: number,
): { world: World; hits: EntityType[] } => {
  const hunters = world.entities.filter(e => HUNTER_TYPES.includes(e.type)).map(e => ({ index: e.index, type: e.type }));
  const hits: EntityType[] = [];
  let current = world;

  for (const hunter of hunters) {
    const every = (hunter.type === 'boss' ? GAME_CONFIG.boss.moveEvery : GAME_CONFIG.stalker.moveEvery) + slowdown;
    if (turn % every !== 0) continue;
    const acted = hunterAct(current, hunter.index, playerIndex, rows, cols);
    current = acted.world;
    if (acted.hit) hits.push(hunter.type);
  }
  return { world: current, hits };
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
  ascension: 0,
  draftBonus: 0,
  totalCoins: 0,
  deathCause: null,
  wasTeleported: false,
  perks: NO_PERKS,
  relics: [],
  pendingDraft: null,
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
      if (state.isGameOver || state.isLevelUp || state.pendingDraft) return state;

      const { rows, cols, perks } = state;
      const has = (id: Parameters<typeof relicCount>[1]) => relicCount(state.relics, id);
      const { direction } = action;

      let nextIndex = neighbour(state.playerIndex, direction, rows, cols);
      if (nextIndex === -1) {
        return { ...state, facingDir: direction, lastPickup: null };
      }

      const isNewTile = !state.visited.includes(nextIndex);
      let newVisited = isNewTile
        ? [...state.visited, nextIndex]
        : [...state.visited];

      let newScore = Math.max(0, state.score + (has('iron_boots') ? 0 : GAME_CONFIG.scoring.stepCost));
      if (isNewTile) newScore += GAME_CONFIG.scoring.newTile * perks.newTileMultiplier;

      let newIsGameOver: boolean = false;
      let newCoins = state.coins;
      let newAttack = state.attack;
      let world: World = { entities: state.entities, entityMap: state.entityMap };
      let newShield = state.shield;
      let newRelics = state.relics;
      let newTotalCoins = state.totalCoins;
      let newDeathCause: GameState['deathCause'] = null;
      let newWasTeleported = false;
      let newLastPickup: PickupKind | null = null;

      /** A shield or a Phoenix Feather soaks one deadly touch. */
      let absorbedThisMove = false;
      const absorbHit = (): boolean => {
        const absorbed = tryAbsorb(newShield, newRelics);
        if (!absorbed.ok) return false;
        newShield = absorbed.shield;
        newRelics = absorbed.relics;
        absorbedThisMove = true;
        return true;
      };

      const consumeEntity = () => {
        world = removeEntityAt(world, nextIndex);
      };

      // O(1) collision check via the entity map
      const entityAtPoint = state.entityMap[nextIndex];

      switch (entityAtPoint?.type) {
        case 'enemy':
        case 'stalker':
          if (absorbHit()) {
            // The shield (or feather) breaks and takes the guardian with it.
            consumeEntity();
          } else {
            newIsGameOver = true;
            newDeathCause = entityAtPoint.type;
          }
          break;

        case 'boss':
          if (absorbHit()) {
            // Throws the player back; the Wumpus survives. No movement, so no step cost or bonus.
            nextIndex = state.playerIndex;
            newVisited = [...state.visited];
            newScore = state.score;
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
          newScore += coinReward(state.level, perks.coinMultiplier * omenEffects(omenFor(state.runSeed, state.level)).gemMultiplier, has('lucky_coin'));
          newCoins -= 1;
          newTotalCoins += 1;
          consumeEntity();
          break;

        case 'trap':
          if (!perks.trapImmune && !has('trap_sense')) {
            newScore += GAME_CONFIG.scoring.trapPenalty * modifiersFor(state.ascension).trapPenaltyMultiplier;
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

      // Taking the last gem clears the floor before anything can strike, and a hit that was just soaked
      // by a shield (or feather) stuns the hunters for this action, so one move never costs two protections.
      const newTurn = state.turn + 1;
      const floorCleared = newCoins === 0 && !newIsGameOver && !hasBoss(world);
      if (!newIsGameOver && !floorCleared && !absorbedThisMove) {
        const acted = huntersAct(world, nextIndex, rows, cols, newTurn, has('frost'));
        world = acted.world;
        for (const hitter of acted.hits) {
          if (!absorbHit()) {
            newIsGameOver = true;
            newDeathCause = hitter;
            break;
          }
        }
      }

      let newIsLevelUp: boolean = state.isLevelUp;
      if (floorCleared && !newIsGameOver) {
        newScore += Math.round(levelClearBonus(state.level) * (1 + 0.5 * has('greed')));
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
        relics: newRelics,
        totalCoins: newTotalCoins,
        wasTeleported: newWasTeleported,
        lastPickup: newLastPickup,
        turn: newTurn,
        deathCause: newIsGameOver ? newDeathCause : null,
      };
    }

    case 'ATTACK': {
      if (state.isGameOver || state.isLevelUp || state.pendingDraft || state.attack <= 0) return state;

      const { rows, cols } = state;

      // The arrow flies up to `arrowReach` tiles and hits the first hostile one.
      let targetIndex = -1;
      let cursor = state.playerIndex;
      for (let step = 0; step < state.perks.arrowReach + relicCount(state.relics, 'long_bow'); step++) {
        cursor = neighbour(cursor, state.facingDir, rows, cols);
        if (cursor === -1) break;
        const type = state.entityMap[cursor]?.type;
        if (type === 'enemy' || type === 'boss' || type === 'stalker') {
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
            newScore += Math.round(levelClearBonus(state.level) * (1 + 0.5 * relicCount(state.relics, 'greed')));
            newIsLevelUp = true;
            newIsVictory = true;
          }
        }
        newEnemyCombo = 0;
      } else if (target?.type === 'enemy' || target?.type === 'stalker') {
        newEnemyCombo = Math.min(
          state.enemyCombo + 1,
          GAME_CONFIG.multipliers.maxCombo + relicCount(state.relics, 'hunter'),
        );
        newScore += killValue(newEnemyCombo);
        world = removeEntityAt(world, targetIndex);
      } else {
        newScore += GAME_CONFIG.scoring.missPenalty;
        newEnemyCombo = 0;
      }

      // Shooting is a turn: the hunting Wumpus keeps closing in while you aim.
      let newShield = state.shield;
      let newRelics = state.relics;
      let newIsGameOver = false;
      let newDeathCause: GameState['deathCause'] = null;
      const newTurn = state.turn + 1;

      if (!newIsLevelUp) {
        const acted = huntersAct(world, state.playerIndex, rows, cols, newTurn, relicCount(state.relics, 'frost'));
        world = acted.world;
        for (const hitter of acted.hits) {
          const absorbed = tryAbsorb(newShield, newRelics);
          if (absorbed.ok) {
            newShield = absorbed.shield;
            newRelics = absorbed.relics;
          } else {
            newIsGameOver = true;
            newDeathCause = hitter;
            break;
          }
        }
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
        isGameOver: newIsGameOver,
        deathCause: newIsGameOver ? newDeathCause : null,
        shield: newShield,
        relics: newRelics,
        turn: newTurn,
        lastPickup: null,
      };
    }

    case 'LEVEL_UP': {
      // Only a cleared, non-final floor with no draft pending can advance (guards double dispatches).
      if (!state.isLevelUp || state.isVictory || state.pendingDraft || state.isGameOver) return state;
      const { rows, cols, entities, coins, attack, seed } = action.payload;
      return {
        ...state,
        level: state.level + 1,
        rows,
        cols,
        entities,
        entityMap: createEntityMap(entities),
        coins,
        attack: attack + state.perks.bonusArrows + relicCount(state.relics, 'quiver'),
        shield: state.shield || state.perks.startShield || relicCount(state.relics, 'bulwark') > 0,
        seed: seed || state.seed,
        playerIndex: 0,
        visited: startingVisited(cols, rows, relicCount(state.relics, 'lantern') > 0),
        // With every relic maxed there is nothing to offer: no draft, rather than an empty one that blocks input.
        pendingDraft: nonEmpty(draftRelics(state.runSeed, state.level, state.relics, modifiersFor(state.ascension).draftSize + state.draftBonus)),
        turn: 0,
        isLevelUp: false,
        isGameOver: false,
        enemyCombo: 0,
        deathCause: null,
        lastPickup: null,
      };
    }

    case 'PICK_RELIC': {
      if (!state.pendingDraft || !state.pendingDraft.includes(action.id)) return state;

      const relics = [...state.relics, action.id];
      return {
        ...state,
        relics,
        pendingDraft: null,
        // Relics with an immediate effect on the floor that is already loaded:
        attack: action.id === 'quiver' ? state.attack + 2 : state.attack,
        shield: action.id === 'bulwark' ? true : state.shield,
        visited: action.id === 'lantern'
          ? Array.from(new Set([...state.visited, ...startingVisited(state.cols, state.rows, true)]))
          : state.visited,
      };
    }

    case 'RESET': {
      const { character, rows, cols, entities, coins, attack, seed, mode, runSeed, perks, ascension, draftBonus, startShield, startRelics } = action;
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
        shield: heroPerks.startShield || startShield === true,
        perks: heroPerks,
        seed: seed || Date.now(),
        runSeed: runSeed ?? seed ?? 0,
        mode: mode ?? 'expedition',
        ascension: ascension ?? 0,
        draftBonus: draftBonus ?? 0,
        relics: startRelics ? [...startRelics] : [],
        visited: [0],
        playerIndex: 0,
        totalCoins: 0,
      };
    }

    default:
      return state;
  }
}
