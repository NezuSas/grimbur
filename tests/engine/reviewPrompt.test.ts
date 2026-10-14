import { EMPTY_STATS, LocalStats } from '../../src/core/stats/runStats';
import { REVIEW_COOLDOWN_DAYS, justWonExpedition, shouldRequestReview } from '../../src/core/stats/reviewPrompt';

const DAY = 86_400_000;
const TODAY = '2026-06-10';
const NOW = Date.UTC(2026, 5, 10, 12);

const won = (day = TODAY, mode: 'expedition' | 'daily' | 'endless' = 'expedition') => ({ day, score: 900, level: 10, victory: true, mode });
const lost = { day: TODAY, score: 100, level: 2, victory: false, mode: 'expedition' as const };
const stats = (patch: Partial<LocalStats>): LocalStats => ({ ...EMPTY_STATS, gamesPlayed: 5, ...patch });

describe('shouldRequestReview', () => {
  it('asks after a fresh expedition victory', () => {
    expect(shouldRequestReview(stats({ history: [lost, won()] }), TODAY, NOW, 0)).toBe(true);
  });

  it('asks on a streak of 3+ days even without a win', () => {
    const s = stats({ history: [lost], streak: 3, lastDailyDate: TODAY });
    expect(shouldRequestReview(s, TODAY, NOW, 0)).toBe(true);
    expect(shouldRequestReview({ ...s, streak: 2 }, TODAY, NOW, 0)).toBe(false);
  });

  it('ignores a broken streak', () => {
    expect(shouldRequestReview(stats({ streak: 9, lastDailyDate: '2026-06-01' }), TODAY, NOW, 0)).toBe(false);
  });

  it('never asks before 3 finished runs (first run included)', () => {
    expect(shouldRequestReview(stats({ gamesPlayed: 0, history: [won()] }), TODAY, NOW, 0)).toBe(false);
    expect(shouldRequestReview(stats({ gamesPlayed: 2, history: [won()] }), TODAY, NOW, 0)).toBe(false);
    expect(shouldRequestReview(stats({ gamesPlayed: 3, history: [won()] }), TODAY, NOW, 0)).toBe(true);
  });

  it('needs a victory that is an expedition and recent', () => {
    expect(justWonExpedition(stats({ history: [won(TODAY, 'daily')] }), TODAY)).toBe(false);
    expect(justWonExpedition(stats({ history: [won(TODAY, 'endless')] }), TODAY)).toBe(false);
    expect(justWonExpedition(stats({ history: [won('2026-06-01')] }), TODAY)).toBe(false);
    expect(justWonExpedition(stats({ history: [won(), lost] }), TODAY)).toBe(false);
    expect(justWonExpedition(stats({ history: [] }), TODAY)).toBe(false);
  });

  it('respects the cooldown', () => {
    const s = stats({ history: [won()] });
    expect(shouldRequestReview(s, TODAY, NOW, NOW - 10 * DAY)).toBe(false);
    expect(shouldRequestReview(s, TODAY, NOW, NOW - (REVIEW_COOLDOWN_DAYS - 1) * DAY)).toBe(false);
    expect(shouldRequestReview(s, TODAY, NOW, NOW - REVIEW_COOLDOWN_DAYS * DAY)).toBe(true);
  });

  it('a stored timestamp from the future does not block forever', () => {
    expect(shouldRequestReview(stats({ history: [won()] }), TODAY, NOW, NOW + 400 * DAY)).toBe(true);
  });
});
