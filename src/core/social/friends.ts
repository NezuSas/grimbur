/**
 * Friends: a list of other players' ids (a friend code is a player id). Kept in the local stats, so the cloud backup carries it
 * to a new phone. For each friend we remember the best score we last saw, to tell the player when a friend has beaten it
 * ("new record") the next time the list loads.
 */
export interface FriendEntry {
  pid: string;
  /** The friend's best score the last time the list was looked at (0 before the first look). */
  seen: number;
}

/** The most friends a list holds. */
export const MAX_FRIENDS = 30;
/** A friend code is a player id (the same shape the server accepts, see firestore.rules `validPid`). */
export const FRIEND_CODE = /^[A-Za-z0-9]{10,64}$/;

/** Tidies what the player typed or pasted: spaces and a `grimbur://friend/` prefix are dropped. */
export const cleanFriendCode = (text: string): string => text.trim().replace(/^grimbur:\/\/friend\//i, '').replace(/\s+/g, '');

export type AddResult = { ok: true; friends: FriendEntry[] } | { ok: false; reason: 'invalid' | 'self' | 'duplicate' | 'full' };

export function addFriend(friends: readonly FriendEntry[], code: string, self: string | null): AddResult {
  const pid = cleanFriendCode(code);
  if (!FRIEND_CODE.test(pid)) return { ok: false, reason: 'invalid' };
  if (self && pid === self) return { ok: false, reason: 'self' };
  if (friends.some(f => f.pid === pid)) return { ok: false, reason: 'duplicate' };
  if (friends.length >= MAX_FRIENDS) return { ok: false, reason: 'full' };
  return { ok: true, friends: [...friends, { pid, seen: 0 }] };
}

export const removeFriend = (friends: readonly FriendEntry[], pid: string): FriendEntry[] => friends.filter(f => f.pid !== pid);

/** True when a friend's best score went up since the player last looked (never on the first look). */
export const beatSinceSeen = (entry: FriendEntry, best: number): boolean => entry.seen > 0 && best > entry.seen;

/** The list after a look: each friend's best is remembered. */
export const markSeen = (friends: readonly FriendEntry[], bests: Readonly<Record<string, number>>): FriendEntry[] =>
  friends.map(f => (bests[f.pid] !== undefined && bests[f.pid] > f.seen ? { ...f, seen: bests[f.pid] } : f));

export function parseFriends(raw: unknown): FriendEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: FriendEntry[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const pid = (r as { pid?: unknown }).pid;
    const seen = (r as { seen?: unknown }).seen;
    if (typeof pid !== 'string' || !FRIEND_CODE.test(pid) || out.some(f => f.pid === pid)) continue;
    out.push({ pid, seen: typeof seen === 'number' && Number.isFinite(seen) && seen > 0 ? Math.trunc(seen) : 0 });
    if (out.length >= MAX_FRIENDS) break;
  }
  return out;
}
