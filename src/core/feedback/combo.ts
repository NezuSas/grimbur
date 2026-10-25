/**
 * Presentation of the kill combo and of the gem streak. Pure: no rule here, only how loud each step is.
 */

/** Playback rate of the kill sound: a bigger combo sounds higher. */
export const comboRate = (combo: number): number => 1 + 0.12 * Math.max(0, Math.min(combo, 6) - 1);

export interface ComboLook {
  /** Popup text, or null when a single kill needs no label. */
  label: string | null;
  scale: number;
  color: string;
}

/** `max` is the cap of the combo in this run: reaching it reads "MAX". */
export function comboLook(combo: number, max: number): ComboLook {
  if (combo <= 1) return { label: null, scale: 1, color: '#FF3B30' };
  const atMax = combo >= max;
  return {
    label: atMax ? `x${combo} MAX` : `x${combo} COMBO`,
    scale: Math.min(1.5, 1 + 0.15 * (combo - 1)),
    color: atMax ? '#FFD54F' : '#FF9800',
  };
}

export interface GemStreak {
  count: number;
  /** Timestamp of the last gem, in ms. */
  at: number;
}

export const EMPTY_STREAK: GemStreak = { count: 0, at: 0 };
/** A gem within this long of the previous one continues the streak. */
export const GEM_STREAK_WINDOW_MS = 1600;

/** Registers a gem collected at `now`. */
export function addGem(streak: GemStreak, now: number, windowMs = GEM_STREAK_WINDOW_MS): GemStreak {
  const continues = streak.count > 0 && now - streak.at <= windowMs;
  return { count: continues ? streak.count + 1 : 1, at: now };
}

/** Pitch of the gem sound: climbs a step per gem of the streak, capped. */
export const gemRate = (count: number): number => 1 + 0.08 * Math.max(0, Math.min(count, 8) - 1);

/** Pop scale of the gem counter: bigger with the streak, capped. */
export const gemPopScale = (count: number): number => Math.min(1.45, 1.15 + 0.05 * Math.max(0, count - 1));

/** The streak popup shows from the third gem. */
export const gemStreakLabel = (count: number): string | null => (count >= 3 ? `x${count}` : null);
