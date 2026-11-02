import { PUZZLE_COUNT, PUZZLE_TIERS, dailyPuzzle, generatePuzzle, pathPuzzle, puzzleStars, type Puzzle } from '../../src/core/puzzles/puzzles';
import { DAILY_PUZZLE_EMBERS, EMBERS_PER_STAR, EMPTY_PUZZLES, isPuzzleOpen, nextPuzzle, parsePuzzles, withPuzzleResult } from '../../src/core/stats/puzzleProgress';
import { gameReducer, initialState } from '../../src/core/engine/reducer';
import { provenSafeTiles } from '../../src/core/engine/solver';
import { travelPath } from '../../src/core/engine/travel';
import { NO_PERKS } from '../../src/core/engine/heroes';
import { shiftDayKey } from '../../src/core/engine/seed';
import type { Direction, GameState } from '../../src/core/engine/types';

/** Plays a puzzle like a careful player, through the real reducer: only ever steps on a tile the clues prove safe. */
function solveByDeduction(p: Puzzle): { solved: boolean; steppedOnHazard: boolean } {
  let s: GameState = gameReducer(initialState, {
    type: 'RESET', character: { playerName: 'T' } as never, rows: p.rows, cols: p.cols, entities: p.entities.map(e => ({ ...e })),
    coins: p.entities.filter(e => e.type === 'coin').length, attack: 0, seed: 1, perks: NO_PERKS,
  });
  s = { ...s, playerIndex: p.start, visited: [...p.visited], undo: null, secret: null, encounter: null };
  const hazards = new Set(p.entities.filter(e => e.type !== 'coin').map(e => e.index));
  const dirTo = (from: number, to: number): Direction => (to === from - p.cols ? 'UP' : to === from + p.cols ? 'DOWN' : to === from - 1 ? 'LEFT' : 'RIGHT');
  const near = (a: number, b: number) => Math.abs(Math.floor(a / p.cols) - Math.floor(b / p.cols)) + Math.abs((a % p.cols) - (b % p.cols)) === 1;
  for (let guard = 0; guard < 500 && s.coins > 0; guard++) {
    const seen = new Set(s.visited);
    const safe = [...provenSafeTiles(p.rows, p.cols, s.entities, s.visited)].filter(i => !seen.has(i));
    const target = safe.find(i => s.visited.some(v => near(v, i)));
    if (target === undefined) return { solved: false, steppedOnHazard: false };
    const door = s.visited.find(v => near(v, target) && (v === s.playerIndex || travelPath(s.visited, s.entityMap, s.playerIndex, v, p.rows, p.cols)))!;
    for (const d of travelPath(s.visited, s.entityMap, s.playerIndex, door, p.rows, p.cols) ?? []) s = gameReducer(s, { type: 'MOVE', direction: d });
    if (hazards.has(target)) return { solved: false, steppedOnHazard: true };
    s = gameReducer(s, { type: 'MOVE', direction: dirTo(s.playerIndex, target) });
  }
  return { solved: s.coins === 0 && !s.isGameOver, steppedOnHazard: false };
}

describe('the cave puzzles', () => {
  const daily = Array.from({ length: 40 }, (_, d) => dailyPuzzle(shiftDayKey('2026-11-01', d * 9)));
  const all = [...Array.from({ length: PUZZLE_COUNT }, (_, i) => pathPuzzle(i)), ...daily];

  it('are well formed: the explored patch is safe, the gems lie in the fog, the board matches its tier', () => {
    for (const p of all) {
      const spec = PUZZLE_TIERS[p.tier];
      expect([p.rows, p.cols]).toEqual([spec.rows, spec.cols]);
      const at = new Map(p.entities.map(e => [e.index, e.type]));
      expect(p.visited).toContain(p.start);
      for (const v of p.visited) expect(at.has(v)).toBe(false);
      expect(p.entities.filter(e => e.type === 'coin')).toHaveLength(spec.gems);
      expect(p.rounds).toBeGreaterThanOrEqual(spec.minRounds);
    }
  });

  it('can all be solved by reading the clues, through the real game rules, without one guess', () => {
    for (const p of all) expect(solveByDeduction(p)).toEqual({ solved: true, steppedOnHazard: false });
  });

  it('are the same board for the same seed, and the path climbs through the five levels', () => {
    expect(generatePuzzle(42, 2)).toEqual(generatePuzzle(42, 2));
    expect(pathPuzzle(0).tier).toBe(0);
    expect(pathPuzzle(PUZZLE_COUNT - 1).tier).toBe(PUZZLE_TIERS.length - 1);
    expect(dailyPuzzle('2026-11-02')).toEqual(dailyPuzzle('2026-11-02'));
  });

  it('give three stars only without a mistake or a hint', () => {
    expect(puzzleStars(0, 0)).toBe(3);
    expect(puzzleStars(1, 0)).toBe(2);
    expect(puzzleStars(0, 1)).toBe(2);
    expect(puzzleStars(3, 2)).toBe(1);
  });

  it('pay every new star once, and the daily one the first time each day', () => {
    const one = withPuzzleResult(EMPTY_PUZZLES, { kind: 'path', index: 0 }, 1);
    expect(one.embers).toBe(EMBERS_PER_STAR);
    const three = withPuzzleResult(one.progress, { kind: 'path', index: 0 }, 3);
    expect(three.embers).toBe(2 * EMBERS_PER_STAR);
    expect(withPuzzleResult(three.progress, { kind: 'path', index: 0 }, 2).embers).toBe(0);
    expect(isPuzzleOpen(three.progress, 1)).toBe(true);
    expect(isPuzzleOpen(three.progress, 2)).toBe(false);
    expect(nextPuzzle(three.progress)).toBe(1);
    const d1 = withPuzzleResult(three.progress, { kind: 'daily', date: '2026-11-02' }, 2);
    expect(d1.embers).toBe(DAILY_PUZZLE_EMBERS);
    expect(d1.progress.dailySolved).toBe(1);
    const again = withPuzzleResult(d1.progress, { kind: 'daily', date: '2026-11-02' }, 3);
    expect(again.embers).toBe(0);
    expect(again.progress.daily).toEqual({ date: '2026-11-02', stars: 3 });
    expect(again.progress.dailySolved).toBe(1);
  });

  it('read back from a save, cleaning anything malformed', () => {
    expect(parsePuzzles(null)).toEqual(EMPTY_PUZZLES);
    expect(parsePuzzles({ stars: [3, 9, -2, 'x'], daily: { date: 'nope', stars: 2 }, dailySolved: 4.7 })).toEqual({ stars: [3, 3, 0, 0], daily: null, dailySolved: 4 });
  });
});
