import { useCallback, useEffect, useState } from 'react';

/**
 * Counts elapsed seconds while `running` is true.
 * Returns the elapsed time and a `reset` that sets it back to zero.
 */
export function useSessionTimer(running: boolean) {
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setTime(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);

  const reset = useCallback(() => setTime(0), []);

  return { time, reset };
}
