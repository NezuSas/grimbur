import { createPRNG } from '../random/prng';
import { dailySeed } from '../engine/seed';
import { rateDeduction, type DeductionReport } from './deduction';
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
  /** 0 (apprentice) .. 5 (legend). */
  tier: number;
  /** Steps of reasoning the board needs (see rateDeduction): the longer the chain, the harder. */
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
  /** Steps of reasoning the board needs at least (see rateDeduction): the longer the chain, the harder. */
  minRounds: number;
  /** Times the board needs guardians and vortices read apart (level 2) at least: a clue read only as a total is not enough. */
  minTyped: number;
}

/**
 * From the apprentice's first board to the legend's. The apprentice reads one clue at a time; from the tracker on, some tile can
 * only be proven by reading guardians and vortices apart, and the deeper chapters need it again and again over longer chains.
 */
export const PUZZLE_TIERS: readonly TierSpec[] = [
  { rows: 5, cols: 6, hazards: 6, gems: 1, reveal: 3, minRounds: 2, minTyped: 0 },
  { rows: 5, cols: 7, hazards: 8, gems: 1, reveal: 3, minRounds: 3, minTyped: 1 },
  { rows: 6, cols: 8, hazards: 11, gems: 2, reveal: 4, minRounds: 4, minTyped: 1 },
  { rows: 6, cols: 9, hazards: 14, gems: 2, reveal: 3, minRounds: 5, minTyped: 2 },
  { rows: 7, cols: 10, hazards: 18, gems: 3, reveal: 4, minRounds: 6, minTyped: 2 },
  { rows: 8, cols: 11, hazards: 24, gems: 3, reveal: 3, minRounds: 7, minTyped: 3 },
];
/** The last chapter, the Legend: the biggest boards, and a single mistake ends the try. */
export const LEGEND_TIER = PUZZLE_TIERS.length - 1;
export const isStrictTier = (tier: number): boolean => tier >= LEGEND_TIER;

/** Puzzles on the path, in order; each opens once the one before it is solved. */
export const PUZZLES_PER_TIER = 6;
export const PUZZLE_COUNT = PUZZLE_TIERS.length * PUZZLES_PER_TIER;
/** The endless puzzles open once the five first chapters are solved (the Legend is a peak of its own, not a gate). */
export const ENDLESS_AFTER = LEGEND_TIER * PUZZLES_PER_TIER;

const BIOMES: readonly BiomeId[] = ['cave', 'crystal', 'magma', 'cave', 'lair', 'lair'];
const ATTEMPTS = 160;

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

/** How hard a rated board is, to keep the best when none meets its tier: typed reading and deep steps weigh most. */
const weight = (r: DeductionReport): number => r.hard * 20 + r.uses[1] * 8 + r.uses[0];

/** Builds the puzzle of this seed and tier (always the same board for the same pair). */
export function generatePuzzle(seed: number, tier: number): Puzzle {
  const t = Math.max(0, Math.min(PUZZLE_TIERS.length - 1, Math.trunc(tier)));
  const spec = PUZZLE_TIERS[t];
  const { rows, cols } = spec;
  const cells = rows * cols;
  const next = createPRNG(((seed >>> 0) % 2147483646) + 1);
  next(); // the first sample of a fresh generator is weakly mixed
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  let best: { puzzle: Puzzle; weight: number } | null = null;
  const edge: number[] = [];
  for (let i = 0; i < cells; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    if (r === 0 || c === 0 || r === rows - 1 || c === cols - 1) edge.push(i);
  }

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    // The hero starts on the board's edge, so the fog opens in front of them.
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
    const dangers: GameEntity[] = [...hazards].map(index => ({ index, type: next() < 0.5 ? ('enemy' as const) : ('pit' as const) }));
    // Gems lie far from the start, on safe tiles still in the fog, where reaching them takes the deepest reading: every such
    // tile is rated on its own and the hardest are taken (a gem is never next to another).
    const far = (i: number) => Math.abs(Math.floor(i / cols) - Math.floor(start / cols)) + Math.abs((i % cols) - (start % cols));
    const spots: { index: number; weight: number }[] = [];
    for (let i = 0; i < cells; i++) {
      if (hazards.has(i) || seen.has(i) || far(i) < Math.floor((rows + cols) / 2)) continue;
      const r = rateDeduction(rows, cols, [{ index: i, type: 'coin' }, ...dangers], visited);
      if (r.solvable) spots.push({ index: i, weight: weight(r) + next() * 0.5 });
    }
    if (spots.length < spec.gems) continue;
    spots.sort((a, b) => b.weight - a.weight);
    const gems: number[] = [];
    for (const s of spots) {
      if (gems.length === spec.gems) break;
      if (gems.some(g => neighbours(g, rows, cols).includes(s.index))) continue;
      gems.push(s.index);
    }
    if (gems.length < spec.gems) continue;
    const entities: GameEntity[] = [...gems.map(index => ({ index, type: 'coin' as const })), ...dangers];
    const report = rateDeduction(rows, cols, entities, visited);
    if (!report.solvable) continue;
    const rounds = report.uses.reduce((a, n) => a + n, 0);
    const puzzle: Puzzle = { rows, cols, start, visited, entities, tier: t, rounds, biome: BIOMES[t] };
    if (rounds >= spec.minRounds && report.uses[1] + report.hard >= spec.minTyped) return puzzle;
    const w = weight(report) + rounds * 0.1;
    if (!best || w > best.weight) best = { puzzle, weight: w };
  }
  // A board is always found within the attempts (the tests check every one of the path and many dailies).
  return best!.puzzle;
}

/**
 * Seeds of the path where the default one gives a board short of its tier (found by scripts/findPathSeeds.ts). Fixed, like
 * every seed of the path: changing one would change a puzzle players already solved.
 */
const PATH_SEEDS: Readonly<Record<number, number>> = {
  32: 1366059,
  33: 7373996,
  34: 4381906,
};

/** The seed of a numbered puzzle on the path. */
export const pathSeed = (index: number): number => PATH_SEEDS[index] ?? 7919 * (index + 1) + 104729;

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

/**
 * The legend time of a board, in seconds: what a sharp reader needs (about a second a tile walked, more for every step of
 * reasoning and much more for each one that reads the two kinds apart or compares clues), rounded up to five seconds.
 * Three stars under it win the puzzle's crown.
 */
export function legendTime(p: Puzzle): number {
  const r = rateDeduction(p.rows, p.cols, p.entities, p.visited);
  const steps = r.uses.reduce((a, n) => a + n, 0);
  const raw = 8 + r.explored * 0.9 + steps * 1 + (r.uses[1] + r.hard) * 6;
  return Math.ceil(raw / 5) * 5;
}

/** Stars for a solved puzzle: three without a mistake or a hint, two with one of either, one otherwise. */
export function puzzleStars(mistakes: number, hints: number): 1 | 2 | 3 {
  const slips = Math.max(0, mistakes) + Math.max(0, hints);
  return slips === 0 ? 3 : slips === 1 ? 2 : 1;
}
