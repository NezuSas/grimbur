import { EMPTY_STARTUP, STARTUP_WEIGHTS, startupProgress } from '../../src/core/startup/progress';
import { getPreloadImages } from '../../src/ui/preloadImages';
import { SKIN_IDS, skinArt } from '../../src/data/skinArt';
import characters from '../../src/data/characters';
import { RELIC_IMAGES } from '../../src/ui/relicImages';

describe('start-up progress', () => {
  it('weights add up to one', () => {
    const sum = Object.values(STARTUP_WEIGHTS).reduce((n, w) => n + w, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it('starts near zero (a counter with nothing to load counts as done) and ends at one', () => {
    const start = startupProgress(EMPTY_STARTUP);
    expect(start).toBeCloseTo(STARTUP_WEIGHTS.audio + STARTUP_WEIGHTS.download + STARTUP_WEIGHTS.decode, 6);
    const done = startupProgress({ basics: true, stats: true, audio: { done: 12, total: 12 }, download: { done: 90, total: 90 }, decode: { done: 90, total: 90 } });
    expect(done).toBe(1);
  });

  it('grows with every part and never leaves 0..1', () => {
    const base = { basics: false, stats: false, audio: { done: 0, total: 12 }, download: { done: 0, total: 90 }, decode: { done: 0, total: 90 } };
    expect(startupProgress(base)).toBe(0);
    const half = startupProgress({ ...base, audio: { done: 6, total: 12 } });
    expect(half).toBeCloseTo(STARTUP_WEIGHTS.audio / 2, 6);
    expect(startupProgress({ ...base, download: { done: 500, total: 90 } })).toBeCloseTo(STARTUP_WEIGHTS.download, 6);
    expect(startupProgress({ ...base, decode: { done: -5, total: 90 } })).toBe(0);
  });
});

describe('what the splash preloads', () => {
  const list = getPreloadImages();

  it('contains every outfit of every hero (they are drawn in the collection and on the board)', () => {
    for (let hero = 0; hero < characters.length; hero++) {
      for (const skin of SKIN_IDS) {
        const art = skinArt(hero, skin);
        for (const source of [art.playerImage, art.attackImage, art.scoreImage]) expect(list).toContain(source);
      }
    }
  });

  it('contains every relic picture and no image twice', () => {
    for (const source of Object.values(RELIC_IMAGES)) if (source != null) expect(list).toContain(source);
    expect(new Set(list).size).toBe(list.length);
  });
});
