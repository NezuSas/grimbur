import { PUZZLE_COUNT, PUZZLE_TIERS, pathPuzzle, dailyPuzzle } from '../src/core/puzzles/puzzles';
import { shiftDayKey } from '../src/core/engine/seed';
const t0 = Date.now();
const rows: string[] = [];
for (let i = 0; i < PUZZLE_COUNT; i++) {
  const p = pathPuzzle(i);
  rows.push(`${i + 1}:t${p.tier}r${p.rounds}${p.rounds < PUZZLE_TIERS[p.tier].minRounds ? '!' : ''}`);
}
console.log(rows.join(' '));
console.log('path ms', Date.now() - t0);
const t1 = Date.now();
const short: number[] = [0, 0, 0, 0, 0];
const total: number[] = [0, 0, 0, 0, 0];
let slow = 0;
for (let d = 0; d < 365; d++) {
  const s = Date.now();
  const p = dailyPuzzle(shiftDayKey('2026-11-01', d));
  slow = Math.max(slow, Date.now() - s);
  total[p.tier]++;
  if (p.rounds < PUZZLE_TIERS[p.tier].minRounds) short[p.tier]++;
}
console.log('daily ms', Date.now() - t1, 'max', slow, 'below-min per tier', short, 'of', total);
