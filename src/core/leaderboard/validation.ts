/**
 * Leaderboard input rules. The same limits are enforced server-side in
 * `firestore.rules`; keep both in sync when changing them.
 */

export const LEADERBOARD_LIMITS = {
  maxNameLength: 20,
  /** A full expedition is 10 floors; a little headroom for future floors. */
  maxLevel: 12,
  /** Generous upper bound for points earned per level (coins, kills, bonuses). */
  maxScorePerLevel: 20000,
  /** Difficulty caps coins at 8 per level. */
  maxCoinsPerLevel: 8,
  maxTimeSeconds: 24 * 60 * 60,
  characterCount: 4,
} as const;

export interface ScoreSubmission {
  level: number;
  score: number;
  name: string;
  coins: number;
  characterIndex: number;
  time: number;
}

// Baseline blocklist (English/Spanish). Not exhaustive: it only stops the obvious.
const BLOCKED_WORDS = [
  'fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot', 'whore', 'slut', 'dick', 'asshole',
  'puta', 'puto', 'mierda', 'pendejo', 'pendeja', 'cabron', 'cabrón', 'coño', 'verga', 'chingar',
  'marica', 'maricon', 'maricón', 'hijueputa', 'malparido', 'gonorrea',
];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };

const stripAccents = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const BLOCKED_TOKENS = new Set(BLOCKED_WORDS.map(w => stripAccents(w)));
/** Long words are also caught inside a bigger token (e.g. "xxhijueputaxx"). */
const BLOCKED_LONG = [...BLOCKED_TOKENS].filter(w => w.length >= 6);

/**
 * True when a word of the name is on the blocklist, tolerating leetspeak and
 * accents. Whole-word matching avoids false positives such as "Computadora".
 */
export function containsBlockedWord(name: string): boolean {
  const tokens = stripAccents(name.toLowerCase())
    .replace(/[013457@$]/g, ch => LEET[ch])
    .split(/[^a-z]+/)
    .filter(Boolean);
  return tokens.some(t => BLOCKED_TOKENS.has(t) || BLOCKED_LONG.some(w => t.includes(w)));
}

/** Trims, collapses whitespace, strips control characters and links, caps the length. */
export function sanitizeName(raw: string): string {
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, '')
    // Invisible and direction-changing characters would hide a blocked word or flip the name.
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]/g, '')
    .replace(/https?:\/\/\S+|www\.\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LEADERBOARD_LIMITS.maxNameLength);
}

export type NameCheck = { ok: true; name: string } | { ok: false; reason: 'empty' | 'blocked' };

export function checkName(raw: string): NameCheck {
  const name = sanitizeName(raw);
  if (!name) return { ok: false, reason: 'empty' };
  if (containsBlockedWord(name)) return { ok: false, reason: 'blocked' };
  return { ok: true, name };
}

/** Returns a list of problems; empty means the submission is plausible. */
export function validateSubmission(row: ScoreSubmission): string[] {
  const L = LEADERBOARD_LIMITS;
  const problems: string[] = [];
  const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);

  if (!isInt(row.level) || row.level < 1 || row.level > L.maxLevel) problems.push('level');
  if (!isInt(row.score) || row.score < 0 || (isInt(row.level) && row.score > row.level * L.maxScorePerLevel)) problems.push('score');
  if (!isInt(row.coins) || row.coins < 0 || (isInt(row.level) && row.coins > row.level * L.maxCoinsPerLevel)) problems.push('coins');
  if (!isInt(row.characterIndex) || row.characterIndex < 0 || row.characterIndex >= L.characterCount) problems.push('characterIndex');
  if (!isInt(row.time) || row.time < 1 || row.time > L.maxTimeSeconds) problems.push('time');
  if (typeof row.name !== 'string' || row.name.length < 1 || row.name.length > L.maxNameLength) problems.push('name');

  return problems;
}
