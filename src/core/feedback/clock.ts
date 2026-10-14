/**
 * The run clock lives outside React state: ticking it every second must not re-render the whole game screen
 * (and the board with it). Only the component that shows it subscribes.
 */
export interface SessionClock {
  get(): number;
  tick(): void;
  reset(): void;
  subscribe(listener: (seconds: number) => void): () => void;
}

export function createSessionClock(): SessionClock {
  let seconds = 0;
  const listeners = new Set<(seconds: number) => void>();
  const emit = () => listeners.forEach(l => l(seconds));
  return {
    get: () => seconds,
    tick() {
      seconds += 1;
      emit();
    },
    reset() {
      seconds = 0;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
