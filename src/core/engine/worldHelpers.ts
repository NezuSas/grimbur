// The pure helpers the reducer builds on: the world (entities by index), the hunters' turn, the Grimbur, pickups and teleports.
import { GameState, GameEntity, LETHAL_TYPES, HUNTER_TYPES, Direction, EntityType } from './types';
import { GAME_CONFIG } from '../../config/gameConfig';
import { createPRNG } from '../random/prng';
import { omenEffects } from './omens';
import { RelicId, relicCount, removeRelic } from './relics';

export const createEntityMap = (entities: GameEntity[]): Record<number, GameEntity> => {
  const map: Record<number, GameEntity> = {};
  for (const entity of entities) {
    map[entity.index] = entity;
  }
  return map;
};

export type World = { entities: GameEntity[]; entityMap: Record<number, GameEntity> };

/** Returns a new world without the entity at `index`. */
export const removeEntityAt = (world: World, index: number): World => {
  const entityMap = { ...world.entityMap };
  delete entityMap[index];
  return { entities: world.entities.filter(e => e.index !== index), entityMap };
};

/** Returns a new world where the entity at `index` is replaced by `next`. */
export const replaceEntityAt = (world: World, index: number, next: GameEntity): World => {
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
export const startingVisited = (cols: number, rows: number, lantern: boolean, entities: readonly GameEntity[] = []): number[] => {
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
export const tryAbsorb = (shield: boolean, relics: RelicId[]) => {
  if (shield) return { ok: true, shield: false, relics };
  if (relicCount(relics, 'phoenix') > 0) return { ok: true, shield, relics: removeRelic(relics, 'phoenix') };
  return { ok: false, shield, relics };
};

export const nonEmpty = <T,>(items: T[]): T[] | null => (items.length > 0 ? items : null);

/** What the hero already has, so drafts skip relics that would do nothing. */
export const draftContext = (state: Pick<GameState, 'perks'>) => ({
  startShield: state.perks.startShield,
  trapImmune: state.perks.trapImmune,
  startLit: state.perks.startLit,
});

/** The bomb's blast: removes every guardian and vortex in the 3x3 around `center` (never the Grimbur). */
export const blastWorld = (world: World, center: number, cols: number): World => {
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

export const hasBoss = (world: World) => world.entities.some(e => e.type === 'boss');

/** The tile one step from `index` in `direction`, or -1 at the board edge. */
export const neighbour = (index: number, direction: Direction, rows: number, cols: number): number => {
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
export const pickDeterministic = <T,>(pool: T[], seed: number, salt: number): T => {
  const next = createPRNG(seed + salt);
  next(); // discard the weakly-mixed first sample of the LCG
  return pool[Math.floor(next() * pool.length)];
};

/** Picks where a vortex sends the player. Prefers empty, unexplored tiles. */
export const pickTeleportDestination = (
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
 * One action of a hunter (the Grimbur or a stalker): it steps toward the player; when already
 * adjacent it first winds up (`charge`) and only strikes on its following action.
 */
export const hunterAct = (
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
export const huntersAct = (
  world: World,
  playerIndex: number,
  rows: number,
  cols: number,
  turn: number,
  slowdown: number,
  /** Stalkers (not the Grimbur) act this many actions sooner on the deepest depths. */
  haste = 0,
): { world: World; hits: EntityType[] } => {
  const hunters = world.entities.filter(e => HUNTER_TYPES.includes(e.type)).map(e => ({ index: e.index, type: e.type, hp: e.hp }));
  const hits: EntityType[] = [];
  let current = world;

  for (const hunter of hunters) {
    // A Grimbur down to its last heart is furious: it acts after every action (Frost Charm still slows it).
    const base = hunter.type === 'boss'
      ? (hunter.hp === 1 ? GAME_CONFIG.boss.furyMoveEvery : GAME_CONFIG.boss.moveEvery)
      : GAME_CONFIG.stalker.moveEvery - haste;
    const every = Math.max(1, base + slowdown);
    if (turn % every !== 0) continue;
    const acted = hunterAct(current, hunter.index, playerIndex, rows, cols);
    current = acted.world;
    if (acted.hit) hits.push(hunter.type);
  }
  return { world: current, hits };
};

/**
 * Decides the Grimbur' move: one step toward the player along the longer axis
 * (then the shorter one), onto an empty tile. Reaching the player is an attack.
 */
export const bossStep = (
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
export const hunterSlowdown = (relics: readonly RelicId[]): number =>
  relicCount(relics, 'frost') - relicCount(relics, 'hasty_boots');

export const manhattan = (a: number, b: number, cols: number): number =>
  Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs((a % cols) - (b % cols));

/** Sleeping guardians close enough to the player wake up and start hunting. */
export const wakeSleepers = (world: World, playerIndex: number, cols: number): World => {
  let current = world;
  for (const e of world.entities) {
    if (e.type === 'sleeper' && manhattan(e.index, playerIndex, cols) <= GAME_CONFIG.sleeper.wakeDistance) {
      current = replaceEntityAt(current, e.index, { index: e.index, type: 'stalker', charge: 0 });
    }
  }
  return current;
};

/** Shop gems one collected gem is worth: the Idol doubles it, a bounty floor adds one per second gem, Lucky Coins sometimes add one. */
export const gemYield = (
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
export const LUCKY_COIN_CHANCE = 0.2;

/** One heart off the Grimbur. A wounded (still living) Grimbur may call a stalker beside itself, at most `maxCalls` per fight. */
export const hurtBoss = (
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
