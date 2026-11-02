import { EMPTY_STATS, mergeRun, parseStats } from '../../src/core/stats/runStats';
import { addEventRun, addRunRelics, EMPTY_RELIC_BOOK, parseRelicBook, parseRunBoard, snapshotBoard } from '../../src/core/stats/runLog';
import { EVENT_IDS, eventForWeek, floorEffects } from '../../src/core/engine/events';
import { omenEffects } from '../../src/core/engine/omens';
import { generateBoard } from '../../src/core/engine/generator';
import { validateDaily } from '../../src/core/leaderboard/daily';
import { gameReducer } from '../../src/core/engine/reducer';
import { coin, createState } from '../helpers/state';

const board = { rows: 5, cols: 15, player: 7, visited: [0, 1, 2, 7], things: [[3, 'enemy'], [9, 'coin']] as [number, string][] };

describe('the run history', () => {
  it('keeps the details of a finished run', () => {
    const { stats } = mergeRun(EMPTY_STATS, { score: 900, level: 4, heroIndex: 2, gems: 7, time: 120, relicIds: ['quiver', 'lantern'], cause: 'pit', board, day: '2026-11-01' });
    const rec = stats.history[stats.history.length - 1];
    expect(rec).toMatchObject({ score: 900, level: 4, hero: 2, gems: 7, time: 120, relics: ['quiver', 'lantern'], cause: 'pit' });
    expect(rec.board).toEqual(board);
  });

  it('drops the cause of a victory', () => {
    const { stats } = mergeRun(EMPTY_STATS, { score: 9000, level: 10, victory: true, cause: 'pit', day: '2026-11-01' });
    expect(stats.history[0].cause).toBeUndefined();
  });

  it('survives a save and a reload, and old records without details', () => {
    const { stats } = mergeRun(EMPTY_STATS, { score: 900, level: 4, heroIndex: 1, relicIds: ['quiver'], board, day: '2026-11-01' });
    const raw = JSON.parse(JSON.stringify({ ...stats, history: [{ day: '2026-10-30', score: 5, level: 1, victory: false, mode: 'expedition' }, ...stats.history] }));
    const back = parseStats(JSON.stringify(raw));
    expect(back.history).toHaveLength(2);
    expect(back.history[0].board).toBeUndefined();
    expect(back.history[1].board).toEqual(board);
    expect(back.history[1].hero).toBe(1);
  });

  it('rejects a broken board', () => {
    expect(parseRunBoard({ rows: 5, cols: 15, player: 999, visited: [] })).toBeUndefined();
    expect(parseRunBoard({ rows: 100, cols: 100, player: 0 })).toBeUndefined();
    expect(parseRunBoard({ ...board, visited: [0, -1, 'x', 74, 75] })?.visited).toEqual([0, 74]);
  });

  it('snapshots the floor a state stands on (the lieutenant as a brute)', () => {
    const s = createState({ entities: [coin(9), { index: 3, type: 'boss', mini: true } as never] });
    const snap = snapshotBoard(s);
    expect(snap.things).toContainEqual([3, 'brute']);
    expect(snap.player).toBe(s.playerIndex);
  });
});

describe('the relic book', () => {
  it('counts each relic once per run, and the wins', () => {
    let book = addRunRelics(EMPTY_RELIC_BOOK, ['quiver', 'quiver', 'lantern', 'nonsense'], false);
    book = addRunRelics(book, ['quiver'], true);
    expect(book.picks).toEqual({ quiver: 2, lantern: 1 });
    expect(book.wins).toEqual({ quiver: 1 });
  });

  it('is filled by finished runs and parsed back', () => {
    const { stats } = mergeRun(EMPTY_STATS, { score: 1, level: 10, victory: true, relicIds: ['phoenix'], day: '2026-11-01' });
    expect(stats.relicBook.wins.phoenix).toBe(1);
    expect(parseRelicBook({ picks: { phoenix: 'x', lantern: 2 }, wins: { phoenix: 3, nope: 1 } })).toEqual({ picks: { lantern: 2, phoenix: 3 }, wins: { phoenix: 3 } });
  });
});

describe('per-hero records', () => {
  it('counts runs, the deepest floor and the best score of each hero (not the endless descent)', () => {
    let stats = mergeRun(EMPTY_STATS, { score: 500, level: 3, heroIndex: 1, day: '2026-11-01' }).stats;
    stats = mergeRun(stats, { score: 200, level: 6, heroIndex: 1, day: '2026-11-01' }).stats;
    stats = mergeRun(stats, { score: 99999, level: 40, heroIndex: 1, mode: 'endless', day: '2026-11-01' }).stats;
    expect(stats.heroRuns[1]).toBe(3);
    expect(stats.heroBestFloor[1]).toBe(6);
    expect(stats.heroBestScore[1]).toBe(500);
    expect(stats.heroRuns[0]).toBe(0);
  });
});

describe('the week event', () => {
  it('takes turns week after week and knows no event for garbage', () => {
    const seen = new Set(Array.from({ length: EVENT_IDS.length }, (_, i) => eventForWeek(`2026-W${String(10 + i).padStart(2, '0')}`)));
    expect(seen.size).toBe(EVENT_IDS.length);
    expect(eventForWeek('nope')).toBeNull();
    expect(eventForWeek(null)).toBeNull();
  });

  it('stacks on the omen', () => {
    const fx = floorEffects('bounty', 'vortex');
    expect(fx.gemMultiplier).toBe(omenEffects('bounty').gemMultiplier * 2);
    expect(fx.pitDelta).toBe(omenEffects('bounty').pitDelta + 1);
    expect(floorEffects(null, 'dark').dark).toBe(true);
    expect(floorEffects('calm', null)).toEqual(omenEffects('calm'));
  });

  it('puts one more vortex on the floor', () => {
    const count = (event: 'vortex' | null) => generateBoard(4, 1234, { event }).entities.filter(e => e.type === 'pit').length;
    expect(count('vortex')).toBeGreaterThanOrEqual(count(null));
  });

  it('pays double gems in the vortex week', () => {
    const plain = createState({ entities: [coin(1), coin(50)] });
    const week = { ...plain, event: 'vortex' as const };
    const a = gameReducer(plain, { type: 'MOVE', direction: 'RIGHT' });
    const b = gameReducer(week, { type: 'MOVE', direction: 'RIGHT' });
    expect(b.score - week.score).toBeGreaterThan(a.score - plain.score);
  });

  it('keeps the best of the week, and starts over on a new week', () => {
    let best = addEventRun(null, '2026-W44', 'vortex', 100, 3);
    best = addEventRun(best, '2026-W44', 'vortex', 50, 2);
    expect(best.score).toBe(100);
    best = addEventRun(best, '2026-W45', 'hunt', 10, 1);
    expect(best).toEqual({ week: '2026-W45', event: 'hunt', score: 10, level: 1 });
    const { stats } = mergeRun(EMPTY_STATS, { score: 70, level: 2, event: 'dark', eventWeek: '2026-W44', day: '2026-11-01' });
    expect(stats.eventBest).toEqual({ week: '2026-W44', event: 'dark', score: 70, level: 2 });
  });
});

describe('the daily ghost tile', () => {
  const row = { day: '2026-11-01', pid: 'ABCDEFGHIJKLMNOP', name: 'Ana', level: 3, score: 100, coins: 2, characterIndex: 0, time: 60 };
  it('is optional and must be a tile', () => {
    expect(validateDaily(row)).toEqual([]);
    expect(validateDaily({ ...row, fell: 12 })).toEqual([]);
    expect(validateDaily({ ...row, fell: 400 })).toContain('fell');
    expect(validateDaily({ ...row, fell: 1.5 })).toContain('fell');
  });
});
