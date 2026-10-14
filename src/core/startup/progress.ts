/**
 * Start-up progress: everything the splash screen waits for, folded into one number for the loading bar.
 * Pure, so the weights and the edge cases (nothing to load, more done than expected) are unit-tested.
 */
export interface Counter {
  done: number;
  total: number;
}

export interface StartupParts {
  /** Settings, purchases flag and the icon font: small and quick, counted together. */
  basics: boolean;
  /** The saved progress is in memory (so no screen opens in a "first time" state for a moment). */
  stats: boolean;
  /** Sounds loaded into their native players. */
  audio: Counter;
  /** Image files available on the device. */
  download: Counter;
  /** Images drawn once off-screen so they are decoded and cached before the first real screen. */
  decode: Counter;
}

/** How much of the bar each part is worth; they add up to 1. */
export const STARTUP_WEIGHTS = { basics: 0.08, stats: 0.04, audio: 0.3, download: 0.28, decode: 0.3 } as const;

const fraction = ({ done, total }: Counter): number => (total <= 0 ? 1 : Math.max(0, Math.min(1, done / total)));

/** 0..1: how much of the start-up work is finished. */
export function startupProgress(parts: StartupParts): number {
  const sum =
    (parts.basics ? STARTUP_WEIGHTS.basics : 0) +
    (parts.stats ? STARTUP_WEIGHTS.stats : 0) +
    STARTUP_WEIGHTS.audio * fraction(parts.audio) +
    STARTUP_WEIGHTS.download * fraction(parts.download) +
    STARTUP_WEIGHTS.decode * fraction(parts.decode);
  return Math.max(0, Math.min(1, sum));
}

export const EMPTY_STARTUP: StartupParts = {
  basics: false,
  stats: false,
  audio: { done: 0, total: 0 },
  download: { done: 0, total: 0 },
  decode: { done: 0, total: 0 },
};
