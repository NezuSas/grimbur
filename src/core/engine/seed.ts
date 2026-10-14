/** `expedition` and `daily` are 10-floor runs ending with the Wumpus; `endless` (later) has no boss. */
export type GameMode = 'expedition' | 'daily' | 'endless';

/**
 * The player's LOCAL calendar day as `YYYY-MM-DD`: the daily and the streak roll over at local midnight.
 * The seed is derived from the key, so everyone who plays "2026-10-12" gets the same cave.
 */
export function dailyKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  if (!Number.isFinite(y)) return '1970-01-01';
  return `${String(y).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const DAY_MS = 86_400_000;
const KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Whole days since 1970-01-01 for a `YYYY-MM-DD` key (NaN for anything else). Calendar maths only, no time zones. */
export function dayNumber(key: string): number {
  if (!KEY_PATTERN.test(key)) return NaN;
  return Math.round(Date.parse(`${key}T00:00:00Z`) / DAY_MS);
}

/** The key `delta` calendar days after `key` (negative goes back). Pure calendar arithmetic. */
export function shiftDayKey(key: string, delta: number): string {
  const n = dayNumber(key);
  if (!Number.isFinite(n)) return key;
  return new Date((n + Math.trunc(delta)) * DAY_MS).toISOString().slice(0, 10);
}

/** The previous calendar day for a `YYYY-MM-DD` key. */
export function previousDayKey(key: string): string {
  return shiftDayKey(key, -1);
}

/** Days from `from` to `to` (negative when `to` is earlier, i.e. the clock went back; 0 for malformed keys). */
export function daysBetween(from: string, to: string): number {
  const d = dayNumber(to) - dayNumber(from);
  return Number.isFinite(d) ? d : 0;
}

/** Milliseconds until the next local midnight (at least 1 so a countdown never shows zero or a negative). */
export function msUntilNextDay(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const ms = next.getTime() - now.getTime();
  return Number.isFinite(ms) ? Math.max(1, ms) : DAY_MS;
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
