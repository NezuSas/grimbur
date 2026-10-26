/**
 * Player-side moderation of the global ranking (store policies ask for a way to report and block objectionable
 * user content): entries a player hides are remembered on the device, and a report is an email to the developer.
 */

export const MAX_HIDDEN = 200;

/** Parses the stored list of hidden entry ids; anything unreadable is an empty list. Never throws. */
export function parseHidden(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 80).slice(-MAX_HIDDEN);
  } catch {
    return [];
  }
}

export const serializeHidden = (ids: readonly string[]): string => JSON.stringify(ids.slice(-MAX_HIDDEN));

/** The list with `id` added (newest last, no duplicates, capped). */
export function withHidden(ids: readonly string[], id: string): string[] {
  return [...ids.filter(existing => existing !== id), id].slice(-MAX_HIDDEN);
}

export interface ReportEntry {
  id: string;
  name: string;
  score: number;
  level: number;
}

/** A ready-to-open `mailto:` link that reports one ranking entry. */
export function buildReportMailto(email: string, entry: ReportEntry): string {
  const subject = 'Grimbur: report a ranking entry';
  const body = `Entry id: ${entry.id}\nName: ${entry.name}\nScore: ${entry.score}\nFloor: ${entry.level}\n\nWhy I am reporting it:\n`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
