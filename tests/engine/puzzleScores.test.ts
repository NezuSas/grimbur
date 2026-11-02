import { isBetterPuzzle, rankPuzzleRows, type PuzzleRow } from '../../src/services/puzzleScores';

jest.mock('../../src/lib/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn(), setDoc: jest.fn() }));
jest.mock('../../src/services/playerProfile', () => ({ getPlayerId: jest.fn(), getPlayerName: jest.fn() }));

const row = (pid: string, stars: number, time: number): PuzzleRow => ({ pid, name: pid, date: '2026-11-02', stars, mistakes: 0, hints: 0, time, characterIndex: 0 });

describe('the puzzle of the day among friends', () => {
  it('ranks by stars, then by the fastest', () => {
    expect(rankPuzzleRows([row('a', 2, 50), row('b', 3, 300), row('c', 2, 40)]).map(r => r.pid)).toEqual(['b', 'c', 'a']);
  });

  it('only a better try replaces the day’s row, as the server rules say', () => {
    expect(isBetterPuzzle(row('a', 2, 90), null)).toBe(true);
    expect(isBetterPuzzle(row('a', 2, 90), row('a', 2, 140))).toBe(true);
    expect(isBetterPuzzle(row('a', 2, 200), row('a', 2, 140))).toBe(false);
    expect(isBetterPuzzle(row('a', 1, 10), row('a', 2, 140))).toBe(false);
    expect(isBetterPuzzle(row('a', 3, 500), row('a', 2, 140))).toBe(true);
  });
});
