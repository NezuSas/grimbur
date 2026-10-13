import { GameEntity } from './types';

export interface NearbyHazards {
  enemy: boolean;
  pit: boolean;
}

/**
 * Looks at the four orthogonal neighbours of `index` and reports which hazard
 * types are adjacent. Out-of-board neighbours (including row wrap-around) are
 * ignored.
 */
export function getNearbyHazards(
  index: number,
  rows: number,
  cols: number,
  entityMap: Record<number, GameEntity>,
): NearbyHazards {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const neighbours = [
    { r: row - 1, c: col },
    { r: row + 1, c: col },
    { r: row, c: col - 1 },
    { r: row, c: col + 1 },
  ];

  const result: NearbyHazards = { enemy: false, pit: false };
  for (const { r, c } of neighbours) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
    const type = entityMap[r * cols + c]?.type;
    if (type === 'enemy') result.enemy = true;
    if (type === 'pit') result.pit = true;
  }
  return result;
}
