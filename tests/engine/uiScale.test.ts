import { uiScaleFor } from '../../src/ui/layout/uiScale';

describe('uiScaleFor', () => {
  it('leaves phones alone, up to a large landscape phone', () => {
    expect(uiScaleFor(640, 300)).toBe(1);
    expect(uiScaleFor(740, 360)).toBe(1);
    expect(uiScaleFor(844, 390)).toBe(1);
    expect(uiScaleFor(932, 430)).toBe(1);
    expect(uiScaleFor(960, 540)).toBe(1);
  });

  it('grows with a tablet-sized window and stops at 1.8', () => {
    expect(uiScaleFor(1280, 800)).toBeCloseTo(1.42, 1);
    expect(uiScaleFor(1024, 600)).toBeGreaterThan(1.1);
    expect(uiScaleFor(3840, 2160)).toBe(1.8);
  });

  it('is limited by the shorter side, so a wide but short window does not overflow', () => {
    expect(uiScaleFor(1600, 500)).toBe(1);
    expect(uiScaleFor(1600, 700)).toBeCloseTo(1.346, 2);
  });
});
