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
}

/** Writes this player's state. Throws when the data is not valid or the network fails. */
export async function publishDuelState(code: string, name: string, patch: { characterIndex: number; state: DuelState; level: number; score: number; victory: boolean; time: number; stake: number }): Promise<void> {
  if (!CODE_PATTERN.test(code)) throw new Error('[duel] not a code');
  const checked = checkName(name);
  if (!checked.ok) throw new Error(`[duel] rejected name (${checked.reason})`);
  const pid = await getPlayerId();
  const row: DuelPlayer = { code, pid, name: checked.name, ...patch, level: Math.round(patch.level), score: Math.max(0, Math.round(patch.score)), time: Math.round(patch.time) };
  const problems = validateDuelPlayer(row);
  if (problems.length > 0) throw new Error(`[duel] invalid state: ${problems.join(', ')}`);
  await setDoc(doc(db, COLLECTION, `${code}_${pid}`), { ...row, updatedAt: serverTimestamp() });
}

/** Listens to a room: calls back with this player's document and the rival's whenever either changes. Returns the unsubscribe. */
export function watchRoom(code: string, myId: string, onRoom: (room: Room) => void, onError: (e: unknown) => void): Unsubscribe {
  const q = query(collection(db, COLLECTION), where('code', '==', code), limit(4));
  return onSnapshot(
    q,
    snap => {
      let me: RoomPlayer | null = null;
      const others: RoomPlayer[] = [];
      snap.forEach(d => {
        const data = d.data({ serverTimestamps: 'estimate' }) as Omit<RoomPlayer, 'updatedAt'> & { updatedAt?: { toMillis: () => number } };
        const player: RoomPlayer = { ...data, updatedAt: data.updatedAt ? data.updatedAt.toMillis() : null };
        if (player.pid === myId) me = player;
        else others.push(player);
      });
      others.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      onRoom({ me, rivals: others.slice(0, MAX_PLAYERS - 1), full: !me && others.length >= MAX_PLAYERS });
    },
    onError,
  );
}
