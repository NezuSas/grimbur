import { LocalStats, parseStats } from './runStats';
import { clampVolume } from '../audio/volume';

/**
 * Progress backup code: the saved progress (and the settings that matter) as one line of text the player can
 * keep in a note and paste on another phone. Format: `WA1.<base64url(JSON)>.<checksum>`. The checksum only
 * catches typos and truncated pastes; it is not a defence against someone who edits the code on purpose.
 * Nothing here throws: decoding returns a reason instead.
 */
export const BACKUP_VERSION = 1;
const PREFIX = `WA${BACKUP_VERSION}`;
/** Longer codes are rejected before any decoding (a full history is a few KB). */
export const MAX_CODE_LENGTH = 24_000;

/** The settings carried by a backup: preferences and one-time flags, not device specifics. */
export interface BackupSettings {
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  hapticsEnabled: boolean;
  reduceFlash: boolean;
  controlPosition: 'left' | 'right';
  attackButton: 'side' | 'center';
  controlSize: 'small' | 'medium' | 'large';
  swipeMove: boolean;
  dragAim: boolean;
  language: 'auto' | 'en' | 'es';
  tutorialSeen: boolean;
  achievementsSeen: number;
  hintsSeen: string[];
}

export type DecodeFailure = 'format' | 'version' | 'size' | 'checksum' | 'data';
export type DecodeResult =
  | { ok: true; stats: LocalStats; settings: BackupSettings }
  | { ok: false; reason: DecodeFailure };

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function utf8Bytes(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    const c = ch.codePointAt(0) as number;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

export function toBase64Url(text: string): string {
  const bytes = utf8Bytes(text);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += ALPHABET[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += ALPHABET[n & 63];
  }
  return out;
}

/** Decodes to text, or null when the input is not valid base64url / UTF-8. */
export function fromBase64Url(body: string): string | null {
  if (body.length % 4 === 1) return null;
  const bytes: number[] = [];
  for (let i = 0; i < body.length; i += 4) {
    let n = 0;
    let count = 0;
    for (let j = 0; j < 4; j++) {
      const ch = body[i + j];
      if (ch === undefined) {
        n <<= 6;
        continue;
      }
      const v = ALPHABET.indexOf(ch);
      if (v < 0) return null;
      n = (n << 6) | v;
      count++;
    }
    bytes.push((n >> 16) & 255);
    if (count > 2) bytes.push((n >> 8) & 255);
    if (count > 3) bytes.push(n & 255);
  }
  let text = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    const len = b < 0x80 ? 1 : b >= 0xc2 && b < 0xe0 ? 2 : b >= 0xe0 && b < 0xf0 ? 3 : b >= 0xf0 && b < 0xf5 ? 4 : 0;
    if (len === 0 || i + len > bytes.length) return null;
    let cp = len === 1 ? b : b & (0xff >> (len + 1));
    for (let k = 1; k < len; k++) {
      if ((bytes[i + k] & 0xc0) !== 0x80) return null;
      cp = (cp << 6) | (bytes[i + k] & 63);
    }
    if (cp > 0x10ffff) return null;
    text += String.fromCodePoint(cp);
    i += len;
  }
  return text;
}

/** FNV-1a (32 bit) as 8 hex characters. */
export function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

export const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
  soundEnabled: true,
  musicVolume: 100,
  sfxVolume: 100,
  hapticsEnabled: true,
  reduceFlash: false,
  controlPosition: 'right',
  attackButton: 'side',
  controlSize: 'medium',
  swipeMove: false,
  dragAim: true,
  language: 'auto',
  tutorialSeen: false,
  achievementsSeen: 0,
  hintsSeen: [],
};

/** Defensive parse of the settings part: every field falls back to its default when missing or invalid. */
export function sanitizeSettings(value: unknown): BackupSettings {
  const d = DEFAULT_BACKUP_SETTINGS;
  const v = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const bool = (x: unknown, fallback: boolean) => (typeof x === 'boolean' ? x : fallback);
  const seen = typeof v.achievementsSeen === 'number' && Number.isFinite(v.achievementsSeen) ? Math.max(0, Math.trunc(v.achievementsSeen)) : 0;
  const hints = Array.isArray(v.hintsSeen)
    ? [...new Set(v.hintsSeen.filter((h): h is string => typeof h === 'string' && h.length > 0 && h.length <= 40))].slice(0, 50)
    : [];
  return {
    soundEnabled: bool(v.soundEnabled, d.soundEnabled),
    musicVolume: clampVolume(v.musicVolume),
    sfxVolume: clampVolume(v.sfxVolume),
    hapticsEnabled: bool(v.hapticsEnabled, d.hapticsEnabled),
    reduceFlash: bool(v.reduceFlash, d.reduceFlash),
    controlPosition: oneOf(v.controlPosition, ['left', 'right'] as const, d.controlPosition),
    attackButton: oneOf(v.attackButton, ['side', 'center'] as const, d.attackButton),
    controlSize: oneOf(v.controlSize, ['small', 'medium', 'large'] as const, d.controlSize),
    swipeMove: bool(v.swipeMove, d.swipeMove),
    dragAim: bool(v.dragAim, d.dragAim),
    language: oneOf(v.language, ['auto', 'en', 'es'] as const, d.language),
    tutorialSeen: bool(v.tutorialSeen, d.tutorialSeen),
    achievementsSeen: seen,
    hintsSeen: hints,
  };
}

export function encodeBackup(stats: LocalStats, settings: Partial<BackupSettings>): string {
  const body = toBase64Url(JSON.stringify({ v: BACKUP_VERSION, s: stats, c: sanitizeSettings(settings) }));
  return `${PREFIX}.${body}.${checksum(body)}`;
}

export function decodeBackup(input: unknown): DecodeResult {
  if (typeof input !== 'string') return { ok: false, reason: 'format' };
  if (input.length > MAX_CODE_LENGTH * 2) return { ok: false, reason: 'size' };
  const code = input.replace(/\s+/g, ''); // pasted codes often pick up line breaks and spaces
  if (code.length > MAX_CODE_LENGTH) return { ok: false, reason: 'size' };
  const parts = code.split('.');
  if (parts.length !== 3 || !/^WA\d{1,3}$/.test(parts[0])) return { ok: false, reason: 'format' };
  if (parts[0] !== PREFIX) return { ok: false, reason: 'version' };
  const [, body, sum] = parts;
  if (body.length === 0) return { ok: false, reason: 'format' };
  if (checksum(body) !== sum.toLowerCase()) return { ok: false, reason: 'checksum' };
  const json = fromBase64Url(body);
  if (json === null) return { ok: false, reason: 'data' };
  try {
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object' || data.v !== BACKUP_VERSION || !data.s || typeof data.s !== 'object') {
      return { ok: false, reason: 'data' };
    }
    return { ok: true, stats: parseStats(JSON.stringify(data.s)), settings: sanitizeSettings(data.c) };
  } catch {
    return { ok: false, reason: 'data' };
  }
}

/** A few headline numbers to show before the player confirms the restore. */
export function summarize(stats: LocalStats): { runs: number; bestScore: number; embers: number; achievements: number } {
  return { runs: stats.gamesPlayed, bestScore: stats.bestScore, embers: stats.embers, achievements: Object.keys(stats.achievements).length };
}
