import { dpadDirection } from '../../src/core/input/dpad';

describe('dpadDirection', () => {
  const D = 200; // centre at (100, 100)

  it('reads the four quadrants', () => {
    expect(dpadDirection(100, 20, D)).toBe('UP');
    expect(dpadDirection(100, 180, D)).toBe('DOWN');
    expect(dpadDirection(20, 100, D)).toBe('LEFT');
    expect(dpadDirection(180, 100, D)).toBe('RIGHT');
  });

  it('splits along the diagonals, so a drifting thumb still lands on the nearest arrow', () => {
    expect(dpadDirection(150, 70, D)).toBe('RIGHT'); // more across than up
    expect(dpadDirection(130, 40, D)).toBe('UP'); // more up than across
    expect(dpadDirection(50, 140, D)).toBe('LEFT');
  });

  it('ignores the dead centre and everything outside the disc', () => {
    expect(dpadDirection(100, 100, D)).toBeNull();
    expect(dpadDirection(108, 96, D)).toBeNull();
    expect(dpadDirection(2, 2, D)).toBeNull(); // a corner of the square, outside the circle
    expect(dpadDirection(250, 100, D)).toBeNull();
  });

  it('a wider dead zone leaves room for a centre button', () => {
    expect(dpadDirection(100, 70, D, 0.42)).toBeNull();
    expect(dpadDirection(100, 40, D, 0.42)).toBe('UP');
  });
});
