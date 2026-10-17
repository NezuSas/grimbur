/**
 * Notices from the developer that reach the game without a new version: a document `config/live` that the game reads when it opens.
 * It is edited by hand in the Firebase console (the app can only read it). Shape:
 *
 *   id     string   changes with every notice (a dismissed notice stays dismissed)
 *   en     string   the text in English (up to 140 characters)
 *   es     string   the text in Spanish (optional: English is shown when missing)
 *   until  string   optional end, as `2026-10-31` (the notice disappears after that day)
 */
export interface LiveNews {
  id: string;
  en: string;
  es?: string;
  until?: string;
}

export const MAX_NEWS_TEXT = 140;
const ID_PATTERN = /^[A-Za-z0-9_.-]{1,40}$/;
const DAY_PATTERN = /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const clean = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  // Control and direction-changing characters never belong in a notice.
  const text = value.replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '').trim();
  return text.length > 0 ? text.slice(0, MAX_NEWS_TEXT) : null;
};

/** The notice in a document's data, or null when it is missing or not well formed. Nothing here throws. */
export function parseLiveNews(data: unknown): LiveNews | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const id = typeof d.id === 'string' && ID_PATTERN.test(d.id) ? d.id : null;
  const en = clean(d.en);
  if (!id || !en) return null;
  const es = clean(d.es) ?? undefined;
  const until = typeof d.until === 'string' && DAY_PATTERN.test(d.until) ? d.until : undefined;
  return { id, en, es, until };
}

/** The text to show in a language, or null when the notice is over (`today` is a local day key) or already dismissed. */
export function newsToShow(news: LiveNews | null, language: 'en' | 'es', today: string, dismissed: readonly string[]): string | null {
  if (!news || dismissed.includes(news.id)) return null;
  if (news.until && today > news.until) return null;
  return language === 'es' ? news.es ?? news.en : news.en;
}
