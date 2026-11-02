import type { Puzzle } from './puzzles';

/**
 * The Manual's deduction techniques: three small boards, each opening on exactly the move it teaches (found with
 * scripts/findTechniques.ts; the tests check that again). They are played like a puzzle, without stars or embers.
 *  - quiet: a tile that senses nothing makes all its neighbours safe;
 *  - cornered: a clue with as many unexplored neighbours as dangers has them all as dangers (flag them);
 *  - full: once a clue's dangers are placed (a flag), every other neighbour of it is safe.
 */
export type TechniqueId = 'quiet' | 'cornered' | 'full';

export interface Technique {
  id: TechniqueId;
  puzzle: Puzzle;
  /** Flags already planted when it opens (the danger the lesson takes as known). */
  flags: number[];
}

const board = (start: number, visited: number[], entities: Puzzle['entities'], rounds: number, biome: Puzzle['biome']): Puzzle => ({ rows: 4, cols: 5, start, visited, entities, tier: 0, rounds, biome });

export const TECHNIQUES: readonly Technique[] = [
  {
    id: 'quiet',
    puzzle: board(5, [5, 10], [{ index: 13, type: 'coin' }, { index: 15, type: 'enemy' }, { index: 3, type: 'pit' }, { index: 1, type: 'enemy' }], 3, 'cave'),
    flags: [],
  },
  {
    id: 'cornered',
    puzzle: board(19, [19, 14, 18, 17], [{ index: 7, type: 'coin' }, { index: 13, type: 'pit' }, { index: 12, type: 'enemy' }, { index: 10, type: 'pit' }], 2, 'crystal'),
    flags: [],
  },
  {
    id: 'full',
    puzzle: board(4, [4, 9, 3, 2], [{ index: 17, type: 'coin' }, { index: 8, type: 'enemy' }, { index: 10, type: 'enemy' }, { index: 1, type: 'pit' }, { index: 11, type: 'enemy' }], 3, 'magma'),
    flags: [8],
  },
];

export const techniqueOf = (id: string | undefined): Technique | undefined => TECHNIQUES.find(x => x.id === id);
