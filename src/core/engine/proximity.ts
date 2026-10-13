import { GameEntity } from './types';

export interface NearbyHazards {
  enemy: boolean;
  pit: boolean;
  /** How many guardians are orthogonally adjacent. */
  enemyCount: number;
  /** How many vortexes are orthogonally adjacent. */
  pitCount: number;
}

/**
 * Looks at the four orthogonal neighbours of `index` and reports which hazards
 * are adjacent (and how many). Out-of-board neighbours, including row
 * wrap-around, are ignored.
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

  let enemyCount = 0;
  let pitCount = 0;
  for (const { r, c } of neighbours) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
    const type = entityMap[r * cols + c]?.type;
    if (type === 'enemy' || type === 'boss' || type === 'stalker') enemyCount++;
    if (type === 'pit') pitCount++;
  }
  return { enemy: enemyCount > 0, pit: pitCount > 0, enemyCount, pitCount };
}
