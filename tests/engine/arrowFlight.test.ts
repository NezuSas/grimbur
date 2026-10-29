jest.mock('react-native', () => ({ Animated: {}, View: 'View' }));
jest.mock('../../src/ui/components/SpriteImage', () => 'SpriteImage');
import { flightMs, landMs } from '../../src/ui/components/game/ArrowFlight';

const shot = (tiles: number) => ({ key: 1, dir: 'RIGHT' as const, tiles, hit: true });

describe('the arrow flight', () => {
  it('flies longer the farther it goes', () => {
    expect(flightMs(shot(1))).toBe(165);
    expect(flightMs(shot(6))).toBe(440);
  });

  it('is seen to land a little past half its flight (the impact waits for that, not for the end)', () => {
    for (const tiles of [1, 3, 6, 9]) {
      const ratio = landMs(shot(tiles)) / flightMs(shot(tiles));
      expect(ratio).toBeGreaterThan(0.54);
      expect(ratio).toBeLessThan(0.57);
    }
  });
});
