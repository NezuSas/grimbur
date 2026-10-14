import { useEffect, useRef } from 'react';
import { createSessionClock, SessionClock } from '../core/feedback/clock';

/**
 * Counts elapsed seconds while `running` is true, without re-rendering the caller on every tick: read the time with
 * `clock.get()` and show it with a component that subscribes (see ScoreBar).
 */
export function useSessionClock(running: boolean): SessionClock {
  const clock = useRef<SessionClock | null>(null);
  if (!clock.current) clock.current = createSessionClock();
  const c = clock.current;

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => c.tick(), 1000);
    return () => clearInterval(interval);
  }, [running, c]);

  return c;
}
