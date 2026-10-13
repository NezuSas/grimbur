import { aimFromDrag, classifyGesture, SWIPE_MIN_DISTANCE, TAP_MAX_DISTANCE } from '../../src/core/input/swipe';

describe('classifyGesture', () => {
  it('reads clear swipes in four directions', () => {
    expect(classifyGesture(60, 4)).toEqual({ kind: 'swipe', direction: 'RIGHT' });
    expect(classifyGesture(-60, -4)).toEqual({ kind: 'swipe', direction: 'LEFT' });
    expect(classifyGesture(3, 60)).toEqual({ kind: 'swipe', direction: 'DOWN' });
    expect(classifyGesture(-3, -60)).toEqual({ kind: 'swipe', direction: 'UP' });
  });

  it('treats a barely moving finger as a tap', () => {
    expect(classifyGesture(0, 0)).toEqual({ kind: 'tap' });
    expect(classifyGesture(TAP_MAX_DISTANCE, -TAP_MAX_DISTANCE)).toEqual({ kind: 'tap' });
  });

  it('ignores short drags and diagonal smears instead of guessing', () => {
    expect(classifyGesture(SWIPE_MIN_DISTANCE - 1, 0)).toEqual({ kind: 'none' });
    expect(classifyGesture(50, 45)).toEqual({ kind: 'none' });
  });

  it('respects a larger minimum distance', () => {
    expect(classifyGesture(40, 0, 60)).toEqual({ kind: 'none' });
    expect(classifyGesture(70, 0, 60)).toEqual({ kind: 'swipe', direction: 'RIGHT' });
  });
});

describe('aimFromDrag', () => {
  it('needs a real drag, then follows the dominant axis even on diagonals', () => {
    expect(aimFromDrag(5, 8)).toBeNull();
    expect(aimFromDrag(40, 10)).toBe('RIGHT');
    expect(aimFromDrag(-40, 10)).toBe('LEFT');
    expect(aimFromDrag(10, -40)).toBe('UP');
    expect(aimFromDrag(30, 31)).toBe('DOWN');
  });
});
