/**
 * Finds a small board for the 'typed' technique: its first move can only be proven by reading guardians and vortices apart
 * (no tile next to the explored ground is proven by a total alone), and the board is solvable by deduction.
 *   npx tsx scripts/findTypedTechnique.ts
 */
import { createPRNG } from '../src/core/random/prng';
import { provenByLevel, rateDeduction } from '../src/core/puzzles/deduction';
import type { GameEntity } from '../src/core/engine/types';

const ROWS = 4;
const COLS = 5;
const nb = (i: number) => {
  const r = Math.floor(i / COLS), c = i % COLS, o: number[] = [];
  if (r > 0) o.push(i - COLS);
  if (r < ROWS - 1) o.push(i + COLS);
  if (c > 0) o.push(i - 1);
  if (c < COLS - 1) o.push(i + 1);
  return o;
};
const out: unknown[] = [];
for (let seed = 1; seed < 400000 && out.length < 3; seed++) {
  const next = createPRNG(seed);
  next();
  const start = Math.floor(next() * ROWS * COLS);
  const hazards = new Set<number>();
  const ring = new Set([start, ...nb(start)]);
  const want = 3 + Math.floor(next() * 3);
  for (let t = 0; hazards.size < want && t < 200; t++) {
    const i = Math.floor(next() * ROWS * COLS);
    if (!ring.has(i)) hazards.add(i);
  }
  const visited = [start];
  const reveal = 3 + Math.floor(next() * 4);
  while (visited.length < reveal) {
    const f = visited.flatMap(nb).filter(n => !visited.includes(n) && !hazards.has(n));
    if (!f.length) break;
    visited.push(f[Math.floor(next() * f.length)]);
  }
  const far = [...Array(ROWS * COLS).keys()].filter(i => !hazards.has(i) && !visited.includes(i) && Math.abs(Math.floor(i / COLS) - Math.floor(start / COLS)) + Math.abs((i % COLS) - (start % COLS)) >= 3);
  if (!far.length) continue;
  const gem = far[Math.floor(next() * far.length)];
  const entities: GameEntity[] = [{ index: gem, type: 'coin' }, ...[...hazards].map(index => ({ index, type: next() < 0.5 ? ('enemy' as const) : ('pit' as const) }))];
  const r = rateDeduction(ROWS, COLS, entities, visited);
  if (!r.solvable || r.uses[1] < 1 || r.hard > 0) continue;
  const { safe } = provenByLevel(ROWS, COLS, entities, visited);
  const first = [...safe].filter(([i]) => i !== gem && !visited.includes(i) && visited.some(v => nb(v).includes(i)));
  if (!first.length || first.some(([, l]) => l !== 2)) continue;
  out.push({ start, visited, entities, rounds: r.uses.reduce((a, n) => a + n, 0) });
}
console.log(JSON.stringify(out));
