import { Direction, GameEntity } from './types';

/**
 * Shortest walk from `from` to `to` that only crosses tiles the player has already explored
 * and that hold nothing (no leftover pickup, trap or hazard). Because it never steps on a
 * fogged tile, following it reveals nothing and risks nothing: it replaces repetitive D-pad taps.
 * Returns the list of moves, or null when there is no such route (or no need to move).
 */
export function travelPath(
  visited: readonly number[],
  entityMap: Record<number, GameEntity>,
  from: number,
  to: number,
  rows: number,
  cols: number,
): Direction[] | null {
  if (from === to) return null;
  const known = new Set(visited);
  const walkable = (i: number) => i === from || (known.has(i) && !entityMap[i]);
  if (!walkable(to)) return null;

  const steps: { dir: Direction; dr: number; dc: number }[] = [
    { dir: 'UP', dr: -1, dc: 0 },
    { dir: 'DOWN', dr: 1, dc: 0 },
    { dir: 'LEFT', dr: 0, dc: -1 },
    { dir: 'RIGHT', dr: 0, dc: 1 },
  ];

  const prev = new Map<number, { from: number; dir: Direction }>();
  const queue = [from];
  const seen = new Set([from]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === to) break;
    const row = Math.floor(current / cols);
    const col = current % cols;
    for (const { dir, dr, dc } of steps) {
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
      const next = r * cols + c;
      if (seen.has(next) || !walkable(next)) continue;
      seen.add(next);
      prev.set(next, { from: current, dir });
      queue.push(next);
    }
  }

  if (!prev.has(to)) return null;
  const path: Direction[] = [];
  for (let at = to; at !== from; ) {
    const p = prev.get(at)!;
    path.push(p.dir);
    at = p.from;
  }
  return path.reverse();
}
