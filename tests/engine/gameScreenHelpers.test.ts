import { buildShareMessage } from '../../src/screens/game/shareMessage';
import { dailyRunResult, runResultOf } from '../../src/screens/game/runResult';

const t = (key: string, params: Record<string, unknown> = {}) => `${key}${Object.keys(params).length ? ':' + JSON.stringify(params) : ''}`;
const plural = (base: string, n: number) => `${base}#${n}`;

describe('buildShareMessage', () => {
  const run = { level: 7, score: 12345, totalCoins: 9, isVictory: false, time: 754 };
  const heroName = 'Vael';

  it('describes an expedition: depth only when it is not the normal one, result and score', () => {
    const plain = buildShareMessage(run, { isDaily: false, dailyDate: '2026-10-16', ascension: 0, heroName }, { t: t as never, plural: plural as never });
    expect(plain).toContain('share.title');
    expect(plain).toContain('"hero":"Vael"');
    expect(plain).toContain('"depth":""');
    expect(plain).toContain('share.reached');
    expect(plain).toContain('🟩🟩🟩🟩🟩🟩🟥⬛⬛⬛'); // floors cleared as squares
    expect(plain).toContain('share.invite');
    const deep = buildShareMessage({ ...run, isVictory: true }, { isDaily: false, dailyDate: '2026-10-16', ascension: 3, heroName }, { t: t as never, plural: plural as never });
    expect(deep).toContain('share.won');
    expect(deep).toContain('ascension.label.3');
    expect(deep).toContain('👑');
  });

  it('the endless descent has no squares, only the floor reached', () => {
    const endless = buildShareMessage({ ...run, level: 14 }, { isDaily: false, dailyDate: '2026-10-16', ascension: 0, heroName, endless: true }, { t: t as never, plural: plural as never });
    expect(endless).toContain('share.endless');
    expect(endless).not.toMatch(/🟩|🟥|⬛/);
  });

  it('uses the daily format with its title and the streak', () => {
    const text = buildShareMessage(run, { isDaily: true, dailyDate: '2026-10-16', ascension: 0, streak: 4, heroName }, { t: t as never, plural: plural as never });
    expect(text).toContain('share.daily.title');
    expect(text).toContain('over.streak#4');
  });

  it('draws the daily route instead of one square per floor when there is one', () => {
    const route = [['tile', 'gem'], ['tile', 'arrow']] as const;
    const text = buildShareMessage(run, { isDaily: true, dailyDate: '2026-10-16', ascension: 0, heroName, route: route.map(f => [...f]) }, { t: t as never, plural: plural as never });
    expect(text).toContain('🟫💎\n🟫🏹💀');
    expect(text).not.toMatch(/🟩|🟥|⬛/);
    const resumed = buildShareMessage(run, { isDaily: true, dailyDate: '2026-10-16', ascension: 0, heroName, route: [[], []] }, { t: t as never, plural: plural as never });
    expect(resumed).toContain('🟩🟩🟩🟩🟩🟩🟥⬛⬛⬛'); // nothing recorded: the floors as before
  });
});

describe('run results', () => {
  const stats = { gamesPlayed: 2, bestScore: 900, bestEndlessFloor: 13 };
  const base = { stats, unlocked: [1], achievements: ['a'], embers: 12, bonus: 3, payout: { total: 12 }, unlocks: { heroes: [1] }, newSkins: ['s'], goals: [], affordableNow: ['x'], missionsDone: ['m'], rankUp: 2 };

  it('an expedition reports the best score; the endless descent reports its deepest floor', () => {
    const exp = runResultOf({ ...base, isNewBestScore: true } as never, 'expedition');
    expect(exp.bestScore).toBe(900);
    expect(exp.isNewBest).toBe(true);
    expect(exp.canBuyNow).toBe(true);
    expect(exp.early).toBe(true);
    expect(runResultOf({ ...base, isNewBestScore: false } as never, 'endless').bestScore).toBe(13);
  });

  it('the unlocks carry the new outfits', () => {
    expect(runResultOf({ ...base, isNewBestScore: false } as never, 'expedition').unlocks).toEqual({ heroes: [1], skins: ['s'] });
  });

  it('a daily run reports the day record and the streak facts', () => {
    const r = dailyRunResult({ ...base, dailyBest: 777, isNewDailyBest: true, streak: 5, bestStreak: 9, streakLost: 0, freezeUsed: false, freezeEarned: true } as never);
    expect(r.bestScore).toBe(777);
    expect(r.streak).toBe(5);
    expect(r.freezeEarned).toBe(true);
    expect(r.rankUp).toBe(2);
  });
});
