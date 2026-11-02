// Finds a seed for each puzzle of the path whose board meets its tier at once (the path is fixed: the seeds are written into
// puzzles.ts as PATH_SEEDS). Prints only the ones whose default seed misses.
//   npx tsx scripts/findPathSeeds.ts
import { PUZZLE_COUNT, PUZZLE_TIERS, PUZZLES_PER_TIER, generatePuzzle } from '../src/core/puzzles/puzzles';
import { rateDeduction } from '../src/core/puzzles/deduction';
const meets = (seed: number, tier: number) => {
  const p = generatePuzzle(seed, tier);
  const r = rateDeduction(p.rows, p.cols, p.entities, p.visited);
  const spec = PUZZLE_TIERS[tier];
  return r.solvable && p.rounds >= spec.minRounds && r.uses[1] + r.hard >= spec.minTyped;
};
const base = (i: number) => 7919 * (i + 1) + 104729;
for (let i = 0; i < PUZZLE_COUNT; i++) {
  const tier = Math.floor(i / PUZZLES_PER_TIER);
  if (meets(base(i), tier)) continue;
  for (let k = 1; k < 400; k++) {
    const seed = base(i) + k * 1000003;
    if (meets(seed, tier)) {
      console.log(`  ${i}: ${seed},`);
      break;
    }
  }
}
