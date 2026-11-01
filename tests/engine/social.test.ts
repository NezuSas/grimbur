import { MAX_FRIENDS, addFriend, beatSinceSeen, cleanFriendCode, markSeen, parseFriends, removeFriend } from '../../src/core/social/friends';
import { EMPTY_SEASON, claimSeason, completedMonth, seasonRelicFor, SEASON_TIERS } from '../../src/core/stats/season';
import { EMPTY_STATS, parseStats } from '../../src/core/stats/runStats';
import { ownsCosmetic } from '../../src/core/cosmetics/cosmetics';
import { NORMAL_RELICS } from '../../src/core/engine/relics';
import { gameReducer } from '../../src/core/engine/reducer';
import { coin, createState } from '../helpers/state';

const A = 'FRIENDAAAA1234';
const B = 'FRIENDBBBB5678';

describe('friends', () => {
  it('adds a valid code once, never your own, and cleans what was pasted', () => {
    expect(cleanFriendCode(`  grimbur://friend/${A} `)).toBe(A);
    const first = addFriend([], ` ${A} `, B);
    expect(first.ok && first.friends).toEqual([{ pid: A, seen: 0 }]);
    expect(addFriend(first.ok ? first.friends : [], A, B)).toEqual({ ok: false, reason: 'duplicate' });
    expect(addFriend([], B, B)).toEqual({ ok: false, reason: 'self' });
    expect(addFriend([], 'no!', B)).toEqual({ ok: false, reason: 'invalid' });
    const full = Array.from({ length: MAX_FRIENDS }, (_, i) => ({ pid: `FRIEND${String(i).padStart(8, '0')}`, seen: 0 }));
    expect(addFriend(full, A, B)).toEqual({ ok: false, reason: 'full' });
  });

  it('tells a new record once, never on the first look', () => {
    const list = [{ pid: A, seen: 0 }];
    expect(beatSinceSeen(list[0], 900)).toBe(false);
    const seen = markSeen(list, { [A]: 900 });
    expect(beatSinceSeen(seen[0], 1200)).toBe(true);
    expect(beatSinceSeen(markSeen(seen, { [A]: 1200 })[0], 1200)).toBe(false);
  });

  it('removes a friend and survives a save', () => {
    expect(removeFriend([{ pid: A, seen: 1 }, { pid: B, seen: 2 }], A)).toEqual([{ pid: B, seen: 2 }]);
    const saved = parseStats(JSON.stringify({ ...EMPTY_STATS, friends: [{ pid: A, seen: 5 }, { pid: A, seen: 9 }, { pid: '??', seen: 1 }] }));
    expect(saved.friends).toEqual([{ pid: A, seen: 5 }]);
    expect(parseFriends('nope')).toEqual([]);
  });
});

describe('season extras', () => {
  it('a completed track earns that month its own title', () => {
    const full = { ...EMPTY_SEASON, key: '2026-11', points: SEASON_TIERS[SEASON_TIERS.length - 1] };
    const done = claimSeason(full).state;
    expect(done.months).toEqual(['2026-11']);
    expect(completedMonth(done, 11)).toBe(true);
    expect(completedMonth(done, 10)).toBe(false);
    const stats = { ...EMPTY_STATS, season: done };
    expect(ownsCosmetic(stats, 'title_seasonnov')).toBe(true);
    expect(ownsCosmetic(stats, 'title_seasonoct')).toBe(false);
  });

  it('features one normal relic per month, the same for everyone', () => {
    expect(NORMAL_RELICS).toContain(seasonRelicFor('2026-11'));
    expect(seasonRelicFor('2026-11')).toBe(seasonRelicFor('2026-11'));
    const months = new Set(Array.from({ length: 12 }, (_, i) => seasonRelicFor(`2026-${String(i + 1).padStart(2, '0')}`)));
    expect(months.size).toBeGreaterThan(4);
  });

  it('offers the featured relic in the first draft of a run', () => {
    const featured = 'owl' as const;
    const s = { ...createState(), seasonRelic: featured, isLevelUp: true };
    const next = gameReducer(s, { type: 'LEVEL_UP', payload: { rows: 6, cols: 9, entities: [coin(30)], coins: 1, attack: 3, seed: 5 } });
    expect(next.pendingDraft).toContain(featured);
  });
});
