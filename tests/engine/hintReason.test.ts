import { PUZZLE_COUNT, pathPuzzle } from '../../src/core/puzzles/puzzles';
import { hintReason } from '../../src/core/puzzles/hintReason';
import { provenSafeTiles } from '../../src/core/engine/solver';
import type { GameEntity } from '../../src/core/engine/types';

const enemy = (index: number): GameEntity => ({ index, type: 'enemy' });

describe('the hint that teaches', () => {
  it('names the quiet neighbour, a gem in sight, or a clue whose dangers are already placed', () => {
    // 3x3, a guardian in the far corner: the explored corner senses nothing, so the tile to its right is safe.
    expect(hintReason(3, 3, [enemy(8)], [0], 1)).toEqual({ kind: 'empty', side: 'left' });
    expect(hintReason(3, 3, [enemy(8), { index: 2, type: 'coin' }], [0], 2)).toEqual({ kind: 'gem' });
    // 1x4 corridor: tile 1 senses one danger; the clues place it at 0 (tile 2 is proven safe by the quiet tile 3)...
    // ...so seen from tile 2, the tile to its left has its danger placed already.
    expect(hintReason(1, 4, [enemy(0)], [1, 3], 2)).toEqual({ kind: 'empty', side: 'right' });
    // 3x2: tiles 1 and 3 explored; 1 senses one danger and can only mean 0, so tile 4, under tile 2 (one danger too), is safe.
    expect(hintReason(3, 2, [enemy(0)], [1, 2, 3], 4)).toEqual({ kind: 'full', side: 'up', count: 1 });
  });

  it('gives a true reason for the first hint of every puzzle of the path, most often one a single clue proves', () => {
    let single = 0;
    for (let i = 0; i < PUZZLE_COUNT; i++) {
      const p = pathPuzzle(i);
      const seen = new Set(p.visited);
      const safe = [...provenSafeTiles(p.rows, p.cols, p.entities, p.visited)].filter(t => !seen.has(t));
      const pick = safe.find(t => !p.entities.some(e => e.index === t)) ?? safe[0];
      if (pick === undefined) continue;
      const why = hintReason(p.rows, p.cols, p.entities, p.visited, pick);
      expect(p.entities.some(e => e.index === pick && e.type !== 'coin')).toBe(false);
      if (why.kind === 'empty' || why.kind === 'full') single++;
    }
    expect(single).toBeGreaterThan(PUZZLE_COUNT / 2);
  });
});
