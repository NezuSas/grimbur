/**
 * Pure helpers for the offline copy of the global top 10: the last list that loaded is kept on the device
 * so the ranking can still be shown without a connection.
 */

export interface CachedRow {
  id: string;
  level: number;
  score: number;
  name: string;
  coins: number;
  characterIndex: number;
  time: number;
}

export interface CachedBoard {
  /** Epoch milliseconds when the list was fetched. */
  at: number;
  rows: CachedRow[];
}

const MAX_ROWS = 10;
const MAX_RAW_LENGTH = 20_000;

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Keeps only well-formed rows (and at most ten): the cache is storage we do not control. */
export function sanitizeRows(value: unknown): CachedRow[] {
  if (!Array.isArray(value)) return [];
  const out: CachedRow[] = [];
  for (const r of value) {
    if (!r || typeof r !== 'object') continue;
    const { id, level, score, name, coins, characterIndex, time } = r as Record<string, unknown>;
    if (typeof id !== 'string' || id.length === 0 || id.length > 64) continue;
    if (typeof name !== 'string' || name.length === 0 || name.length > 40) continue;
    if (!finite(level) || !finite(score) || !finite(coins) || !finite(characterIndex)) continue;
    out.push({
      id,
      name,
      level: Math.trunc(level),
      score: Math.trunc(score),
      coins: Math.trunc(coins),
      characterIndex: Math.max(0, Math.trunc(characterIndex)),
      time: finite(time) ? Math.trunc(time) : 0,
    });
    if (out.length === MAX_ROWS) break;
  }
  return out;
}

export function serializeBoard(rows: readonly CachedRow[], at: number): string {
  return JSON.stringify({ at, rows: sanitizeRows(rows) } satisfies CachedBoard);
}

/** The stored board, or null when there is none or it is unusable (corrupt, empty, from the future). */
export function parseBoard(raw: string | null, now: number = Date.now()): CachedBoard | null {
  if (!raw || raw.length > MAX_RAW_LENGTH) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !finite(data.at) || data.at <= 0 || data.at > now + 60_000) return null;
    const rows = sanitizeRows(data.rows);
    return rows.length > 0 ? { at: data.at, rows } : null;
  } catch {
    return null;
  }
}

export type AgeUnit = 'minutes' | 'hours' | 'days';

/** How old a cached list is, in the coarsest whole unit ("just now" is 0 minutes). */
export function describeAge(at: number, now: number = Date.now()): { unit: AgeUnit; n: number } {
  const minutes = Math.max(0, Math.floor((now - at) / 60_000));
  if (minutes < 60) return { unit: 'minutes', n: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return { unit: 'hours', n: hours };
  return { unit: 'days', n: Math.floor(hours / 24) };
}
