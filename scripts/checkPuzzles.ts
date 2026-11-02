// How the generated puzzles rate: for each of the path, some dailies and endless ones, its levels and the time it took.
//   npx tsx scripts/checkPuzzles.ts
import { PUZZLE_COUNT, PUZZLE_TIERS, dailyPuzzle, endlessPuzzle, pathPuzzle, type Puzzle } from '../src/core/puzzles/puzzles';
import { rateDeduction } from '../src/core/puzzles/deduction';
import { shiftDayKey } from '../src/core/engine/seed';
const show = (label: string, make: () => Puzzle) => {
  const t0 = Date.now();
  const p = make();
  const ms = Date.now() - t0;
  const r = rateDeduction(p.rows, p.cols, p.entities, p.visited);
  const spec = PUZZLE_TIERS[p.tier];
  const ok = r.solvable && p.rounds >= spec.minRounds && r.uses[1] + r.hard >= spec.minTyped;
  return { label, tier: p.tier, ok, ms, uses: r.uses.join('/'), explored: r.explored };
};
const rows = [
  ...Array.from({ length: PUZZLE_COUNT }, (_, i) => show(`path ${i + 1}`, () => pathPuzzle(i))),
  ...Array.from({ length: 21 }, (_, d) => show(`daily ${shiftDayKey('2026-11-01', d)}`, () => dailyPuzzle(shiftDayKey('2026-11-01', d)))),
  ...Array.from({ length: 6 }, (_, n) => show(`endless ${n + 1}`, () => endlessPuzzle(n))),
];
for (const r of rows) console.log(r.label.padEnd(18), 'tier', r.tier, r.ok ? 'OK  ' : 'MISS', 'uses', r.uses.padEnd(10), 'explored', String(r.explored).padStart(3), `${r.ms}ms`);
console.log('missed', rows.filter(r => !r.ok).length, 'of', rows.length, '| max ms', Math.max(...rows.map(r => r.ms)));
