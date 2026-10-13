import { getDifficulty } from '../difficulty/difficulty';
import { createPRNG } from '../random/prng';
import { GAME_CONFIG } from '../../config/gameConfig';
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
 * Procedural Board Generator for Wumpus Adventures.
 * Refined for Semantic Entities and Explicit Safe Zones.
 */
export interface GenerateOptions {
  /** Lair floor: places the Wumpus and no gems. */
  boss?: boolean;
}

export function generateBoard(
  level: number,
  seed: number = Math.floor(Math.random() * 100000),
  options: GenerateOptions = {},
): BoardConfig {
  const withBoss = options.boss === true;
  const diff = getDifficulty(level);
  const prng = createPRNG(seed);
  const totalCells = diff.rows * diff.cols;

  // Configuration
  const spawnRow = 0;
  const spawnCol = 0;
  const spawnIndex = spawnRow * diff.cols + spawnCol;
  const safeRadius = 2;
  const safeIndices = getSafeZoneIndices(diff.rows, diff.cols, spawnRow, spawnCol, safeRadius);
  const safeSet = new Set(safeIndices);

  const MAX_ATTEMPTS = 10;
  // Hazard budget; relaxed on later attempts so a solvable board always exists.
  let enemyBudget = diff.enemies;
  let pitBudget = diff.pits;

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

    // 0. The Wumpus lair: the boss sits far from the spawn.
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
      entities.push({ index: bossIndex, type: 'boss', hp: GAME_CONFIG.boss.hp });
      usedIndices.add(bossIndex);
    }

    // 1. Enemies, avoiding clumps (max 1 adjacent enemy).
    placeEntities(enemyBudget, 'enemy', (idx) => {
      const currentEnemies = entities.filter(e => e.type === 'enemy').map(e => e.index);
      const neighborCount = getNeighbors(idx, diff.rows, diff.cols).filter(n => currentEnemies.includes(n)).length;
      return neighborCount < 2;
    });

    // 2. Pits
    placeEntities(pitBudget, 'pit');

    // 3. Coins
    placeEntities(withBoss ? 0 : diff.coins, 'coin');

    // 4. Optional extras (never lethal, so they don't affect solvability)
    placeEntities(diff.traps, 'trap');
    placeEntities(diff.shields, 'shield');
    placeEntities(diff.ammoPickups, 'ammo');

    // 5. Every coin must be reachable without crossing a lethal tile.
    const coinIndices = entities.filter(e => e.type === 'coin').map(e => e.index);
    const lethalIndices = entities.filter(e => e.type === 'pit' || e.type === 'enemy').map(e => e.index);
    if (validateSolvability(spawnIndex, coinIndices, lethalIndices, diff.rows, diff.cols)) break;

    // Relax difficulty for the next attempt.
    if (attempt >= 6) pitBudget = Math.max(1, pitBudget - 1);
    if (attempt === MAX_ATTEMPTS - 2) {
      enemyBudget = 0;
      pitBudget = 0;
    }
  }

  return {
    level,
    rows: diff.rows,
    cols: diff.cols,
    entities,
    playerIndex: spawnIndex,
    // Report the coins actually placed so the level can always be completed.
    coins: entities.filter(e => e.type === 'coin').length,
    attack: diff.attackCharges,
    seed
  };
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
