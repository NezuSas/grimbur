import { createPRNG } from '../random/prng';
import { dailySeed } from '../engine/seed';
import { deductionRounds } from '../engine/solver';
import type { BiomeId } from '../engine/biomes';
import type { GameEntity } from '../engine/types';

/**
 * The cave's puzzles: a small floor already half explored, gems in sight and hazards hidden in the fog. Every gem can be reached
 * by reading the clues alone (the generator proves it with the same deduction the expedition's fairness check uses), so a
 * puzzle is pure logic: no luck, no monsters walking, no arrows. Stepping on a hazard is a mistake and the puzzle starts over.
 *
 * Boards are built from a seed, so a puzzle is the same for everyone: the path of numbered puzzles uses fixed seeds and the
 * daily one is derived from the day.
 */
export interface Puzzle {
  rows: number;
  cols: number;
  /** Where the hero stands. */
  start: number;
  /** Tiles already explored when the puzzle opens (the start among them). */
  visited: number[];
  /** Gems (`coin`) and hazards (`enemy`, `pit`) only. */
  entities: GameEntity[];
  /** 0 (apprentice) .. 4 (master). */
  tier: number;
  /** Rounds of reasoning the board needs (see deductionRounds): the longer the chain, the harder. */
  rounds: number;
  /** The cave it is drawn in. */
  biome: BiomeId;
}

interface TierSpec {
  rows: number;
  cols: number;
  hazards: number;
  gems: number;
  reveal: number;
  /** A board is kept only when it needs at least this many rounds (then the one needing most is kept). */
  minRounds: number;
}

/** From the apprentice's first board to the master's. */
export const PUZZLE_TIERS: readonly TierSpec[] = [
  { rows: 5, cols: 6, hazards: 6, gems: 1, reveal: 3, minRounds: 2 },
  { rows: 5, cols: 7, hazards: 8, gems: 1, reveal: 3, minRounds: 3 },
  { rows: 6, cols: 8, hazards: 11, gems: 2, reveal: 4, minRounds: 4 },
  { rows: 6, cols: 9, hazards: 14, gems: 2, reveal: 4, minRounds: 5 },
  { rows: 7, cols: 10, hazards: 18, gems: 3, reveal: 5, minRounds: 6 },
];

/** Puzzles on the path, in order; each opens once the one before it is solved. */
export const PUZZLES_PER_TIER = 6;
export const PUZZLE_COUNT = PUZZLE_TIERS.length * PUZZLES_PER_TIER;

const BIOMES: readonly BiomeId[] = ['cave', 'crystal', 'magma', 'cave', 'lair'];
const ATTEMPTS = 220;

const neighbours = (i: number, rows: number, cols: number): number[] => {
  const r = Math.floor(i / cols);
  const c = i % cols;
  const out: number[] = [];
  if (r > 0) out.push(i - cols);
  if (r < rows - 1) out.push(i + cols);
  if (c > 0) out.push(i - 1);
  if (c < cols - 1) out.push(i + 1);
  return out;
};

/** Builds the puzzle of this seed and tier (always the same board for the same pair). */
export function generatePuzzle(seed: number, tier: number): Puzzle {
  const t = Math.max(0, Math.min(PUZZLE_TIERS.length - 1, Math.trunc(tier)));
  const spec = PUZZLE_TIERS[t];
  const { rows, cols } = spec;
  const cells = rows * cols;
  const next = createPRNG(((seed >>> 0) % 2147483646) + 1);
  next(); // the first sample of a fresh generator is weakly mixed
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  let best: Puzzle | null = null;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    // The hero starts on the board's edge, so the fog opens in front of them.
    const edge: number[] = [];
    for (let i = 0; i < cells; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      if (r === 0 || c === 0 || r === rows - 1 || c === cols - 1) edge.push(i);
    }
    const start = pick(edge);
    const hazards = new Set<number>();
    const startRing = new Set([start, ...neighbours(start, rows, cols)]);
    for (let tries = 0; hazards.size < spec.hazards && tries < 2000; tries++) {
      const i = Math.floor(next() * cells);
      if (startRing.has(i) || hazards.has(i)) continue;
      // No hazard walls a 2x2 block in: a puzzle is read, not trapped.
      if (neighbours(i, rows, cols).filter(n => hazards.has(n)).length >= 3) continue;
      hazards.add(i);
    }
    // The explored patch: grown from the start over safe tiles in a random order.
    const visited = [start];
    const seen = new Set(visited);
    while (visited.length < spec.reveal) {
      const frontier = visited.flatMap(v => neighbours(v, rows, cols)).filter(n => !seen.has(n) && !hazards.has(n));
      if (frontier.length === 0) break;
      const n = pick(frontier);
      seen.add(n);
      visited.push(n);
    }
    // Gems lie far from the start, on safe tiles still in the fog.
    const far = (i: number) => Math.abs(Math.floor(i / cols) - Math.floor(start / cols)) + Math.abs((i % cols) - (start % cols));
    const pool: number[] = [];
    for (let i = 0; i < cells; i++) if (!hazards.has(i) && !seen.has(i) && far(i) >= Math.floor((rows + cols) / 2)) pool.push(i);
    if (pool.length < spec.gems) continue;
    const gems: number[] = [];
    while (gems.length < spec.gems) {
      const g = pool.splice(Math.floor(next() * pool.length), 1)[0];
      gems.push(g);
    }
    const entities: GameEntity[] = [
      ...gems.map(index => ({ index, type: 'coin' as const })),
      ...[...hazards].map(index => ({ index, type: next() < 0.5 ? ('enemy' as const) : ('pit' as const) })),
    ];
    const rounds = deductionRounds(rows, cols, entities, visited);
    if (rounds < 0) continue;
    const puzzle: Puzzle = { rows, cols, start, visited, entities, tier: t, rounds, biome: BIOMES[t] };
    // The first board long enough for its tier is taken (a longer chain is not always a better puzzle); until one shows up,
    // the longest so far is kept.
    if (rounds >= spec.minRounds) return puzzle;
    if (!best || rounds > best.rounds) best = puzzle;
  }
  // A board is always found within the attempts (the tests check every one of the path and a year of dailies).
  return best as Puzzle;
}

/** The seed of a numbered puzzle on the path (fixed: changing it would change a puzzle players already solved). */
export const pathSeed = (index: number): number => 7919 * (index + 1) + 104729;

/** The numbered puzzle `index` (0-based) of the path. */
export const pathPuzzle = (index: number): Puzzle => generatePuzzle(pathSeed(index), Math.floor(index / PUZZLES_PER_TIER));

/** Endless puzzles, past the path: fresh boards one after another, mostly master-sized (fixed seeds, so number n is the same for all). */
const ENDLESS_TIERS = [3, 4, 4];
const ENDLESS_BIOMES: readonly BiomeId[] = ['magma', 'crystal', 'lair', 'cave'];
export const endlessPuzzle = (n: number): Puzzle => {
  const i = Math.max(0, Math.trunc(n));
  return { ...generatePuzzle(104723 * (i + 1) + 15485863, ENDLESS_TIERS[i % ENDLESS_TIERS.length]), biome: ENDLESS_BIOMES[i % ENDLESS_BIOMES.length] };
};

/** The day's puzzle: the same for everyone, harder toward the weekend. */
const DAILY_TIERS = [3, 1, 2, 2, 3, 3, 4]; // Sunday .. Saturday
export const dailyPuzzleTier = (dateKey: string): number => {
  const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
  return DAILY_TIERS[Number.isFinite(day) ? day : 0];
};
export const dailyPuzzle = (dateKey: string): Puzzle => generatePuzzle(dailySeed(`puzzle:${dateKey}`), dailyPuzzleTier(dateKey));

/** Stars for a solved puzzle: three without a mistake or a hint, two with one of either, one otherwise. */
export function puzzleStars(mistakes: number, hints: number): 1 | 2 | 3 {
  const slips = Math.max(0, mistakes) + Math.max(0, hints);
  return slips === 0 ? 3 : slips === 1 ? 2 : 1;
}
