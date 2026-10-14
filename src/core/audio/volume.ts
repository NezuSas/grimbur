/**
 * Music and effects volume: a stepped control (touch friendly, no slider dependency). Levels are percentages;
 * 100 plays every track at the mix levels the sound manager was tuned with.
 */
export const VOLUME_STEPS = [0, 25, 50, 75, 100] as const;
export const DEFAULT_VOLUME = 100;

/** Snaps any stored value (corrupt, from a newer version) to the nearest valid step. */
export function clampVolume(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_VOLUME;
  return VOLUME_STEPS.reduce((best, step) => (Math.abs(step - value) < Math.abs(best - value) ? step : best), DEFAULT_VOLUME as number);
}

/** The multiplier (0..1) a level applies on top of a track's own mix volume. */
export const volumeGain = (level: number): number => clampVolume(level) / 100;

/** A track's playback volume: its mix level scaled by the player's chosen level. */
export const scaledVolume = (base: number, level: number): number => Math.max(0, Math.min(1, base * volumeGain(level)));
