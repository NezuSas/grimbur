/**
 * The cloud recovery key: 16 characters of a 32-letter alphabet without I, L, O and U (80 bits, so it cannot be guessed). It is the
 * only thing that finds a player's backup in the cloud, so it is shown in Settings and the player keeps it, like a code in a note.
 * It matches the `validKey` rule in firestore.rules.
 */
export const KEY_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const KEY_LENGTH = 16;
export const KEY_PATTERN = /^[0-9A-HJKMNP-TV-Z]{16}$/;

/** A key from 10 random bytes (80 bits = 16 groups of 5 bits). The bytes must come from a secure source. */
export function keyFromBytes(bytes: ArrayLike<number>): string {
  if (bytes.length < 10) throw new Error('a key needs 10 random bytes');
  let bits = 0;
  let value = 0;
  let out = '';
  for (let i = 0; i < 10; i++) {
    value = (value << 8) | (bytes[i] & 255);
    bits += 8;
    while (bits >= 5) {
      out += KEY_ALPHABET[(value >> (bits - 5)) & 31];
      bits -= 5;
    }
    value &= (1 << bits) - 1;
  }
  return out;
}

/** What a player types or pastes, as a key: spaces, dashes and case are ignored and look-alike letters are read as the digits. Null when it is not one. */
export function normalizeKey(input: string): string | null {
  const clean = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  return KEY_PATTERN.test(clean) ? clean : null;
}

/** `ABCD-EFGH-JKMN-PQRS`, easier to copy by hand. */
export const formatKey = (key: string): string => (key.match(/.{1,4}/g) ?? [key]).join('-');
