import { CHEST_EMBERS, EMPTY_CHEST, chestStatus, openChest, parseChest } from '../../src/core/stats/dailyChest';

describe('the daily chest', () => {
  it('starts the calendar on the first opening', () => {
    expect(chestStatus(EMPTY_CHEST, '2026-11-01')).toEqual({ ready: true, day: 1 });
    const o = openChest(EMPTY_CHEST, '2026-11-01', 0, 2);
    expect(o).toEqual({ state: { last: '2026-11-01', day: 1 }, embers: CHEST_EMBERS[0], freeze: false, day: 1 });
  });

  it('opens once a day, never again on the same day or an earlier one', () => {
    const s = { last: '2026-11-01', day: 1 };
    expect(chestStatus(s, '2026-11-01').ready).toBe(false);
    expect(openChest(s, '2026-11-01', 0, 2)).toBeNull();
    expect(openChest(s, '2026-10-30', 0, 2)).toBeNull();
  });

  it('climbs on consecutive days and starts over after a missed one', () => {
    expect(chestStatus({ last: '2026-11-01', day: 3 }, '2026-11-02')).toEqual({ ready: true, day: 4 });
    expect(chestStatus({ last: '2026-11-01', day: 3 }, '2026-11-03')).toEqual({ ready: true, day: 1 });
    // After the seventh day a new week begins.
    expect(chestStatus({ last: '2026-11-01', day: 7 }, '2026-11-02')).toEqual({ ready: true, day: 1 });
  });

  it('gives a streak freeze on the seventh day when the pocket has room', () => {
    expect(openChest({ last: '2026-11-01', day: 6 }, '2026-11-02', 0, 2)).toMatchObject({ day: 7, embers: CHEST_EMBERS[6], freeze: true });
    expect(openChest({ last: '2026-11-01', day: 6 }, '2026-11-02', 2, 2)).toMatchObject({ day: 7, freeze: false });
  });

  it('reads a saved chest defensively', () => {
    expect(parseChest(undefined)).toEqual(EMPTY_CHEST);
    expect(parseChest({ last: 'nope', day: 3 })).toEqual(EMPTY_CHEST);
    expect(parseChest({ last: '2026-11-01', day: 99 })).toEqual({ last: '2026-11-01', day: 1 });
    expect(parseChest({ last: '2026-11-01', day: 5 })).toEqual({ last: '2026-11-01', day: 5 });
  });
});
