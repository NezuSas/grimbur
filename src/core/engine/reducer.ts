import { GameState, GameAction, GameEntity, PickupKind, LETHAL_TYPES, HUNTER_TYPES, GUARDIAN_TYPES, Direction, EntityType, UndoSnapshot } from './types';
import { GAME_CONFIG } from '../../config/gameConfig';
import { createPRNG } from '../random/prng';
import { coinReward, killValue, levelClearBonus } from './scoring';
import { omenEffects } from './omens';
import { NO_PERKS } from './heroes';
import { modifiersFor } from './ascension';
import { RelicId, draftRelics, relicCount, removeRelic } from './relics';
import { SHOP_PRICES, SHOP_ARROWS, MAX_ITEMS, abilityCooldown } from './shop';
import { provenSafeTiles } from './solver';
import { VOLLEY_REACH, VOLLEY_TARGETS, FLARE_REACH } from './abilities';

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

/**
 * Tiles explored at the start of a floor; the Old Lantern (or Mira's Lightbearer) reveals the area around the spawn.
 * A hazard is never lit: its tile stays hidden, only the clues around it show.
 */
const startingVisited = (cols: number, rows: number, lantern: boolean, entities: readonly GameEntity[] = []): number[] => {
  if (!lantern) return [0];
  const lethal = new Set(entities.filter(e => LETHAL_TYPES.includes(e.type)).map(e => e.index));
  const tiles: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r + c <= 3 && !lethal.has(r * cols + c)) tiles.push(r * cols + c);
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

/** What the hero already has, so drafts skip relics that would do nothing. */
const draftContext = (state: Pick<GameState, 'perks'>) => ({
  startShield: state.perks.startShield,
  trapImmune: state.perks.trapImmune,
  startLit: state.perks.startLit,
});

/** The bomb's blast: removes every guardian and vortex in the 3x3 around `center` (never the Wumpus). */
const blastWorld = (world: World, center: number, cols: number): World => {
  const pr = Math.floor(center / cols);
  const pc = center % cols;
  for (const e of world.entities) {
    if (e.type === 'boss' || !LETHAL_TYPES.includes(e.type)) continue;
    if (Math.abs(Math.floor(e.index / cols) - pr) <= 1 && Math.abs((e.index % cols) - pc) <= 1) {
      world = removeEntityAt(world, e.index);
    }
  }
  return world;
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

  // Mostly an unexplored empty tile (free information), but sometimes a tile the player already knows: the vortex
  // then only scrambles their bearings. Decided by the seed, so the reducer stays pure.
  const salt = vortexIndex * 31 + visited.length;
  const revisitRoll = createPRNG(state.seed + salt + 977);
  revisitRoll();
  const wantsRevisit = revisitRoll() < GAME_CONFIG.vortex.revisitChance;

  const pool =
    wantsRevisit && emptyVisited.length > 0 ? emptyVisited :
    emptyUnvisited.length > 0 ? emptyUnvisited :
    emptyVisited.length > 0 ? emptyVisited :
    nonLethal;

  // The only safe place left may be the tile the player just came from.
  if (pool.length === 0) return state.entityMap[state.playerIndex] ? null : state.playerIndex;
  return pickDeterministic(pool, state.seed, salt);
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
  const hunters = world.entities.filter(e => HUNTER_TYPES.includes(e.type)).map(e => ({ index: e.index, type: e.type, hp: e.hp }));
  const hits: EntityType[] = [];
  let current = world;

  for (const hunter of hunters) {
    // A Wumpus down to its last heart is furious: it acts after every action (Frost Charm still slows it).
    const base = hunter.type === 'boss'
      ? (hunter.hp === 1 ? GAME_CONFIG.boss.furyMoveEvery : GAME_CONFIG.boss.moveEvery)
      : GAME_CONFIG.stalker.moveEvery;
    const every = Math.max(1, base + slowdown);
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

/** Hunters wait longer with a Frost Charm and act sooner in Hasty Boots. */
const hunterSlowdown = (relics: readonly RelicId[]): number =>
  relicCount(relics, 'frost') - relicCount(relics, 'hasty_boots');

const manhattan = (a: number, b: number, cols: number): number =>
  Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs((a % cols) - (b % cols));

/** Sleeping guardians close enough to the player wake up and start hunting. */
const wakeSleepers = (world: World, playerIndex: number, cols: number): World => {
  let current = world;
  for (const e of world.entities) {
    if (e.type === 'sleeper' && manhattan(e.index, playerIndex, cols) <= GAME_CONFIG.sleeper.wakeDistance) {
      current = replaceEntityAt(current, e.index, { index: e.index, type: 'stalker', charge: 0 });
    }
  }
  return current;
};

/** Shop gems one collected gem is worth: the Idol doubles it, a bounty floor adds one per second gem, Lucky Coins sometimes add one. */
const gemYield = (
  s: Pick<GameState, 'relics' | 'omen' | 'seed' | 'turn'>,
  totalAfter: number,
): number => {
  let n = relicCount(s.relics, 'greedy_idol') > 0 ? 2 : 1;
  const every = omenEffects(s.omen).shopGemEvery;
  if (every > 0 && totalAfter % every === 0) n += 1;
  const lucky = relicCount(s.relics, 'lucky_coin');
  if (lucky > 0) {
    const roll = createPRNG(s.seed + s.turn * 131 + totalAfter * 17 + 7);
    roll(); // discard the weakly-mixed first sample
    if (roll() < LUCKY_COIN_CHANCE * lucky) n += 1;
  }
  return n;
};

/** Chance per Lucky Coin that a gem also gives one more shop gem. */
const LUCKY_COIN_CHANCE = 0.2;

/** One heart off the Wumpus. A wounded (still living) Wumpus may call a stalker beside itself, at most `maxCalls` per fight. */
const hurtBoss = (
  world: World,
  bossIndex: number,
  state: Pick<GameState, 'seed' | 'turn' | 'rows' | 'cols' | 'playerIndex'>,
): { world: World; killed: boolean } => {
  const boss = world.entityMap[bossIndex];
  const hp = (boss.hp ?? GAME_CONFIG.boss.hp) - 1;
  if (hp <= 0) return { world: removeEntityAt(world, bossIndex), killed: true };

  let calls = boss.calls ?? 0;
  let next = replaceEntityAt(world, bossIndex, { ...boss, hp, calls });
  if (calls < GAME_CONFIG.boss.maxCalls) {
    const roll = createPRNG(state.seed + state.turn * 977 + bossIndex);
    roll();
    if (roll() < GAME_CONFIG.boss.callChance) {
      const spots = (['UP', 'DOWN', 'LEFT', 'RIGHT'] as Direction[])
        .map(d => neighbour(bossIndex, d, state.rows, state.cols))
        .filter(n => n !== -1 && n !== state.playerIndex && !next.entityMap[n]);
      if (spots.length > 0) {
        const spot = spots[Math.floor(roll() * spots.length)];
        calls += 1;
        next = replaceEntityAt(next, bossIndex, { ...next.entityMap[bossIndex], calls });
        const called: GameEntity = { index: spot, type: 'stalker', charge: 0 };
        next = { entities: [...next.entities, called], entityMap: { ...next.entityMap, [spot]: called } };
      }
    }
  }
  return { world: next, killed: false };
};

/** The state without its undo slot: what a step back restores. */
const snapshotOf = (state: GameState): UndoSnapshot => {
  const { undo: _undo, ...rest } = state;
  return rest;
};

/**
 * Finishes an action that is not a step (ability, bomb): it takes a turn, clears the floor when the last gem or the
 * Wumpus is gone and otherwise lets the hunters act. `patch` carries what the action changed.
 */
const settle = (state: GameState, world: World, patch: Partial<GameState>): GameState => {
  const { rows, cols } = state;
  const hadBoss = hasBoss({ entities: state.entities, entityMap: state.entityMap });
  const coins = patch.coins ?? state.coins;
  let score = patch.score ?? state.score;
  let shield = patch.shield ?? state.shield;
  let relics = patch.relics ?? state.relics;
  const turn = state.turn + 1;
  const cleared = coins === 0 && !hasBoss(world);
  let over = false;
  let cause: GameState['deathCause'] = null;

  let gems = patch.gems ?? state.gems;
  if (cleared) {
    score += Math.round(levelClearBonus(state.level) * (1 + 0.5 * relicCount(relics, 'greed')));
    gems += relicCount(relics, 'greed');
  } else {
    world = wakeSleepers(world, state.playerIndex, cols);
    const acted = huntersAct(world, state.playerIndex, rows, cols, turn, hunterSlowdown(relics));
    world = acted.world;
    for (const hitter of acted.hits) {
      const absorbed = tryAbsorb(shield, relics);
      if (absorbed.ok) {
        shield = absorbed.shield;
        relics = absorbed.relics;
      } else {
        over = true;
        cause = hitter;
        break;
      }
    }
  }

  return {
    ...state,
    ...patch,
    score: Math.max(0, score),
    entities: world.entities,
    entityMap: world.entityMap,
    shield,
    relics,
    gems,
    turn,
    isLevelUp: cleared,
    isVictory: cleared && hadBoss && state.mode !== 'endless',
    isGameOver: over,
    deathCause: over ? cause : null,
    abilityCd: patch.abilityCd ?? Math.max(0, state.abilityCd - 1),
    undo: null,
    lastPickup: null,
    vortexCost: null,
  };
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
  vortexCost: null,
  perks: NO_PERKS,
  relics: [],
  pendingDraft: null,
  turn: 0,
  isVictory: false,
  lastPickup: null,
  gems: 0,
  items: { detector: 0, bomb: 0 },
  abilityCd: 0,
  omen: null,
  marked: [],
  pendingArrows: 0,
  altarPending: false,
  altarUsed: false,
  undo: null,
  undoUsed: false,
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
        return { ...state, facingDir: direction, lastPickup: null, vortexCost: null };
      }

      const isNewTile = !state.visited.includes(nextIndex);
      let newVisited = isNewTile
        ? [...state.visited, nextIndex]
        : [...state.visited];

      let newScore = Math.max(0, state.score + (has('iron_boots') ? 0 : GAME_CONFIG.scoring.stepCost));
      if (isNewTile) newScore += GAME_CONFIG.scoring.newTile * perks.newTileMultiplier * (has('hasty_boots') ? 3 : 1);

      let newIsGameOver: boolean = false;
      let newCoins = state.coins;
      let newAttack = state.attack;
      let world: World = { entities: state.entities, entityMap: state.entityMap };
      let newShield = state.shield;
      let newRelics = state.relics;
      let newTotalCoins = state.totalCoins;
      let newGems = state.gems;
      let newDeathCause: GameState['deathCause'] = null;
      let newWasTeleported = false;
      let newLastPickup: PickupKind | null = null;
      let newVortexCost: 'arrow' | 'gem' | null = null;

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
        case 'sleeper':
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
            // The vortex takes a toll: one arrow, or else one shop gem, or else nothing.
            if (newAttack > 0) {
              newAttack -= 1;
              newVortexCost = 'arrow';
            } else if (newGems > 0) {
              newGems -= 1;
              newVortexCost = 'gem';
            }
            if (!newVisited.includes(destination)) {
              newVisited = [...newVisited, destination];
            }
          }
          break;
        }

        case 'coin':
          newScore += coinReward(state.level, perks.coinMultiplier * omenEffects(state.omen).gemMultiplier * (has('blood_pact') ? 1.5 : 1), has('lucky_coin'));
          newCoins -= 1;
          newTotalCoins += 1;
          newGems += gemYield(state, newTotalCoins);
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
      const floorCleared = newCoins === 0 && !newIsGameOver && !hasBoss(world);
      // Wayfarer Boots: retracing explored ground (outside the lair) does not move the hunters' clocks at all.
      const retracing = has('iron_boots') && !isNewTile && !entityAtPoint && !hasBoss(world);
      const newTurn = retracing ? state.turn : state.turn + 1;
      if (!newIsGameOver && !floorCleared) {
        // Sleepers wake whenever the player ends an action near them, even when a shield just soaked a hit.
        world = wakeSleepers(world, nextIndex, cols);
      }
      if (!newIsGameOver && !floorCleared && !absorbedThisMove && !retracing) {
        const acted = huntersAct(world, nextIndex, rows, cols, newTurn, hunterSlowdown(state.relics));
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
        newGems += has('greed');
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
        gems: newGems,
        wasTeleported: newWasTeleported,
        vortexCost: newVortexCost,
        lastPickup: newLastPickup,
        turn: newTurn,
        abilityCd: Math.max(0, state.abilityCd - 1),
        // One step per floor can be taken back, never the one that ended the run or cleared the floor.
        undo: state.undoUsed || newIsGameOver || newIsLevelUp ? null : snapshotOf(state),
        deathCause: newIsGameOver ? newDeathCause : null,
      };
    }

    case 'ATTACK': {
      if (state.isGameOver || state.isLevelUp || state.pendingDraft || state.attack <= 0) return state;

      const { rows, cols } = state;
      // An aimed shot turns the hero toward the target first; a plain shot keeps the current facing.
      const aim = action.direction ?? state.facingDir;

      // The arrow flies up to `arrowReach` tiles and hits the first hostile one.
      let targetIndex = -1;
      let cursor = state.playerIndex;
      for (let step = 0; step < state.perks.arrowReach + relicCount(state.relics, 'long_bow') + 2 * relicCount(state.relics, 'glass_bow'); step++) {
        cursor = neighbour(cursor, aim, rows, cols);
        if (cursor === -1) break;
        const type = state.entityMap[cursor]?.type;
        if (type === 'boss' || (type && GUARDIAN_TYPES.includes(type))) {
          targetIndex = cursor;
          break;
        }
      }

      let world: World = { entities: state.entities, entityMap: state.entityMap };
      let newScore = state.score;
      let newEnemyCombo = state.enemyCombo;
      let newIsLevelUp = false;
      let newIsVictory = false;
      let newGems = state.gems;

      const target = targetIndex !== -1 ? state.entityMap[targetIndex] : undefined;

      if (target?.type === 'boss') {
        const hurt = hurtBoss(world, targetIndex, state);
        world = hurt.world;
        if (!hurt.killed) {
          newScore += GAME_CONFIG.boss.hitScore;
        } else {
          newScore += GAME_CONFIG.boss.killScore;
          if (state.coins === 0) {
            newScore += Math.round(levelClearBonus(state.level) * (1 + 0.5 * relicCount(state.relics, 'greed')));
            newIsLevelUp = true;
            // The endless descent has no final lair: slaying the Wumpus just opens the next floor.
            newIsVictory = state.mode !== 'endless';
          }
        }
        newEnemyCombo = 0;
      } else if (target && GUARDIAN_TYPES.includes(target.type)) {
        newEnemyCombo = Math.min(
          state.enemyCombo + 1,
          GAME_CONFIG.multipliers.maxCombo + relicCount(state.relics, 'hunter'),
        );
        newScore += killValue(newEnemyCombo);
        world = removeEntityAt(world, targetIndex);
        if (relicCount(state.relics, 'hunter') > 0) newGems += 1; // Hunter's Mark: every kill drops a shop gem
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
        world = wakeSleepers(world, state.playerIndex, cols);
        const acted = huntersAct(world, state.playerIndex, rows, cols, newTurn, hunterSlowdown(state.relics));
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
        facingDir: aim,
        attack: state.attack - 1,
        gems: newGems + (newIsLevelUp ? relicCount(state.relics, 'greed') : 0),
        vortexCost: null,
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
        abilityCd: Math.max(0, state.abilityCd - 1),
        undo: null,
        lastPickup: null,
      };
    }

    case 'LEVEL_UP': {
      // Only a cleared, non-final floor with no draft pending can advance (guards double dispatches).
      if (!state.isLevelUp || state.isVictory || state.pendingDraft || state.isGameOver) return state;
      const { rows, cols, entities, coins, attack, seed, omen } = action.payload;
      let arrows = attack + state.perks.bonusArrows + relicCount(state.relics, 'quiver');
      if (relicCount(state.relics, 'blood_pact') > 0) arrows = Math.max(1, arrows - 1);
      if (relicCount(state.relics, 'glass_bow') > 0) arrows = Math.max(1, Math.floor(arrows / 2));
      // Arrows are a resource: some of the unused ones come along to the next floor.
      arrows += Math.min(GAME_CONFIG.arrows.carryOverCap, Math.max(0, state.attack));
      const draft = nonEmpty(draftRelics(state.runSeed, state.level, state.relics, modifiersFor(state.ascension).draftSize + state.draftBonus, draftContext(state)));
      return {
        ...state,
        level: state.level + 1,
        rows,
        cols,
        entities,
        entityMap: createEntityMap(entities),
        coins,
        attack: arrows + state.pendingArrows,
        pendingArrows: 0,
        shield: state.shield || state.perks.startShield || relicCount(state.relics, 'bulwark') > 0,
        seed: seed || state.seed,
        playerIndex: 0,
        visited: startingVisited(cols, rows, relicCount(state.relics, 'lantern') > 0 || state.perks.startLit, entities),
        // With every relic maxed there is nothing to offer: no draft, rather than an empty one that blocks input.
        pendingDraft: draft,
        altarPending: draft ? state.altarPending : false,
        altarUsed: false,
        omen: omen ?? null,
        marked: [],
        abilityCd: 0,
        undo: null,
        undoUsed: false,
        turn: 0,
        isLevelUp: false,
        isGameOver: false,
        enemyCombo: 0,
        deathCause: null,
        lastPickup: null,
        vortexCost: null,
        wasTeleported: false,
      };
    }

    case 'PICK_RELIC': {
      if (!state.pendingDraft || !state.pendingDraft.includes(action.id)) return state;

      const relics = [...state.relics, action.id];
      // The altar buys a second pick right after the first.
      const second = state.altarPending
        ? nonEmpty(draftRelics(state.runSeed, 500 + state.level, relics, modifiersFor(state.ascension).draftSize + state.draftBonus, draftContext(state)))
        : null;
      return {
        ...state,
        relics,
        pendingDraft: second,
        altarPending: false,
        // Relics with an immediate effect on the floor that is already loaded:
        attack: action.id === 'quiver' ? state.attack + 2 : state.attack,
        shield: action.id === 'bulwark' ? true : state.shield,
        visited: action.id === 'lantern'
          ? Array.from(new Set([...state.visited, ...startingVisited(state.cols, state.rows, true, state.entities)]))
          : state.visited,
      };
    }

    case 'BUY': {
      if (!state.isLevelUp || state.isVictory || state.pendingDraft || state.isGameOver) return state;
      const price = SHOP_PRICES[action.item];
      if (state.gems < price) return state;
      switch (action.item) {
        case 'arrows':
          return { ...state, gems: state.gems - price, pendingArrows: state.pendingArrows + SHOP_ARROWS };
        case 'shield':
          return state.shield ? state : { ...state, gems: state.gems - price, shield: true };
        case 'detector':
        case 'bomb':
          return state.items[action.item] >= MAX_ITEMS
            ? state
            : { ...state, gems: state.gems - price, items: { ...state.items, [action.item]: state.items[action.item] + 1 } };
        default:
          return state;
      }
    }

    case 'ALTAR': {
      if (!state.isLevelUp || state.isVictory || state.pendingDraft || state.isGameOver) return state;
      if (!state.shield || state.altarUsed) return state;
      return { ...state, shield: false, altarUsed: true, altarPending: true };
    }

    case 'USE_ITEM': {
      if (state.isGameOver || state.isLevelUp || state.pendingDraft || state.items[action.item] <= 0) return state;
      const items = { ...state.items, [action.item]: state.items[action.item] - 1 };

      if (action.item === 'detector') {
        // Shows every hostile tile within two steps; it costs no turn.
        const found = state.entities
          .filter(e => LETHAL_TYPES.includes(e.type) && manhattan(e.index, state.playerIndex, state.cols) <= 2)
          .map(e => e.index);
        return { ...state, items, marked: Array.from(new Set([...state.marked, ...found])) };
      }

      // Bomb: destroys every guardian and vortex in the 3x3 around the player (not the Wumpus), then the hunters act.
      const world = blastWorld({ entities: state.entities, entityMap: state.entityMap }, state.playerIndex, state.cols);
      return settle(state, world, { items, marked: state.marked.filter(i => world.entityMap[i]) });
    }

    case 'USE_ABILITY': {
      const ability = state.perks.ability;
      if (!ability || state.abilityCd > 0 || state.isGameOver || state.isLevelUp || state.pendingDraft) return state;
      const { rows, cols } = state;
      let world: World = { entities: state.entities, entityMap: state.entityMap };
      const cooldown = { abilityCd: abilityCooldown(ability) };

      if (ability === 'brace') {
        if (state.shield) return state;
        return settle(state, world, { ...cooldown, shield: true });
      }

      if (ability === 'scout') {
        // A safe unexplored tile beside the explored area that the player could NOT already deduce, preferring the one
        // with the most unexplored neighbours (the most new information); the nearest one breaks ties.
        const seen = new Set(state.visited);
        const known = provenSafeTiles(rows, cols, state.entities, state.visited);
        const candidates = new Set<number>();
        for (const v of state.visited) {
          for (const d of ['UP', 'DOWN', 'LEFT', 'RIGHT'] as Direction[]) {
            const n = neighbour(v, d, rows, cols);
            if (n !== -1 && !seen.has(n) && !(state.entityMap[n] && LETHAL_TYPES.includes(state.entityMap[n].type))) candidates.add(n);
          }
        }
        if (candidates.size === 0) return state;
        const unknownAround = (n: number) =>
          (['UP', 'DOWN', 'LEFT', 'RIGHT'] as Direction[]).filter(d => {
            const m = neighbour(n, d, rows, cols);
            return m !== -1 && !seen.has(m);
          }).length;
        const hidden = [...candidates].filter(n => !known.has(n));
        const pool = hidden.length > 0 ? hidden : [...candidates];
        const best = pool.reduce((a, b) => {
          const ua = unknownAround(a);
          const ub = unknownAround(b);
          if (ub !== ua) return ub > ua ? b : a;
          const da = manhattan(a, state.playerIndex, cols);
          const db = manhattan(b, state.playerIndex, cols);
          return db < da || (db === da && b < a) ? b : a;
        });
        return settle(state, world, { ...cooldown, visited: [...state.visited, best] });
      }

      if (ability === 'blast') {
        // The bomb's effect without spending a bomb.
        world = blastWorld(world, state.playerIndex, cols);
        return settle(state, world, { ...cooldown, marked: state.marked.filter(i => world.entityMap[i]) });
      }

      if (ability === 'flare') {
        // Every tile within two steps that is not lethal becomes explored; hazards stay hidden (their clues show).
        const seen = new Set(state.visited);
        const lit: number[] = [];
        for (let i = 0; i < rows * cols; i++) {
          if (seen.has(i) || manhattan(i, state.playerIndex, cols) > FLARE_REACH) continue;
          const e = state.entityMap[i];
          if (e && LETHAL_TYPES.includes(e.type)) continue;
          lit.push(i);
        }
        if (lit.length === 0) return state;
        return settle(state, world, { ...cooldown, visited: [...state.visited, ...lit] });
      }

      if (ability === 'magnet') {
        const gems = state.entities.filter(e => e.type === 'coin');
        if (gems.length === 0) return state;
        const nearest = gems.reduce((a, b) => (manhattan(b.index, state.playerIndex, cols) < manhattan(a.index, state.playerIndex, cols) ? b : a));
        world = removeEntityAt(world, nearest.index);
        const reward = coinReward(state.level, state.perks.coinMultiplier * omenEffects(state.omen).gemMultiplier * (relicCount(state.relics, 'blood_pact') > 0 ? 1.5 : 1), relicCount(state.relics, 'lucky_coin'));
        return settle(state, world, {
          ...cooldown,
          coins: state.coins - 1,
          totalCoins: state.totalCoins + 1,
          gems: state.gems + gemYield(state, state.totalCoins + 1),
          score: state.score + reward,
          visited: state.visited.includes(nearest.index) ? state.visited : [...state.visited, nearest.index],
        });
      }

      // volley: along the facing line, up to two guardians within reach; a Wumpus in the line takes one heart and stops it.
      let score = state.score;
      let combo = state.enemyCombo;
      let hits = 0;
      let bonusGems = 0;
      let cursor = state.playerIndex;
      for (let step = 0; step < VOLLEY_REACH && hits < VOLLEY_TARGETS; step++) {
        cursor = neighbour(cursor, state.facingDir, rows, cols);
        if (cursor === -1) break;
        const target = world.entityMap[cursor];
        if (!target) continue;
        if (target.type === 'boss') {
          const hurt = hurtBoss(world, cursor, state);
          world = hurt.world;
          score += hurt.killed ? GAME_CONFIG.boss.killScore : GAME_CONFIG.boss.hitScore;
          break;
        }
        if (GUARDIAN_TYPES.includes(target.type)) {
          combo = Math.min(combo + 1, GAME_CONFIG.multipliers.maxCombo + relicCount(state.relics, 'hunter'));
          score += killValue(combo);
          world = removeEntityAt(world, cursor);
          if (relicCount(state.relics, 'hunter') > 0) bonusGems += 1;
          hits++;
        }
      }
      return settle(state, world, { ...cooldown, score, enemyCombo: combo, gems: state.gems + bonusGems });
    }

    case 'UNDO': {
      if (!state.undo || state.undoUsed || state.isGameOver || state.isLevelUp || state.pendingDraft) return state;
      return { ...state.undo, undo: null, undoUsed: true };
    }

    case 'RESET': {
      const { character, rows, cols, entities, coins, attack, seed, mode, runSeed, perks, ascension, draftBonus, startShield, startRelics } = action;
      const heroPerks = perks ?? NO_PERKS;
      const startingRelics: RelicId[] = startRelics ? [...startRelics] : [];
      const withRelic = (id: RelicId) => relicCount(startingRelics, id) > 0;
      return {
        ...initialState,
        selectedCharacter: character,
        rows,
        cols,
        entities,
        entityMap: createEntityMap(entities),
        coins,
        // Relics the run begins with act at once, exactly as if they had just been picked: the Quiver adds its two
        // arrows, the Bulwark its shield and the Lantern lights the area around the start.
        attack: attack + heroPerks.bonusArrows + (withRelic('quiver') ? 2 : 0),
        shield: heroPerks.startShield || startShield === true || withRelic('bulwark'),
        perks: heroPerks,
        seed: seed || Date.now(),
        runSeed: runSeed ?? seed ?? 0,
        mode: mode ?? 'expedition',
        ascension: ascension ?? 0,
        draftBonus: draftBonus ?? 0,
        relics: startingRelics,
        visited: startingVisited(cols, rows, withRelic('lantern') || heroPerks.startLit, entities),
        items: { ...heroPerks.startItems },
        playerIndex: 0,
        totalCoins: 0,
      };
    }

    default:
      return state;
  }
}
