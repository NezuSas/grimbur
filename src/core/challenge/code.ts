import { KEY_ALPHABET } from '../cloud/cloudKey';

/**
 * A friend challenge is a cave anyone can play: its code holds the seed of the run and the difficulty, so whoever types it gets the
 * same floors, and the scores of everyone who played it are listed under the code. The code is 8 characters of the recovery-key
 * alphabet: 29 bits of seed, 3 bits of difficulty (0 to 5) and 8 bits of check, which catches a mistyped code.
 */
export const CODE_LENGTH = 8;
export const CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{8}$/;
const SEED_BITS = 29;
const SEED_RANGE = 2 ** SEED_BITS;
const DEPTH_RANGE = 8;
const BODY_RANGE = SEED_RANGE * DEPTH_RANGE; // 2^32
const CHECK_RANGE = 256;

export interface Challenge {
  /** The run seed: every floor of the cave comes from it. */
  seed: number;
  /** The difficulty (0 normal, up to 5). */
  depth: number;
}

/** 8 bits of a 32-bit mix of the body: any change to the body changes them in about 255 of 256 cases. */
const checkOf = (body: number): number => {
  let h = body >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h % CHECK_RANGE;
};

/** The code of a challenge. The seed must be an integer in `[0, 2^29)` and the depth in `[0, 5]`. */
export function makeChallengeCode(seed: number, depth: number): string {
  if (!Number.isInteger(seed) || seed < 0 || seed >= SEED_RANGE) throw new Error('seed out of range');
  if (!Number.isInteger(depth) || depth < 0 || depth > 5) throw new Error('depth out of range');
  const body = seed + depth * SEED_RANGE;
  let value = checkOf(body) * BODY_RANGE + body;
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out = KEY_ALPHABET[value % 32] + out;
    value = Math.floor(value / 32);
  }
  return out;
}

/** The characters of a typed code as they should be: upper case, without spaces or dashes, look-alike letters read as digits. */
export function cleanChallengeCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}

/** The challenge a typed code stands for, or null when it is not a valid one (wrong length, characters or check). */
export function parseChallengeCode(input: string): (Challenge & { code: string }) | null {
  const code = cleanChallengeCode(input);
  if (!CODE_PATTERN.test(code)) return null;
  let value = 0;
  for (const ch of code) value = value * 32 + KEY_ALPHABET.indexOf(ch);
  const body = value % BODY_RANGE;
  const check = Math.floor(value / BODY_RANGE);
  if (check !== checkOf(body)) return null;
  const depth = Math.floor(body / SEED_RANGE);
  if (depth > 5) return null;
  return { code, seed: body % SEED_RANGE, depth };
}

/** `ABCD-EFGH`, easier to read aloud and copy. */
export const formatChallengeCode = (code: string): string => `${code.slice(0, 4)}-${code.slice(4)}`;

/** A new random challenge. `random` returns a number in [0, 1) (inject a secure one if it matters; this one only picks a cave). */
export function newChallenge(depth: number, random: () => number = Math.random): Challenge & { code: string } {
  const seed = Math.floor(random() * SEED_RANGE);
  return { seed, depth, code: makeChallengeCode(seed, depth) };
}

/**
 * The code of the rematch: the next cave at the same difficulty. It is worked out from the old code alone, so every player who presses
 * "Rematch" lands in the same new room without anybody sending a code.
 */
export function rematchCode(code: string): string | null {
  const parsed = parseChallengeCode(code);
  if (!parsed) return null;
  return makeChallengeCode((parsed.seed + 1) % SEED_RANGE, parsed.depth);
}
