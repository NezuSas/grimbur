import type { MissionsState } from '../../src/core/stats/missions';
import {
  DAILY_BONUS, DAILY_POOL, EMPTY_MISSIONS, WEEKLY_POOL, applyRun, bonusReady, claim, claimableCount, dailySelection, parseMissions, syncMissions,
  weeklySelection, weekKeyOf,
} from '../../src/core/stats/missions';
import { MAX_RANK, RANK_THRESHOLDS, rankOf, rankUp } from '../../src/core/stats/rank';

describe('weekKeyOf', () => {
  it('is the Monday of the week', () => {
    expect(weekKeyOf('2026-10-14')).toBe('2026-10-12'); // a Wednesday
    expect(weekKeyOf('2026-10-12')).toBe('2026-10-12'); // the Monday itself
    expect(weekKeyOf('2026-10-18')).toBe('2026-10-12'); // the Sunday
    expect(weekKeyOf('2026-01-01')).toBe('2025-12-29'); // across the year
  });
});

describe('mission selection', () => {
  it('gives one easy, one medium and one hard mission, the same for the same day', () => {
    const a = dailySelection('2026-10-14');
    expect(a.map(m => m.tier)).toEqual(['easy', 'medium', 'hard']);
    expect(dailySelection('2026-10-14')).toEqual(a);
  });

  it('changes from day to day (not the same trio for a fortnight)', () => {
    const trios = new Set<string>();
    for (let day = 1; day <= 14; day++) trios.add(dailySelection(`2026-10-${String(day).padStart(2, '0')}`).map(m => m.id).join());
    expect(trios.size).toBeGreaterThan(4);
  });

  it('gives two weekly missions of different kinds', () => {
    for (let w = 0; w < 30; w++) {
      const [x, y] = weeklySelection(`2026-0${(w % 9) + 1}-${String((w % 27) + 1).padStart(2, '0')}`);
      expect(x.id).not.toBe(y.id);
      expect(x.metric).not.toBe(y.metric);
    }
  });

  it('every mission is reachable and pays something', () => {
    for (const m of [...DAILY_POOL, ...WEEKLY_POOL]) {
      expect(m.target).toBeGreaterThan(0);
      expect(m.reward).toBeGreaterThan(0);
    }
  });
});

describe('syncMissions', () => {
  it('fills a fresh state and keeps the progress when nothing changed', () => {
    const s = syncMissions(EMPTY_MISSIONS, '2026-10-14');
    expect(s.daily).toHaveLength(3);
    expect(s.weekly).toHaveLength(2);
    expect(syncMissions(s, '2026-10-14')).toBe(s);
  });

  it('a new day replaces the daily missions but keeps the weekly ones', () => {
    const s = syncMissions(EMPTY_MISSIONS, '2026-10-14');
    const t = syncMissions(s, '2026-10-15');
    expect(t.day).toBe('2026-10-15');
    expect(t.weekly).toEqual(s.weekly);
    expect(t.bonusClaimed).toBe(false);
  });

  it('a new week replaces the weekly ones', () => {
    const s = syncMissions(EMPTY_MISSIONS, '2026-10-18');
    const t = syncMissions(s, '2026-10-19');
    expect(t.week).toBe('2026-10-19');
  });
});

describe('applyRun and claim', () => {
  const state = (ids: string[], weekly: string[] = []): MissionsState => ({
    ...EMPTY_MISSIONS,
    day: '2026-10-14',
    week: '2026-10-12',
    daily: ids.map(id => ({ id, progress: 0, claimed: false })),
    weekly: weekly.map(id => ({ id, progress: 0, claimed: false })),
  });

  it('adds up runs and gems, and takes the best floor and score', () => {
    let s = state(['d_runs2', 'd_gems20', 'd_floor5', 'd_score1500']);
    s = applyRun(s, { score: 800, level: 3, gems: 12 }).state;
    const r = applyRun(s, { score: 2000, level: 6, gems: 12 });
    expect(r.state.daily.map(p => p.progress)).toEqual([2, 24, 6, 2000]);
    expect(r.done.sort()).toEqual(['d_floor5', 'd_gems20', 'd_runs2', 'd_score1500'].sort());
  });

  it('reports a mission as done only once', () => {
    let s = state(['d_runs2']);
    s = applyRun(s, { score: 0, level: 1 }).state;
    expect(applyRun(s, { score: 0, level: 1 }).done).toEqual(['d_runs2']);
    s = applyRun(s, { score: 0, level: 1 }).state;
    expect(applyRun(s, { score: 0, level: 1 }).done).toEqual([]);
  });

  it('counts different heroes once each', () => {
    let s = state([], ['w_heroes3']);
    for (const h of [0, 0, 2, 2, 5]) s = applyRun(s, { score: 0, level: 1, heroIndex: h }).state;
    expect(s.weekly[0].progress).toBe(3);
  });

  it('wins and daily runs only count when they happen; the endless descent does not feed floor goals', () => {
    let s = state(['d_win', 'd_floor7'], ['w_daily3']);
    s = applyRun(s, { score: 9000, level: 12, mode: 'endless' }).state;
    expect(s.daily[1].progress).toBe(0);
    s = applyRun(s, { score: 100, level: 2, victory: true, mode: 'daily' }).state;
    expect([s.daily[0].progress, s.weekly[0].progress]).toEqual([1, 1]);
  });

  it('pays a mission once, only when it is done', () => {
    let s = state(['d_runs2']);
    expect(claim(s, 'd_runs2').embers).toBe(0); // not done yet
    s = applyRun(applyRun(s, { score: 0, level: 1 }).state, { score: 0, level: 1 }).state;
    const first = claim(s, 'd_runs2');
    expect(first.embers).toBe(15);
    expect(claim(first.state, 'd_runs2').embers).toBe(0); // already claimed
    expect(claim(s, 'nope').embers).toBe(0);
  });

  it('opens the daily bonus only when the three are claimed', () => {
    let s = state(['d_runs2', 'd_gems20', 'd_floor3']);
    s = applyRun(s, { score: 0, level: 4, gems: 30 }).state;
    s = applyRun(s, { score: 0, level: 4, gems: 0 }).state;
    expect(bonusReady(s)).toBe(false);
    expect(claimableCount(s)).toBe(3);
    for (const id of ['d_runs2', 'd_gems20', 'd_floor3']) s = claim(s, id).state;
    expect(bonusReady(s)).toBe(true);
    expect(claimableCount(s)).toBe(1);
    const b = claim(s, 'bonus');
    expect(b.embers).toBe(DAILY_BONUS);
    expect(claim(b.state, 'bonus').embers).toBe(0);
  });
});

describe('parseMissions', () => {
  it('falls back to empty on garbage and drops unknown missions', () => {
    expect(parseMissions(null)).toEqual(EMPTY_MISSIONS);
    expect(parseMissions('x')).toEqual(EMPTY_MISSIONS);
    const s = parseMissions({ day: '2026-10-14', daily: [{ id: 'd_runs2', progress: 1.9, claimed: true }, { id: 'zzz', progress: 5 }, 7] });
    expect(s.daily).toEqual([{ id: 'd_runs2', progress: 1, claimed: true }]);
  });
});

describe('rank', () => {
  it('starts at 1 and climbs with embers earned', () => {
    expect(rankOf(0).level).toBe(1);
    expect(rankOf(99).level).toBe(1);
    expect(rankOf(100).level).toBe(2);
    expect(rankOf(49999).level).toBe(MAX_RANK - 1);
    expect(rankOf(50000).level).toBe(MAX_RANK);
    expect(rankOf(999999).level).toBe(MAX_RANK);
  });

  it('reports progress and the embers still missing', () => {
    const r = rankOf(150);
    expect(r.from).toBe(100);
    expect(r.to).toBe(300);
    expect(r.remaining).toBe(150);
    expect(r.progress).toBeCloseTo(0.25);
    expect(rankOf(999999).progress).toBe(1);
    expect(rankOf(999999).remaining).toBe(0);
  });

  it('has strictly growing thresholds and survives bad input', () => {
    for (let i = 1; i < RANK_THRESHOLDS.length; i++) expect(RANK_THRESHOLDS[i]).toBeGreaterThan(RANK_THRESHOLDS[i - 1]);
    expect(rankOf(NaN).level).toBe(1);
    expect(rankOf(-5).level).toBe(1);
  });

  it('says when a run raised the rank', () => {
    expect(rankUp(50, 150)).toBe(2);
    expect(rankUp(150, 200)).toBeNull();
    expect(rankUp(50, 1200)).toBe(5);
  });
});

describe('weekly missions respect what the player can do', () => {
  it('never offers "play with 3 heroes" to someone with fewer than 3 unlocked', () => {
    for (let d = 1; d <= 28; d++) {
      const week = `2026-0${1 + (d % 9)}-${String(d).padStart(2, '0')}`;
      expect(weeklySelection(week, 1).some(m => m.metric === 'heroes')).toBe(false);
    }
  });
});
