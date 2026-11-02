// For random hazard layouts, rates every possible gem spot and keeps the hardest: how often a layout can host a deep puzzle.
import { createPRNG } from '../src/core/random/prng';
import { rateDeduction } from '../src/core/puzzles/deduction';
import type { GameEntity } from '../src/core/engine/types';
const samples = Number(process.argv[2] ?? 200);
const specs = [
  { name: '5x7 h8', rows: 5, cols: 7, hazards: 8, reveal: 3 },
  { name: '6x8 h11', rows: 6, cols: 8, hazards: 11, reveal: 4 },
  { name: '6x9 h14', rows: 6, cols: 9, hazards: 14, reveal: 4 },
  { name: '7x10 h18', rows: 7, cols: 10, hazards: 18, reveal: 5 },
  { name: '7x10 h20', rows: 7, cols: 10, hazards: 20, reveal: 4 },
  { name: '8x11 h24', rows: 8, cols: 11, hazards: 24, reveal: 5 },
];
const nbOf = (i: number, rows: number, cols: number) => { const r = Math.floor(i / cols), c = i % cols; const o: number[] = []; if (r > 0) o.push(i - cols); if (r < rows - 1) o.push(i + cols); if (c > 0) o.push(i - 1); if (c < cols - 1) o.push(i + 1); return o; };
for (const s of specs) {
  const next = createPRNG(777);
  let anySolv = 0, l2 = 0, l2x2 = 0, deep = 0, deep2 = 0; const t0 = Date.now();
  for (let n = 0; n < samples; n++) {
    const cells = s.rows * s.cols;
    const edge = Array.from({ length: cells }, (_, i) => i).filter(i => { const r = Math.floor(i / s.cols), c = i % s.cols; return r === 0 || c === 0 || r === s.rows - 1 || c === s.cols - 1; });
    const start = edge[Math.floor(next() * edge.length)];
    const ring = new Set([start, ...nbOf(start, s.rows, s.cols)]);
    const hz = new Set<number>();
    for (let t = 0; hz.size < s.hazards && t < 3000; t++) { const i = Math.floor(next() * cells); if (ring.has(i) || hz.has(i)) continue; if (nbOf(i, s.rows, s.cols).filter(x => hz.has(x)).length >= 3) continue; hz.add(i); }
    const visited = [start]; const seen = new Set(visited);
    while (visited.length < s.reveal) { const f = visited.flatMap(v => nbOf(v, s.rows, s.cols)).filter(x => !seen.has(x) && !hz.has(x)); if (!f.length) break; const x = f[Math.floor(next() * f.length)]; seen.add(x); visited.push(x); }
    const hzEnts: GameEntity[] = [...hz].map(index => ({ index, type: next() < 0.5 ? 'enemy' as const : 'pit' as const }));
    let best = { solv: false, l2: 0, hard: 0 };
    for (let g = 0; g < cells; g++) {
      if (hz.has(g) || seen.has(g)) continue;
      const r = rateDeduction(s.rows, s.cols, [{ index: g, type: 'coin' }, ...hzEnts], visited);
      if (!r.solvable) continue;
      if (r.hard > best.hard || (r.hard === best.hard && r.uses[1] > best.l2) || !best.solv) best = { solv: true, l2: r.uses[1], hard: r.hard };
    }
    if (best.solv) anySolv++; if (best.l2 >= 1) l2++; if (best.l2 >= 2) l2x2++; if (best.hard >= 1) deep++; if (best.hard >= 2) deep2++;
  }
  console.log(s.name.padEnd(9), 'layouts', samples, 'solvable', anySolv, 'L2>=1', l2, 'L2>=2', l2x2, 'deep>=1', deep, 'deep>=2', deep2, '|', ((Date.now() - t0) / samples).toFixed(1), 'ms/layout');
}
