import { provenMarks } from '../engine/solver';
import { isClueHazard, type GameEntity } from '../engine/types';

/** Where a neighbour lies, seen from the tile the hint lights. */
export type Side = 'up' | 'down' | 'left' | 'right';

/**
 * Why the hint's tile is safe, in words a player can reuse:
 * - `empty`: an explored neighbour senses nothing at all around it;
 * - `full`: an explored neighbour's danger count is already used up by hazards the clues place elsewhere;
 * - `combined`: no single clue says it, several together do;
 * - `gem`: it is a gem in plain sight.
 */
export type HintReason =
  | { kind: 'empty'; side: Side }
  | { kind: 'full'; side: Side; count: number }
  | { kind: 'combined' }
  | { kind: 'gem' };

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

const sideOf = (from: number, to: number, cols: number): Side => (to === from - cols ? 'up' : to === from + cols ? 'down' : to === from - 1 ? 'left' : 'right');

/** The simplest reason the clues give for `tile` being safe (the one-clue reasons first: those are the ones worth learning). */
export function hintReason(rows: number, cols: number, entities: readonly GameEntity[], visited: readonly number[], tile: number): HintReason {
  if (entities.some(e => e.index === tile && e.type === 'coin')) return { kind: 'gem' };
  const hazards = new Set(entities.filter(e => isClueHazard(e.type)).map(e => e.index));
  const marks = provenMarks(rows, cols, entities, visited);
  const seen = new Set(visited);
  const around = neighbours(tile, rows, cols).filter(n => seen.has(n));
  const clue = (v: number) => neighbours(v, rows, cols).filter(n => hazards.has(n)).length;
  for (const v of around) if (clue(v) === 0) return { kind: 'empty', side: sideOf(tile, v, cols) };
  for (const v of around) {
    const count = clue(v);
    const placed = neighbours(v, rows, cols).filter(n => n !== tile && marks.get(n) === 'danger').length;
    if (placed === count) return { kind: 'full', side: sideOf(tile, v, cols), count };
  }
  return { kind: 'combined' };
}
