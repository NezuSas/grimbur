/**
 * Finds small boards for the Manual's deduction techniques: boards whose opening move is exactly the technique taught.
 *   npx tsx scripts/findTechniques.ts
 * Prints one board per technique, ready to paste into src/core/puzzles/techniques.ts (the tests re-check them).
 */
import { createPRNG } from '../src/core/random/prng';
import { deductionRounds, provenMarks } from '../src/core/engine/solver';
import { hintReason } from '../src/core/puzzles/hintReason';
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

type Board = { start: number; visited: number[]; entities: GameEntity[] };

function random(seed: number): Board | null {
  const next = createPRNG(seed);
  next();
  const start = [0, COLS - 1, (ROWS - 1) * COLS, ROWS * COLS - 1, COLS, 2 * COLS][Math.floor(next() * 6)];
  const hazards = new Set<number>();
  const ring = new Set([start, ...nb(start)]);
  const want = 2 + Math.floor(next() * 3);
  for (let t = 0; hazards.size < want && t < 200; t++) {
    const i = Math.floor(next() * ROWS * COLS);
    if (!ring.has(i)) hazards.add(i);
  }
  const visited = [start];
  const reveal = 2 + Math.floor(next() * 3);
  while (visited.length < reveal) {
    const f = visited.flatMap(nb).filter(n => !visited.includes(n) && !hazards.has(n));
    if (!f.length) break;
    visited.push(f[Math.floor(next() * f.length)]);
  }
  const far = [...Array(ROWS * COLS).keys()].filter(i => !hazards.has(i) && !visited.includes(i) && Math.abs(Math.floor(i / COLS) - Math.floor(start / COLS)) + Math.abs((i % COLS) - (start % COLS)) >= 4);
  if (!far.length) return null;
  const gem = far[Math.floor(next() * far.length)];
  const entities: GameEntity[] = [{ index: gem, type: 'coin' }, ...[...hazards].map(index => ({ index, type: next() < 0.5 ? ('enemy' as const) : ('pit' as const) }))];
  return { start, visited, entities };
}

function classify(b: Board): { kind: 'quiet' | 'cornered' | null; dangers: number[] } {
  const marks = provenMarks(ROWS, COLS, b.entities, b.visited);
  const seen = new Set(b.visited);
  const gem = b.entities.find(e => e.type === 'coin')!.index;
  const frontier = [...marks].filter(([i, m]) => m === 'safe' && !seen.has(i) && i !== gem && b.visited.some(v => nb(v).includes(i))).map(([i]) => i);
  const dangers = [...marks].filter(([, m]) => m === 'danger').map(([i]) => i);
  if (!frontier.length) return { kind: null, dangers };
  const kinds = new Set(frontier.map(t => hintReason(ROWS, COLS, b.entities, b.visited, t).kind));
  if (kinds.size === 1 && kinds.has('empty') && dangers.length === 0) return { kind: 'quiet', dangers };
  if (kinds.size === 1 && kinds.has('full') && dangers.length > 0) return { kind: 'cornered', dangers };
  return { kind: null, dangers };
}

const found: Record<string, Board & { rounds: number; dangers: number[] }[]> = { quiet: [] as never, cornered: [] as never };
for (let seed = 1; seed < 200000; seed++) {
  const b = random(seed);
  if (!b) continue;
  const rounds = deductionRounds(ROWS, COLS, b.entities, b.visited);
  if (rounds < 2 || rounds > 4) continue;
  const { kind, dangers } = classify(b);
  if (!kind) continue;
  const list = found[kind] as unknown as (Board & { rounds: number; dangers: number[] })[];
  if (list.length < 3) list.push({ ...b, rounds, dangers });
  if ((found.quiet as unknown as unknown[]).length >= 3 && (found.cornered as unknown as unknown[]).length >= 3) break;
}
console.log(JSON.stringify(found, null, 0));
