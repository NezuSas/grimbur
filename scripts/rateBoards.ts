// Rates random boards of each puzzle tier with the leveled deduction (how deep they need to be thought), to tune the generator.
//   npx tsx scripts/rateBoards.ts [samples]
import { createPRNG } from '../src/core/random/prng';
import { rateDeduction } from '../src/core/puzzles/deduction';
import type { GameEntity } from '../src/core/engine/types';

const samples = Number(process.argv[2] ?? 300);
const specs = [
  { name: '5x6 h6', rows: 5, cols: 6, hazards: 6, gems: 1, reveal: 3 },
  { name: '5x7 h8', rows: 5, cols: 7, hazards: 8, gems: 1, reveal: 3 },
  { name: '6x8 h11', rows: 6, cols: 8, hazards: 11, gems: 2, reveal: 4 },
  { name: '6x8 h13', rows: 6, cols: 8, hazards: 13, gems: 2, reveal: 3 },
  { name: '6x9 h14', rows: 6, cols: 9, hazards: 14, gems: 2, reveal: 4 },
  { name: '6x9 h17', rows: 6, cols: 9, hazards: 17, gems: 2, reveal: 3 },
  { name: '7x10 h18', rows: 7, cols: 10, hazards: 18, gems: 3, reveal: 5 },
  { name: '7x10 h22', rows: 7, cols: 10, hazards: 22, gems: 3, reveal: 3 },
  { name: '8x11 h28', rows: 8, cols: 11, hazards: 28, gems: 3, reveal: 3 },
];
const nbOf = (i: number, rows: number, cols: number) => { const r = Math.floor(i / cols), c = i % cols; const o: number[] = []; if (r > 0) o.push(i - cols); if (r < rows - 1) o.push(i + cols); if (c > 0) o.push(i - 1); if (c < cols - 1) o.push(i + 1); return o; };
for (const s of specs) {
  const next = createPRNG(12345);
  const hist = [0, 0, 0, 0, 0, 0];
  const l2 = [0, 0, 0, 0, 0];
  let deep = 0;
  let hardSum = 0, t0 = Date.now(), maxMs = 0;
  for (let n = 0; n < samples; n++) {
    const cells = s.rows * s.cols;
    const edge = Array.from({ length: cells }, (_, i) => i).filter(i => { const r = Math.floor(i / s.cols), c = i % s.cols; return r === 0 || c === 0 || r === s.rows - 1 || c === s.cols - 1; });
    const start = edge[Math.floor(next() * edge.length)];
    const ring = new Set([start, ...nbOf(start, s.rows, s.cols)]);
    const hz = new Set<number>();
    for (let t = 0; hz.size < s.hazards && t < 3000; t++) { const i = Math.floor(next() * cells); if (ring.has(i) || hz.has(i)) continue; if (nbOf(i, s.rows, s.cols).filter(x => hz.has(x)).length >= 3) continue; hz.add(i); }
    const visited = [start]; const seen = new Set(visited);
    while (visited.length < s.reveal) { const f = visited.flatMap(v => nbOf(v, s.rows, s.cols)).filter(x => !seen.has(x) && !hz.has(x)); if (!f.length) break; const x = f[Math.floor(next() * f.length)]; seen.add(x); visited.push(x); }
    const far = (i: number) => Math.abs(Math.floor(i / s.cols) - Math.floor(start / s.cols)) + Math.abs((i % s.cols) - (start % s.cols));
    const pool = Array.from({ length: cells }, (_, i) => i).filter(i => !hz.has(i) && !seen.has(i) && far(i) >= Math.floor((s.rows + s.cols) / 2));
    const gems: number[] = []; while (gems.length < s.gems && pool.length) gems.push(pool.splice(Math.floor(next() * pool.length), 1)[0]);
    const ents: GameEntity[] = [...gems.map(index => ({ index, type: 'coin' as const })), ...[...hz].map(index => ({ index, type: next() < 0.5 ? 'enemy' as const : 'pit' as const }))];
    const a = Date.now();
    const r = rateDeduction(s.rows, s.cols, ents, visited);
    maxMs = Math.max(maxMs, Date.now() - a);
    hist[r.solvable ? r.level + 1 : 0]++;
    if (r.solvable) { hardSum += r.hard; l2[Math.min(4, r.uses[1])]++; if (r.hard > 0) deep++; }
  }
  console.log(s.name.padEnd(9), 'unsolv', hist[0], '| L0', hist[1], 'L1', hist[2], 'L2', hist[3], 'L3', hist[4], 'L4', hist[5], '| avg hard', (hardSum / Math.max(1, samples - hist[0])).toFixed(2), '|', ((Date.now() - t0) / samples).toFixed(1), 'ms/board max', maxMs, '| L2 uses 0..4+', l2.join('/'), '| deep', deep);
}
