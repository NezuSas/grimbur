import { ENDLESS_AFTER, PUZZLE_COUNT, PUZZLE_TIERS, dailyPuzzle, endlessPuzzle, generatePuzzle, pathPuzzle, puzzleStars, type Puzzle } from '../../src/core/puzzles/puzzles';
import { DAILY_PUZZLE_EMBERS, EMBERS_PER_STAR, EMPTY_PUZZLES, dailyPuzzleNumber, dailyPuzzleStreak, isEndlessOpen, ENDLESS_EMBERS_PER_STAR, isPuzzleOpen, nextPuzzle, parsePuzzles, withPuzzleResult } from '../../src/core/stats/puzzleProgress';
import { puzzleShareText } from '../../src/screens/puzzle/shareText';
import { gameReducer, initialState } from '../../src/core/engine/reducer';
import { provenByLevel, rateDeduction } from '../../src/core/puzzles/deduction';
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
    const safe = [...provenByLevel(p.rows, p.cols, s.entities, s.visited).safe.keys(), ...s.entities.filter(e => e.type === 'coin').map(e => e.index)].filter(i => !seen.has(i));
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
  const daily = Array.from({ length: 30 }, (_, d) => dailyPuzzle(shiftDayKey('2026-11-01', d * 11)));
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

  it('on the path, every chapter from the tracker on demands guardians and vortices read apart, more the deeper it goes', () => {
    for (let i = 0; i < PUZZLE_COUNT; i++) {
      const p = pathPuzzle(i);
      const r = rateDeduction(p.rows, p.cols, p.entities, p.visited);
      const spec = PUZZLE_TIERS[p.tier];
      expect(r.solvable).toBe(true);
      expect(r.uses[1] + r.hard).toBeGreaterThanOrEqual(spec.minTyped);
    }
    expect(PUZZLE_TIERS[0].minTyped).toBe(0);
    expect(PUZZLE_TIERS[PUZZLE_TIERS.length - 1].minTyped).toBeGreaterThanOrEqual(3);
  });

  it('are the same board for the same seed, and the path climbs through the six chapters', () => {
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
    expect(parsePuzzles({ stars: [3, 9, -2, 'x'], daily: { date: 'nope', stars: 2 }, dailySolved: 4.7 })).toEqual({ stars: [3, 3, 0, 0], daily: null, dailySolved: 4, streak: 0, bestStreak: 0, endless: { solved: 0, run: 0, bestRun: 0 }, times: [], archive: {}, chests: [], crowns: [], weekly: null });
    // A save from before the streak starts it at the last day solved.
    expect(parsePuzzles({ stars: [], daily: { date: '2026-11-02', stars: 3 }, dailySolved: 9 })).toMatchObject({ streak: 1, bestStreak: 1 });
  });

  it('keeps a streak of days in a row with the puzzle of the day solved, and ends it on a missed day', () => {
    const day = (n: number) => shiftDayKey('2026-11-02', n);
    let p = EMPTY_PUZZLES;
    for (const n of [0, 1, 2]) p = withPuzzleResult(p, { kind: 'daily', date: day(n) }, 2).progress;
    expect(p).toMatchObject({ streak: 3, bestStreak: 3 });
    // A better try the same day does not count twice.
    p = withPuzzleResult(p, { kind: 'daily', date: day(2) }, 3).progress;
    expect(p.streak).toBe(3);
    expect(dailyPuzzleStreak(p, day(3))).toBe(3);
    expect(dailyPuzzleStreak(p, day(4))).toBe(0);
    p = withPuzzleResult(p, { kind: 'daily', date: day(5) }, 1).progress;
    expect(p).toMatchObject({ streak: 1, bestStreak: 3 });
  });

  it('shares the day as a few lines with its number, stars, time, slips, streak and a dare', () => {
    const t = (k: string, p?: Record<string, string | number>) => `${k}${p ? JSON.stringify(p) : ''}`;
    expect(dailyPuzzleNumber('2026-11-01')).toBe(1);
    expect(dailyPuzzleNumber('2026-11-12')).toBe(12);
    const clean = puzzleShareText(t as never, { number: 12, tier: 'Experto', stars: 3, seconds: 102, mistakes: 0, hints: 0, streak: 5 });
    expect(clean).toContain('⭐⭐⭐  ⏱ 1:42');
    expect(clean).toContain('puzzle.shareClean');
    expect(clean).toContain('puzzle.shareStreak{"n":5}');
    const slips = puzzleShareText(t as never, { number: 3, tier: 'x', stars: 1, seconds: 59, mistakes: 2, hints: 1, streak: 1 });
    expect(slips).toContain('⭐▫️▫️  ⏱ 0:59');
    expect(slips).toContain('❌ 2  💡 1');
    expect(slips).not.toContain('shareStreak');
  });

  it('opens endless puzzles after the path: each solvable by deduction, counted in order, with a run of three-star solves', () => {
    for (let n = 0; n < 12; n++) {
      const p = endlessPuzzle(n);
      expect(p.tier).toBeGreaterThanOrEqual(3);
      expect(solveByDeduction(p)).toEqual({ solved: true, steppedOnHazard: false });
    }
    expect(JSON.stringify(endlessPuzzle(5))).toBe(JSON.stringify(endlessPuzzle(5)));
    // The five first chapters open it; the Legend is not needed.
    let p = { ...EMPTY_PUZZLES, stars: Array(ENDLESS_AFTER - 1).fill(1) };
    expect(isEndlessOpen(p)).toBe(false);
    p = { ...p, stars: Array(ENDLESS_AFTER).fill(1) };
    expect(isEndlessOpen(p)).toBe(true);
    expect(ENDLESS_AFTER).toBeLessThan(PUZZLE_COUNT);
    let r = withPuzzleResult(p, { kind: 'endless', n: 0 }, 3);
    expect(r.embers).toBe(3 * ENDLESS_EMBERS_PER_STAR);
    r = withPuzzleResult(r.progress, { kind: 'endless', n: 1 }, 3);
    expect(r.progress.endless).toEqual({ solved: 2, run: 2, bestRun: 2 });
    // A stale number pays nothing; a slip breaks the run but keeps the best.
    expect(withPuzzleResult(r.progress, { kind: 'endless', n: 0 }, 3).embers).toBe(0);
    r = withPuzzleResult(r.progress, { kind: 'endless', n: 2 }, 2);
    expect(r.progress.endless).toEqual({ solved: 3, run: 0, bestRun: 2 });
  });
});
