/**
 * The update notice. The game reads `config/app` when it opens (edited by hand in the Firebase console; the app can only read it):
 *
 *   latest  string  the newest version out (`1.2.0`): older versions are offered the update, once per version
 *   min     string  optional: the oldest version still supported; older ones are told to update and cannot dismiss it
 *   url     string  optional `https://` link the Update button opens (the store page, or a download page)
 */
export interface AppConfig {
  latest?: string;
  min?: string;
  url?: string;
}

const VERSION_PATTERN = /^\d{1,3}(\.\d{1,3}){0,2}$/;

/** -1, 0 or 1 as `a` is older than, the same as or newer than `b` (`1.10.0` is newer than `1.9.0`). Missing parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

const version = (value: unknown): string | undefined => (typeof value === 'string' && VERSION_PATTERN.test(value) ? value : undefined);

/** The configuration in a document's data, or null when there is nothing usable. Nothing here throws. */
export function parseAppConfig(data: unknown): AppConfig | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const latest = version(d.latest);
  const min = version(d.min);
  const url = typeof d.url === 'string' && /^https:\/\/[^\s]{4,300}$/.test(d.url) ? d.url : undefined;
  return latest || min ? { latest, min, url } : null;
}

export type UpdateNotice = { kind: 'none' } | { kind: 'available' | 'required'; version: string; url?: string };

/** What to tell a player running `current`: nothing, an update on offer (unless that version was dismissed), or an update they must make. */
export function updateNotice(current: string, config: AppConfig | null, dismissed: readonly string[]): UpdateNotice {
  if (!config || !VERSION_PATTERN.test(current)) return { kind: 'none' };
  if (config.min && compareVersions(current, config.min) < 0) return { kind: 'required', version: config.latest ?? config.min, url: config.url };
  if (config.latest && compareVersions(current, config.latest) < 0 && !dismissed.includes(config.latest)) {
    return { kind: 'available', version: config.latest, url: config.url };
  }
  return { kind: 'none' };
}
