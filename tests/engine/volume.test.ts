import { DEFAULT_VOLUME, VOLUME_STEPS, clampVolume, scaledVolume, volumeGain } from '../../src/core/audio/volume';

describe('volume steps', () => {
  it('keeps valid steps and snaps the rest to the nearest one', () => {
    for (const step of VOLUME_STEPS) expect(clampVolume(step)).toBe(step);
    expect(clampVolume(10)).toBe(0);
    expect(clampVolume(40)).toBe(50);
    expect(clampVolume(60)).toBe(50);
    expect(clampVolume(-30)).toBe(0);
    expect(clampVolume(900)).toBe(100);
  });

  it('falls back to the default for anything that is not a finite number', () => {
    for (const bad of [undefined, null, NaN, Infinity, '50', {}]) expect(clampVolume(bad)).toBe(DEFAULT_VOLUME);
  });

  it('scales a track by the chosen level without exceeding 1', () => {
    expect(volumeGain(50)).toBe(0.5);
    expect(scaledVolume(0.45, 100)).toBeCloseTo(0.45);
    expect(scaledVolume(0.4, 50)).toBeCloseTo(0.2);
    expect(scaledVolume(0.4, 0)).toBe(0);
    expect(scaledVolume(3, 100)).toBe(1);
  });
});
