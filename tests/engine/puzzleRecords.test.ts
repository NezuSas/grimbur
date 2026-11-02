import {
  ARCHIVE_KEEP,
  CHAPTER_STARS,
  EMPTY_PUZZLES,
  archiveStars,
  chapterStars,
  isChapterMastered,
  isChestWaiting,
  parsePuzzles,
  puzzleBestTime,
  withChestOpened,
  withPuzzleResult,
} from '../../src/core/stats/puzzleProgress';
import { ownsCosmetic } from '../../src/core/cosmetics/cosmetics';
import { EMPTY_STATS, type LocalStats } from '../../src/core/stats/runStats';

const path = (index: number) => ({ kind: 'path' as const, index });

describe('puzzle records, the archive and chapter chests', () => {
  it('keeps the best time of a path puzzle, and calls only a beaten time a record', () => {
    const first = withPuzzleResult(EMPTY_PUZZLES, path(0), 2, 61.4);
    expect(puzzleBestTime(first.progress, 0)).toBe(61);
    expect(first.record).toBe(false);
    // Faster with fewer stars: the time is still kept, the stars stay, nothing is paid.
    const faster = withPuzzleResult(first.progress, path(0), 1, 40);
    expect(faster.record).toBe(true);
    expect(faster.best).toBe(61);
    expect(faster.embers).toBe(0);
    expect(puzzleBestTime(faster.progress, 0)).toBe(40);
    expect(faster.progress.stars[0]).toBe(2);
    // Slower and no better: nothing changes.
    const slower = withPuzzleResult(faster.progress, path(0), 2, 90);
    expect(slower.progress).toBe(faster.progress);
    expect(slower.record).toBe(false);
  });

  it('a past day from the archive keeps its stars but pays nothing and leaves the streak alone', () => {
    const base = { ...EMPTY_PUZZLES, streak: 3, bestStreak: 3, daily: { date: '2026-11-05', stars: 3 } };
    const r = withPuzzleResult(base, { kind: 'archive', date: '2026-11-02' }, 2, 80);
    expect(r.embers).toBe(0);
    expect(archiveStars(r.progress, '2026-11-02')).toBe(2);
    expect(r.progress.streak).toBe(3);
    expect(r.progress.daily).toEqual(base.daily);
    expect(withPuzzleResult(r.progress, { kind: 'archive', date: '2026-11-02' }, 1).progress).toBe(r.progress);
  });

  it('the puzzle of the day solved on its day is written to the archive too', () => {
    const r = withPuzzleResult(EMPTY_PUZZLES, { kind: 'daily', date: '2026-11-03' }, 3, 50);
    expect(archiveStars(r.progress, '2026-11-03')).toBe(3);
    // Old saves: the last day solved is recovered into the archive.
    expect(archiveStars(parsePuzzles({ daily: { date: '2026-11-01', stars: 2 } }), '2026-11-01')).toBe(2);
  });

  it('the archive keeps only its newest days', () => {
    const archive = Object.fromEntries(Array.from({ length: ARCHIVE_KEEP + 5 }, (_, i) => [`2027-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`, 1]));
    const parsed = parsePuzzles({ archive });
    expect(Object.keys(parsed.archive)).toHaveLength(ARCHIVE_KEEP);
    expect(parsed.archive['2027-01-01']).toBeUndefined();
  });

  it('a chapter is mastered at all its stars: its chest waits once, and its title is owned', () => {
    const stars = [3, 3, 3, 3, 3, 2];
    const almost = { ...EMPTY_PUZZLES, stars };
    expect(chapterStars(almost, 0)).toBe(CHAPTER_STARS - 1);
    expect(isChestWaiting(almost, 0)).toBe(false);
    const full = withPuzzleResult(almost, path(5), 3).progress;
    expect(isChapterMastered(full, 0)).toBe(true);
    expect(isChestWaiting(full, 0)).toBe(true);
    const opened = withChestOpened(full, 0);
    expect(isChestWaiting(opened, 0)).toBe(false);
    expect(withChestOpened(opened, 0)).toBe(opened);
    expect(parsePuzzles({ chests: [0, 0, 9, 'x', 2] }).chests).toEqual([0, 2]);
    const stats = (puzzles: typeof full): LocalStats => ({ ...EMPTY_STATS, puzzles });
    expect(ownsCosmetic(stats(almost), 'title_puzzle0')).toBe(false);
    expect(ownsCosmetic(stats(full), 'title_puzzle0')).toBe(true);
    expect(ownsCosmetic(stats(full), 'title_puzzle1')).toBe(false);
  });
});
