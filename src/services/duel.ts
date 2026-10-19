import { collection, doc, limit, onSnapshot, query, serverTimestamp, setDoc, where, type Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { checkName } from '../core/leaderboard/validation';
import { CODE_PATTERN } from '../core/challenge/code';
import { DuelPlayer, DuelState, MAX_PLAYERS, validateDuelPlayer } from '../core/duel/duel';
import { getPlayerId } from './playerProfile';

/** Live duel: publishes this player's state and listens to the room (see core/duel/duel.ts and firestore.rules). */
const COLLECTION = 'duel_players';

export interface RoomPlayer extends DuelPlayer {
  /** When the document was last written by the server (ms), or null while the write is pending. */
  updatedAt: number | null;
}

export interface Room {
  me: RoomPlayer | null;
  /** Everybody else in the room, the one who updated last first. */
  rivals: RoomPlayer[];
  /** The room already has its four players and this one is not among them. */
  full: boolean;
  /**
   * "Now" by the server's clock: the time of this player's own last write. A rival is disconnected when they have not written for a while
   * compared with it, so a phone whose own clock is wrong does not see everybody as gone. Null before the first write lands.
   */
  serverNow: number | null;
}

export const EMPTY_ROOM: Room = { me: null, rivals: [], full: false, serverNow: null };

/** Writes this player's state. Throws when the data is not valid or the network fails. */
export async function publishDuelState(code: string, name: string, patch: { characterIndex: number; state: DuelState; level: number; score: number; victory: boolean; time: number; stake: number }): Promise<void> {
  if (!CODE_PATTERN.test(code)) throw new Error('[duel] not a code');
  const checked = checkName(name);
  if (!checked.ok) throw new Error(`[duel] rejected name (${checked.reason})`);
  const pid = await getPlayerId();
  const level = Math.min(10, Math.max(1, Math.round(patch.level)));
  // The score is capped to what the floors allow so that a rare overshoot can never make the final "done" fail and look like a disconnect.
  const row: DuelPlayer = { code, pid, name: checked.name, ...patch, level, score: Math.min(level * 20000, Math.max(0, Math.round(patch.score))), time: Math.round(patch.time) };
  const problems = validateDuelPlayer(row);
  if (problems.length > 0) throw new Error(`[duel] invalid state: ${problems.join(', ')}`);
  const write = () => setDoc(doc(db, COLLECTION, `${code}_${pid}`), { ...row, updatedAt: serverTimestamp() });
  try {
    await write();
  } catch (e) {
    if (patch.state !== 'done') throw e;
    await write(); // the end of a run is worth one more try: the others are waiting for it
  }
}

const toPlayer = (data: Record<string, unknown>): RoomPlayer => {
  const updatedAt = data.updatedAt as { toMillis?: () => number } | undefined;
  return { ...(data as unknown as DuelPlayer), updatedAt: updatedAt?.toMillis ? updatedAt.toMillis() : null };
};

/**
 * Listens to a room: calls back with this player's document and the rivals' whenever either changes. Two listeners are used: the room
 * (the other players) and this player's own document by id, so the player always sees themselves even when the room is crowded with
 * old documents. Returns the unsubscribe.
 */
export function watchRoom(code: string, myId: string, onRoom: (room: Room) => void, onError: (e: unknown) => void): Unsubscribe {
  let me: RoomPlayer | null = null;
  let others: RoomPlayer[] = [];
  const emit = () => {
    const rivals = [...others].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, MAX_PLAYERS - 1);
    onRoom({ me, rivals, full: !me && others.length >= MAX_PLAYERS, serverNow: me?.updatedAt ?? null });
  };
  const offRoom = onSnapshot(
    query(collection(db, COLLECTION), where('code', '==', code), limit(MAX_PLAYERS)),
    snap => {
      others = [];
      snap.forEach(d => {
        const player = toPlayer(d.data({ serverTimestamps: 'estimate' }));
        if (player.pid !== myId) others.push(player);
      });
      emit();
    },
    onError,
  );
  const offMe = onSnapshot(
    doc(db, COLLECTION, `${code}_${myId}`),
    snap => {
      me = snap.exists() ? toPlayer(snap.data({ serverTimestamps: 'estimate' })) : null;
      emit();
    },
    onError,
  );
  return () => {
    offRoom();
    offMe();
  };
}
