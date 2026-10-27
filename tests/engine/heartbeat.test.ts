jest.mock('react-native', () => ({ Animated: {}, Easing: {} }));
import { beatCycleMs } from '../../src/screens/game/useHeartbeat';

describe('the danger heartbeat', () => {
  it('beats once a little over a second next to one hazard, quicker with more, never below 800 ms', () => {
    expect(beatCycleMs(1)).toBe(1100);
    expect(beatCycleMs(2)).toBe(950);
    expect(beatCycleMs(3)).toBe(800);
    expect(beatCycleMs(8)).toBe(800);
    expect(beatCycleMs(0)).toBe(1100);
  });
});
