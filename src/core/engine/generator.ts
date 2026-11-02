import { getDifficulty } from '../difficulty/difficulty';
import { createPRNG } from '../random/prng';
import { GAME_CONFIG } from '../../config/gameConfig';
import { modifiersFor } from './ascension';
import { OmenId } from './omens';
import { floorEffects, type EventId } from './events';
import { BiomeId, BIOMES } from './biomes';
import { endlessPressure } from './lair';
import { isSolvableByDeduction } from './solver';
import { GameEntity, EntityType } from './types';

export interface BoardConfig {
  level: number;
  rows: number;
  cols: number;
  entities: GameEntity[];
  playerIndex: number;
  coins: number;
  attack: number;
  seed: number;
}

/**
 * Calculates exclusion zone around a spawn point using Manhattan Distance.
 */
export function getSafeZoneIndices(
  rows: number,
  cols: number,
  spawnRow: number,
  spawnCol: number,
  radius: number
): number[] {
  const safeIndices: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dist = Math.abs(r - spawnRow) + Math.abs(c - spawnCol);
      if (dist <= radius) {
        safeIndices.push(r * cols + c);
      }
    }
  }
  return safeIndices;
}

/**
 * Procedural Board Generator for Grimbur Adventures.
 * Refined for Semantic Entities and Explicit Safe Zones.
 */
export interface GenerateOptions {
  /** Lair floor: places the Grimbur and no gems. */
  boss?: boolean;
  /** Depth of the run; harder depths add stalkers, traps and a tougher Grimbur. */
  ascension?: number;
  /** The floor's omen (see omens.ts). */
  omen?: OmenId | null;
  /** The week's event, on top of the omen (see events.ts). */
  event?: EventId | null;
  /** Extra hearts for the Grimbur (the endless descent grows it). */
  bossHeartBonus?: number;
  /** Past the designed floors the endless descent adds more guardians and vortexes. */
  endless?: boolean;
  /** The cave the floor belongs to; each one brings a small rule (see biomes.ts). */
  biome?: BiomeId;
  /** Vortexes added on top of the floor's budget (the Greedy Idol curse). */
  extraPits?: number;
  /** The middle of the expedition: the Grimbur's lieutenant guards this floor. */
  midBoss?: boolean;
}

export function generateBoard(
  level: number,
  /** Required: the same seed always builds the same floor (the daily, challenges and duels depend on it). */
  seed: number,
  options: GenerateOptions = {},
): BoardConfig {
  const withBoss = options.boss === true;
  const mods = modifiersFor(options.ascension ?? 0);
  const diff = getDifficulty(level);
  const omen = floorEffects(options.omen, options.event);
  const biome = BIOMES[options.biome ?? 'cave'];
  const prng = createPRNG(seed);
  const totalCells = diff.rows * diff.cols;

  // Configuration
  const spawnRow = 0;
  const spawnCol = 0;
  const spawnIndex = spawnRow * diff.cols + spawnCol;
  const safeRadius = 2;
  const safeIndices = getSafeZoneIndices(diff.rows, diff.cols, spawnRow, spawnCol, safeRadius);
  const safeSet = new Set(safeIndices);

  // Up to FAIR_ATTEMPTS boards are tried to find one a player can solve by deduction alone (no blind guess). Every
  // RELAX_EVERY failures one hazard is taken away (a lighter floor beats a guess); only if that still fails, any board
  // whose gems are reachable is accepted.
  const FAIR_ATTEMPTS = 120;
  const RELAX_EVERY = 4;
  const MAX_ATTEMPTS = FAIR_ATTEMPTS + 10;
  // Lethal tiles never fill more than this share of the room the hero has to cross (outside the safe start).
  const MAX_LETHAL_SHARE = 0.3;
  // Stalkers start at least this many steps from the spawn (like the Grimbur): the first moves are never a race.
  const STALKER_MIN_DISTANCE = 5;
  // Hazard budget; relaxed on later attempts so a solvable board always exists.
  const pressure = options.endless ? endlessPressure(level) : { enemies: 0, pits: 0, stalkers: 0 };
  // The arsenal's roaming stalker only joins from the floor stalkers start; before that it is one more guardian.
  const stalkersAllowed = level >= GAME_CONFIG.stalker.earlyFloor;
  let enemyBudget = Math.max(1, diff.enemies + omen.enemyDelta + (stalkersAllowed ? 0 : omen.stalkerDelta) + pressure.enemies);
  let pitBudget = Math.max(1, diff.pits + omen.pitDelta + pressure.pits + biome.extraPits + (options.extraPits ?? 0));
  const room = Math.floor((totalCells - safeIndices.length) * MAX_LETHAL_SHARE);
  // Deeper depths put more hazards on every floor from the second, but never more than a share of the room the hero has to cross.
  if (level >= 2 && !withBoss && (mods.enemyBonus > 0 || mods.pitBonus > 0)) {
    const hazards = enemyBudget + pitBudget;
    const extra = Math.max(0, Math.min(mods.enemyBonus + mods.pitBonus, room - hazards));
    const enemyExtra = Math.min(mods.enemyBonus, extra);
    enemyBudget += enemyExtra;
    pitBudget += Math.min(mods.pitBonus, extra - enemyExtra);
  }
  // The lair is a fight with the Grimbur, not a minefield with a Grimbur in it.
  if (withBoss) {
    enemyBudget = Math.min(enemyBudget, GAME_CONFIG.boss.lairGuardians);
    pitBudget = Math.min(pitBudget, GAME_CONFIG.boss.lairPits);
  }

  // Roaming stalkers: the floor's guaranteed ones, one more with the arsenal omen, those the endless descent adds,
  // and from floor 4 a single one with some chance rolled from the floor seed (so the same cave always has the same hunters).
  const earlyRoll = createPRNG((seed ^ 0x57a1c3) >>> 0);
  earlyRoll(); // discard the weakly-mixed first sample
  const earlyStalker = diff.stalkerChance > 0 && earlyRoll() < diff.stalkerChance ? 1 : 0;
  const ascendedStalker = (options.ascension ?? 0) >= 2 && level >= mods.stalkerFloor ? 1 : 0;
  let stalkerBudget = Math.min(
    GAME_CONFIG.stalker.maxPerFloor,
    Math.max(diff.stalkers + pressure.stalkers, earlyStalker, ascendedStalker) + (stalkersAllowed ? omen.stalkerDelta : 0),
  );
  if (level >= mods.stalkerFloor) stalkerBudget = Math.min(GAME_CONFIG.stalker.maxPerFloor + mods.stalkerBonus, stalkerBudget + mods.stalkerBonus);
  if (withBoss) stalkerBudget = Math.min(stalkerBudget, 1);
  // The share cap counts stalkers too: past it, guardians and vortexes give way first (never below one of each), then stalkers.
  // The endless descent is meant to grow denser floor after floor (see lair.ts): it keeps its own pressure.
  if (!withBoss && !options.endless) {
    let over = enemyBudget + pitBudget + stalkerBudget - room;
    while (over > 0 && (enemyBudget > 1 || pitBudget > 1 || stalkerBudget > 0)) {
      if (enemyBudget > 1 && enemyBudget >= pitBudget) enemyBudget--;
      else if (pitBudget > 1) pitBudget--;
      else if (enemyBudget > 1) enemyBudget--;
      else stalkerBudget--;
      over--;
    }
  }
  const coinBudget = withBoss ? 0 : Math.max(2, diff.coins + omen.coinDelta);

  let entities: GameEntity[] = [];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    entities = [];
    const usedIndices = new Set<number>([spawnIndex]);

    const placeEntities = (count: number, type: EntityType, condition?: (index: number) => boolean) => {
      let placed = 0;
      let attempts = 0;
      while (placed < count && attempts < 1000) {
        const idx = Math.floor(prng() * totalCells);
        if (!usedIndices.has(idx) && !safeSet.has(idx) && (!condition || condition(idx))) {
          entities.push({ index: idx, type });
          usedIndices.add(idx);
          placed++;
        }
        attempts++;
      }
    };

    // 0. The Grimbur lair: the boss sits far from the spawn.
    if (withBoss) {
      const free: number[] = [];
      const far: number[] = [];
      for (let i = 0; i < totalCells; i++) {
        if (usedIndices.has(i) || safeSet.has(i)) continue;
        free.push(i);
        const distance = Math.floor(i / diff.cols) + (i % diff.cols); // spawn is the top-left corner
        if (distance >= GAME_CONFIG.boss.minSpawnDistance) far.push(i);
      }
      const pool = far.length > 0 ? far : free;
      const bossIndex = pool[Math.floor(prng() * pool.length)];
      const boss: GameEntity = { index: bossIndex, type: 'boss', hp: GAME_CONFIG.boss.hp + mods.bossHpBonus + (options.bossHeartBonus ?? 0) };
      if (isAncientLair(options.ascension ?? 0, level, options.endless === true)) boss.ancient = true;
      entities.push(boss);
      usedIndices.add(bossIndex);
    }

    // 1. Enemies, avoiding clumps (max 1 adjacent enemy).
    placeEntities(enemyBudget, 'enemy', (idx) => {
      const currentEnemies = entities.filter(e => e.type === 'enemy').map(e => e.index);
      const neighborCount = getNeighbors(idx, diff.rows, diff.cols).filter(n => currentEnemies.includes(n)).length;
      return neighborCount < 2;
    });

    // 1a. From the sleeper floor (see gameConfig) one guardian sleeps: it stands still until the player comes close.
    if (level >= GAME_CONFIG.sleeper.minFloor && !withBoss) {
      const sleepers = entities.filter(e => e.type === 'enemy');
      if (sleepers.length >= 2) sleepers[sleepers.length - 1].type = 'sleeper';
    }

    // 1b. Stalkers (roaming guardians), far from the spawn (the top-left corner).
    placeEntities(stalkerBudget, 'stalker', idx => Math.floor(idx / diff.cols) + (idx % diff.cols) >= STALKER_MIN_DISTANCE);

    // 2. Pits
    placeEntities(pitBudget, 'pit');

    // 3. Coins
    placeEntities(coinBudget, 'coin');

    // 4. Optional extras (never lethal, so they don't affect solvability)
    placeEntities(diff.traps + (level >= 3 ? mods.extraTraps : 0), 'trap');
    placeEntities(diff.shields + biome.extraShields, 'shield');
    placeEntities(diff.ammoPickups + biome.extraAmmo, 'ammo');

    // 5. Every coin must be reachable without crossing a lethal tile.
    const coinIndices = entities.filter(e => e.type === 'coin').map(e => e.index);
    const lethalIndices = entities.filter(e => e.type === 'pit' || e.type === 'enemy' || e.type === 'stalker' || e.type === 'sleeper').map(e => e.index);
    const gemsReachable = validateSolvability(spawnIndex, coinIndices, lethalIndices, diff.rows, diff.cols);
    // On the lair floor the Grimbur must be reachable too (guardians in the way can be shot, vortexes cannot).
    const bossEntity = entities.find(e => e.type === 'boss');
    const bossReachable =
      !bossEntity ||
      canReachNeighbourOf(
        spawnIndex,
        bossEntity.index,
        entities.filter(e => e.type === 'pit').map(e => e.index),
        diff.rows,
        diff.cols,
      );
    const fair = withBoss || attempt >= FAIR_ATTEMPTS || isSolvableByDeduction(diff.rows, diff.cols, entities, spawnIndex);
    if (gemsReachable && bossReachable && fair) break;

    // Relax the floor for the next attempt, one hazard at a time and never below one guardian and one vortex: the bigger of
    // the two budgets gives way first, then the stalkers. The endless descent, whose density is its difficulty, gives up a
    // stalker first.
    if ((attempt + 1) % RELAX_EVERY === 0 || attempt >= FAIR_ATTEMPTS) {
      if (options.endless && stalkerBudget > 0) stalkerBudget--;
      else if (enemyBudget > 1 && enemyBudget >= pitBudget) enemyBudget--;
      else if (pitBudget > 1) pitBudget--;
      else if (enemyBudget > 1) enemyBudget--;
      else if (stalkerBudget > 0) stalkerBudget--;
    }
  }

  // Extras rolled apart from the board (so the board itself is the same with or without them): the lieutenant in the middle of
  // the expedition, a mimic (a guardian that looks like a gem, given away only by the clues), a thief and a chest.
  entities = addExtras(entities, level, seed, diff.rows, diff.cols, spawnIndex, safeSet, { withBoss, midBoss: options.midBoss === true, lethalRoom: room });

  return {
    level,
    rows: diff.rows,
    cols: diff.cols,
    entities,
    playerIndex: spawnIndex,
    // Report the coins actually placed so the level can always be completed.
    coins: entities.filter(e => e.type === 'coin').length,
    // The lair is a fight: always arrows for every guardian there and every heart of the Grimbur (plus a miss to spare).
    attack: (withBoss ? Math.max(diff.attackCharges, enemyBudget + GAME_CONFIG.boss.hp + 1) : diff.attackCharges) + omen.arrowBonus + (options.midBoss ? MID_BOSS_HP + 1 : 0),
    seed
  };
}

/** The floor of the Grimbur's lieutenant, its hearts, and from which floors (and how often) the other extras show up. */
/** From this depth (and from this floor of the endless descent) the lair belongs to the Ancestral Grimbur. */
export const ANCIENT_DEPTH = 3;
export const ANCIENT_ENDLESS_FLOOR = 20;
export const isAncientLair = (ascension: number, level: number, endless: boolean): boolean =>
  ascension >= ANCIENT_DEPTH || (endless && level >= ANCIENT_ENDLESS_FLOOR);

export const MID_BOSS_FLOOR = 5;
export const MID_BOSS_HP = 2;
export const MIMIC_FROM = 4;
export const MIMIC_CHANCE = 0.4;
export const THIEF_FROM = 3;
export const THIEF_CHANCE = 0.3;
export const CHEST_FROM = 2;
export const CHEST_CHANCE = 0.3;
/**
 * The secret room: from the second floor, some floors hide a cache (never in the lair). It is not drawn and not a danger; the
 * explored tiles beside it show a draft (a glint in their corner), so it is found by reading the board, and it must be found
 * before the last gem, which ends the floor.
 */
export const SECRET_FROM = 2;
export const SECRET_CHANCE = 0.35;
/** What a secret room holds: shop gems, an arrow and points (more the deeper it is). */
export const SECRET_GEMS = 3;
export const SECRET_ARROWS = 1;
export const secretScore = (level: number) => 200 + 50 * level;

function addExtras(
  base: GameEntity[],
  level: number,
  seed: number,
  rows: number,
  cols: number,
  spawn: number,
  safe: ReadonlySet<number>,
  opts: { withBoss: boolean; midBoss: boolean; lethalRoom: number },
): GameEntity[] {
  const roll = createPRNG((seed ^ 0x3c6ef372) >>> 0);
  roll(); // discard the weakly-mixed first sample
  const want = { mimic: roll() < MIMIC_CHANCE, thief: roll() < THIEF_CHANCE, chest: roll() < CHEST_CHANCE };
  let entities = base;
  const free = (far: number) => {
    const used = new Set(entities.map(e => e.index));
    const out: number[] = [];
    for (let i = 0; i < rows * cols; i++) {
      if (i === spawn || used.has(i) || safe.has(i)) continue;
      if (Math.floor(i / cols) + (i % cols) >= far) out.push(i);
    }
    return out;
  };
  const gems = () => entities.filter(e => e.type === 'coin').map(e => e.index);
  const lethal = () => entities.filter(e => e.type === 'pit' || e.type === 'enemy' || e.type === 'stalker' || e.type === 'sleeper' || e.type === 'mimic').map(e => e.index);
  // A hazard is only added where the floor stays reachable and solvable by deduction.
  const tryAdd = (make: (index: number) => GameEntity, far: number, hazard: boolean, tries = 12): boolean => {
    const pool = free(far);
    for (let t = 0; t < tries && pool.length > 0; t++) {
      const at = pool.splice(Math.floor(roll() * pool.length), 1)[0];
      const next = [...entities, make(at)];
      if (hazard) {
        const before = entities;
        entities = next;
        const ok = validateSolvability(spawn, gems(), lethal(), rows, cols) && isSolvableByDeduction(rows, cols, entities, spawn);
        if (ok) return true;
        entities = before;
        continue;
      }
      entities = next;
      return true;
    }
    return false;
  };

  if (opts.midBoss) {
    const pits = () => entities.filter(e => e.type === 'pit').map(e => e.index);
    const pool = free(GAME_CONFIG.boss.minSpawnDistance);
    while (pool.length > 0) {
      const at = pool.splice(Math.floor(roll() * pool.length), 1)[0];
      if (!canReachNeighbourOf(spawn, at, pits(), rows, cols)) continue;
      entities = [...entities, { index: at, type: 'boss', hp: MID_BOSS_HP, mini: true, calls: GAME_CONFIG.boss.maxCalls }];
      break;
    }
  }
  if (opts.withBoss) return entities;
  // The mimic never pushes the floor past its share of lethal tiles.
  if (level >= MIMIC_FROM && want.mimic && lethal().length < opts.lethalRoom) tryAdd(index => ({ index, type: 'mimic' }), 4, true);
  if (level >= THIEF_FROM && !opts.midBoss && want.thief) tryAdd(index => ({ index, type: 'thief', loot: 0 }), 4, false);
  if (level >= CHEST_FROM && want.chest) tryAdd(index => ({ index, type: 'chest' }), 3, false);
  // Its own roll, so the extras above stay where they were before secret rooms existed (same daily for every version).
  const secretRoll = createPRNG((seed ^ 0x5be0cd19) >>> 0);
  secretRoll();
  if (level >= SECRET_FROM && secretRoll() < SECRET_CHANCE) {
    const pool = free(4);
    for (let t = 0; t < 12 && pool.length > 0; t++) {
      const at = pool.splice(Math.floor(secretRoll() * pool.length), 1)[0];
      // Only where the hero can walk to it.
      if (!validateSolvability(spawn, [...gems(), at], lethal(), rows, cols)) continue;
      entities = [...entities, { index: at, type: 'secret' }];
      break;
    }
  }
  return entities;
}

/** True when some tile next to `target` can be reached from `start` without crossing `blocked`. */
function canReachNeighbourOf(start: number, target: number, blocked: number[], rows: number, cols: number): boolean {
  const blockedSet = new Set(blocked);
  const goals = new Set(getNeighbors(target, rows, cols).filter(n => !blockedSet.has(n)));
  if (goals.has(start)) return true;

  const seen = new Set<number>([start]);
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    for (const n of getNeighbors(queue[head], rows, cols)) {
      if (seen.has(n) || blockedSet.has(n) || n === target) continue;
      if (goals.has(n)) return true;
      seen.add(n);
      queue.push(n);
    }
  }
  return false;
}

/** Helper to get orthogonal neighbors */
function getNeighbors(idx: number, rows: number, cols: number): number[] {
  const r = Math.floor(idx / cols);
  const c = idx % cols;
  const res: number[] = [];
  if (r > 0) res.push((r - 1) * cols + c);
  if (r < rows - 1) res.push((r + 1) * cols + c);
  if (c > 0) res.push(r * cols + (c - 1));
  if (c < cols - 1) res.push(r * cols + (c + 1));
  return res;
}

/** 
 * BFS Pathfinding to ensure all coins are reachable.
 * Maintaining full validation as per architectural requirements.
 */
function validateSolvability(start: number, coinIndices: number[], lethalIndices: number[], rows: number, cols: number): boolean {
  if (coinIndices.length === 0) return true;

  const visited = new Set<number>();
  const queue = [start];
  visited.add(start);
  
  const lethalSet = new Set(lethalIndices);
  const targetSet = new Set(coinIndices);
  const foundTargets = new Set<number>();

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    
    if (targetSet.has(curr)) {
      foundTargets.add(curr);
      if (foundTargets.size === coinIndices.length) return true;
    }

    for (const neighbor of getNeighbors(curr, rows, cols)) {
      if (!visited.has(neighbor) && !lethalSet.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return foundTargets.size === coinIndices.length;
}
