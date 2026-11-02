import { pathPuzzle } from '../src/core/puzzles/puzzles';
for (const i of process.argv.slice(2).map(Number)) {
  const p = pathPuzzle(i);
  const hz = new Set(p.entities.filter(e => e.type !== 'coin').map(e => e.index));
  const gm = new Set(p.entities.filter(e => e.type === 'coin').map(e => e.index));
  const vis = new Set(p.visited);
  console.log(`#${i + 1} tier ${p.tier} rounds ${p.rounds}`);
  for (let r = 0; r < p.rows; r++) {
    let line = '';
    for (let c = 0; c < p.cols; c++) {
      const k = r * p.cols + c;
      const n = [k - p.cols, k + p.cols, c > 0 ? k - 1 : -1, c < p.cols - 1 ? k + 1 : -1].filter(x => x >= 0 && x < p.rows * p.cols && hz.has(x)).length;
      line += k === p.start ? `@${n}` : vis.has(k) ? ` ${n}` : gm.has(k) ? ' G' : hz.has(k) ? ' x' : ' .';
    }
    console.log(line);
  }
}
