import { YULE_FLOORS, YULE_GIFT_EMBERS, YULE_PUZZLES, addYuleFloors, addYulePuzzle, isYuleDay, parseEvents, yuleGoalMet, yuleProgress } from '../../src/core/events/yule';
import { DAILY_PUZZLE_EMBERS, EMPTY_PUZZLES, withPuzzleResult } from '../../src/core/stats/puzzleProgress';
import { cosmeticInfo, collectionProgress, ownsCosmetic } from '../../src/core/cosmetics/cosmetics';
import { EMPTY_STATS } from '../../src/core/stats/runStats';

describe('Christmas in the cave', () => {
  it('runs all through December only', () => {
    expect(isYuleDay('2026-12-01')).toBe(true);
    expect(isYuleDay('2026-12-31')).toBe(true);
    expect(isYuleDay('2026-11-30')).toBe(false);
    expect(isYuleDay('2027-01-01')).toBe(false);
  });

  it('counts floors and puzzles of the day per year, only in December', () => {
    let e = addYuleFloors({}, '2026-11-30', 10);
    expect(e).toEqual({});
    e = addYuleFloors(e, '2026-12-03', 10);
    e = addYuleFloors(e, '2026-12-04', 7);
    e = addYulePuzzle(e, '2026-12-04');
    expect(yuleProgress(e, '2026-12-05')).toEqual({ floors: 17, puzzles: 1 });
    expect(yuleProgress(e, '2027-12-01')).toEqual({ floors: 0, puzzles: 0 });
    expect(parseEvents({ yule2026: { floors: 3.6, puzzles: -1 }, junk: { floors: 9 } })).toEqual({ yule2026: { floors: 3, puzzles: 0 } });
  });

  it('gives the frame, the reindeer and the title for good once their goal is met, and never holds back a full collection', () => {
    const met = { yule2026: { floors: YULE_FLOORS, puzzles: YULE_PUZZLES - 1 } };
    expect(yuleGoalMet(met, 'floors')).toBe(true);
    expect(yuleGoalMet(met, 'puzzles')).toBe(false);
    expect(yuleGoalMet(met, 'both')).toBe(false);
    const stats = { ...EMPTY_STATS, events: met };
    expect(ownsCosmetic(stats, 'frame_yule')).toBe(true);
    expect(ownsCosmetic(stats, 'pet_reindeer')).toBe(false);
    expect(cosmeticInfo('title_yule').unlock).toEqual({ kind: 'event', event: 'yule', goal: 'both' });
    expect(collectionProgress(stats).owned).toBe(collectionProgress(EMPTY_STATS).owned);
  });

  it('adds a gift to the first solve of the puzzle of the day in December', () => {
    expect(withPuzzleResult(EMPTY_PUZZLES, { kind: 'daily', date: '2026-12-10' }, 2).embers).toBe(DAILY_PUZZLE_EMBERS + YULE_GIFT_EMBERS);
    expect(withPuzzleResult(EMPTY_PUZZLES, { kind: 'daily', date: '2026-11-10' }, 2).embers).toBe(DAILY_PUZZLE_EMBERS);
  });
});
