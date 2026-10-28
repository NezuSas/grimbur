import { GameEntity, isClueHazard } from './types';

type Mark = 'safe' | 'danger';

function neighbours(index: number, rows: number, cols: number): number[] {
  const r = Math.floor(index / cols);
  const c = index % cols;
  const out: number[] = [];
  if (r > 0) out.push(index - cols);
  if (r < rows - 1) out.push(index + cols);
  if (c > 0) out.push(index - 1);
  if (c < cols - 1) out.push(index + 1);
  return out;
}

/**
 * Can a careful player collect every gem using only the clue numbers (Minesweeper-style deduction),
 * never gambling on an unknown tile? Gems and power-ups are visible, so they count as known safe.
 *
 * The generator uses this to reject boards that would force a blind guess: luck that cannot be
 * avoided is the genre's most common complaint.
 */
export function isSolvableByDeduction(
  rows: number,
  cols: number,
  entities: readonly GameEntity[],
  start: number,
  startVisited: readonly number[] = [start],
): boolean {
  const hazards = new Set<number>();
  const gems: number[] = [];
  const knownSafe = new Set<number>();
  for (const e of entities) {
    if (isClueHazard(e.type)) hazards.add(e.index);
    else if (e.type === 'coin') {
      gems.push(e.index);
      knownSafe.add(e.index);
    } else if (e.type === 'shield' || e.type === 'ammo') knownSafe.add(e.index);
  }
  if (gems.length === 0) return true;

  const clue = (index: number) => neighbours(index, rows, cols).filter(n => hazards.has(n)).length;

  const visited = new Set<number>(startVisited);
  const marks = new Map<number, Mark>();
  for (const i of knownSafe) marks.set(i, 'safe');

  for (;;) {
    // 1. Deduce what the explored clues prove.
    deduce(visited, marks, clue, rows, cols);

    // 2. Walk everywhere that is explored or proven safe; those tiles become explored.
    const queue = [...visited];
    const reached = new Set<number>(visited);
    let grew = false;
    for (let head = 0; head < queue.length; head++) {
      for (const n of neighbours(queue[head], rows, cols)) {
        if (reached.has(n) || marks.get(n) !== 'safe') continue;
        reached.add(n);
        queue.push(n);
        grew = true;
      }
    }
    if (!grew) break;
    reached.forEach(i => visited.add(i));
  }

  return gems.every(g => visited.has(g));
}

/** Applies the clue rules over the explored tiles until nothing new is proven (marks are updated in place). */
function deduce(
  visited: ReadonlySet<number>,
  marks: Map<number, Mark>,
  clue: (index: number) => number,
  rows: number,
  cols: number,
): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const v of visited) {
      const around = neighbours(v, rows, cols).filter(n => !visited.has(n));
      const dangers = around.filter(n => marks.get(n) === 'danger').length;
      const unknown = around.filter(n => !marks.has(n));
      if (unknown.length === 0) continue;
      const remaining = clue(v) - dangers;
      if (remaining === 0) {
        unknown.forEach(n => marks.set(n, 'safe'));
        changed = true;
      } else if (remaining === unknown.length) {
        unknown.forEach(n => marks.set(n, 'danger'));
        changed = true;
      }
    }
  }
}

/**
 * Tiles a careful player can already PROVE safe from what is on screen: visible gems and power-ups plus the
 * deductions the explored clues allow (the same rules the generator's solvability check uses). Used by the Scout
 * so it reveals something the player does not already know.
 */
export function provenSafeTiles(
  rows: number,
  cols: number,
  entities: readonly GameEntity[],
  visitedTiles: readonly number[],
): Set<number> {
  const hazards = new Set<number>();
  const marks = new Map<number, Mark>();
  for (const e of entities) {
    if (isClueHazard(e.type)) hazards.add(e.index);
    else if (e.type === 'coin' || e.type === 'shield' || e.type === 'ammo') marks.set(e.index, 'safe');
  }
  const clue = (index: number) => neighbours(index, rows, cols).filter(n => hazards.has(n)).length;
  deduce(new Set(visitedTiles), marks, clue, rows, cols);
  const safe = new Set<number>();
  marks.forEach((m, i) => {
    if (m === 'safe') safe.add(i);
  });
  return safe;
}
