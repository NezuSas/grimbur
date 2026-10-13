import { isSolvableByDeduction } from '../../src/core/engine/solver';
import { generateBoard } from '../../src/core/engine/generator';
import { GameEntity } from '../../src/core/engine/types';

const e = (index: number, type: GameEntity['type']): GameEntity => ({ index, type });

describe('isSolvableByDeduction', () => {
  // 3 x 4 board:   0  1  2  3
  //                4  5  6  7
  //                8  9 10 11
  it('solves a board whose clues pin down every hazard', () => {
    // Guardian at 6, gem at 3: the clues around it are enough to walk around.
    expect(isSolvableByDeduction(3, 4, [e(6, 'enemy'), e(3, 'coin')], 0)).toBe(true);
  });

  it('is true when there are no gems', () => {
    expect(isSolvableByDeduction(3, 4, [e(6, 'enemy')], 0)).toBe(true);
  });

  it('is false when a gem hides behind an unavoidable 50/50', () => {
    // Corridor 1 x 4 with a vortex somewhere before the gem: 0 sees "1", tiles 1 is the only way and is the vortex.
    expect(isSolvableByDeduction(1, 4, [e(1, 'pit'), e(3, 'coin')], 0)).toBe(false);
  });

  it('ignores stalkers, which move', () => {
    expect(isSolvableByDeduction(3, 4, [e(6, 'stalker'), e(3, 'coin')], 0)).toBe(true);
  });

  it('does not report a board solvable just because it is empty of clues it needs', () => {
    // Two vortexes boxing in the gem with the start: the gem is visible but unreachable without a guess.
    expect(isSolvableByDeduction(3, 4, [e(1, 'pit'), e(4, 'pit'), e(11, 'coin')], 0)).toBe(false);
  });

  it('the generator hands out boards a player can solve without a blind guess', () => {
    let total = 0;
    let fair = 0;
    for (let floor = 1; floor <= 9; floor++) {
      for (let seed = 1; seed <= 40; seed++) {
        const b = generateBoard(floor, seed * 7919 + floor);
        total++;
        if (isSolvableByDeduction(b.rows, b.cols, b.entities, b.playerIndex)) fair++;
      }
    }
    expect(fair / total).toBeGreaterThan(0.99);
  });
});
