import { analytics, setAnalyticsProvider } from '../../src/services/analytics';

describe('analytics facade', () => {
  it('forwards typed events and errors to the active provider', () => {
    const track = jest.fn();
    const recordError = jest.fn();
    setAnalyticsProvider({ track, recordError });

    analytics.track('game_over', { level: 3, score: 900, time: 75, cause: 'enemy' });
    analytics.recordError(new Error('boom'), 'test');

    expect(track).toHaveBeenCalledWith('game_over', { level: 3, score: 900, time: 75, cause: 'enemy' });
    expect(recordError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }), 'test');
  });

  it('wraps non-Error values', () => {
    const recordError = jest.fn();
    setAnalyticsProvider({ track: jest.fn(), recordError });

    analytics.recordError('plain string');

    expect(recordError).toHaveBeenCalledWith(expect.any(Error), undefined);
  });

  it('never lets a failing provider break the game', () => {
    setAnalyticsProvider({
      track: () => { throw new Error('vendor down'); },
      recordError: () => { throw new Error('vendor down'); },
    });

    expect(() => analytics.track('trap_triggered', { level: 1 })).not.toThrow();
    expect(() => analytics.recordError(new Error('x'))).not.toThrow();
  });
});
