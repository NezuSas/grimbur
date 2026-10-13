export type GameMode = 'endless' | 'daily';

/** UTC calendar day as `YYYY-MM-DD`, so every player in the world shares the same daily. */
export function dailyKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** The previous calendar day for a `YYYY-MM-DD` key. */
export function previousDayKey(key: string): string {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return dailyKey(date);
}

/** Stable positive seed for a daily key (FNV-1a). */
export function dailySeed(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 2147483646) + 1;
}

/**
 * Seed for a level of a run. The same (runSeed, level) always gives the same
 * board, which makes whole runs reproducible from a single number.
 */
export function deriveLevelSeed(runSeed: number, level: number): number {
  let h = (runSeed ^ Math.imul(level, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return (h % 2147483646) + 1;
}
