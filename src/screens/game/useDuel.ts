import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HEARTBEAT_MS, MIN_PUBLISH_MS, duelStanding, isGone, prizeOf, rivalStatus, tieShare } from "../../core/duel/duel";
import type { RivalStatus, Standing } from "../../core/duel/duel";
import type { GameState } from "../../core/engine/types";
import { EMPTY_ROOM, publishDuelState, watchRoom, type Room } from "../../services/duel";
import { creditEmbersFor } from "../../services/localStats";
import { haptic, NotificationFeedbackType } from "../../shared/haptics";
import { recordOf } from "../../core/duel/history";
import { saveDuelRecord } from "../../services/duelHistory";
import { getPlayerId } from "../../services/playerProfile";

type Params = {
  /**
   * The duel this run belongs to (null: not a duel). `stake` is what each player put in the pot, already paid when the run began.
   * `members` are the players who were ready when the countdown ended: only they are rivals (an old document left in the room by
   * somebody who is not in this match never counts). `matchId` tells this match from an earlier one played with the same code.
   */
  duel: { code: string; name: string; stake: number; members: string[]; matchId: string } | null;
  stateRef: MutableRefObject<GameState>;
  characterIndex: number;
  /** The run is over (the hero died or the Wumpus fell). */
  runEnded: boolean;
  sessionTimeRef: { readonly current: number };
};

export interface RivalView {
  pid: string;
  name: string;
  level: number;
  score: number;
  victory: boolean;
  status: RivalStatus;
  characterIndex: number;
}

export interface DuelView {
  active: boolean;
  rivals: RivalView[];
  /** Only once this player's run is over: how the duel stands (decided or not yet). */
  standing: Standing | null;
  stake: number;
  /** The embers this player took from the pot (the whole prize for a win, their share for a tie), once paid. */
  prize: number;
}

const paidKey = (code: string, matchId: string) => `wumpus.duel.paid.${code}.${matchId}`;

/**
 * The live duel during a run: it publishes this player's floor and score (when they change, never more often than every few seconds,
 * and as a heartbeat), listens to every rival, works out the standing once the run is over and pays the prize once per match.
 * Nothing here changes the game: a failed connection only means the rivals' progress is not shown.
 */
export function useDuel({ duel, stateRef, characterIndex, runEnded, sessionTimeRef }: Params): DuelView {
  const [room, setRoom] = useState<Room>(EMPTY_ROOM);
  const [wallNow, setWallNow] = useState(() => Date.now());
  const [prize, setPrize] = useState(0);
  const lastSent = useRef({ level: 0, score: -1, at: 0 });
  const finished = useRef(false);
  const alive = useRef(true);
  const paying = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const code = duel?.code ?? null;
  const name = duel?.name ?? "";
  const stake = duel?.stake ?? 0;
  const matchId = duel?.matchId ?? "";
  const memberKey = (duel?.members ?? []).join(",");

  const send = useCallback(
    (state: "playing" | "done") => {
      if (!code) return;
      const s = stateRef.current;
      lastSent.current = { level: s.level, score: s.score, at: Date.now() };
      void publishDuelState(code, name, {
        characterIndex,
        state,
        level: s.level,
        score: s.score,
        victory: s.isVictory,
        time: state === "done" ? Math.max(1, Math.round(sessionTimeRef.current)) : 0,
        stake,
      }).catch(e => console.warn("[duel] could not publish:", e));
    },
    [code, name, stake, characterIndex, stateRef, sessionTimeRef],
  );

  // Listening to the room and the clock that tells "away" from "playing".
  useEffect(() => {
    if (!code) return;
    let off: (() => void) | undefined;
    let cancelled = false;
    void getPlayerId().then(id => {
      if (cancelled) return;
      off = watchRoom(code, id, setRoom, e => console.warn("[duel] room error:", e));
    });
    const tick = setInterval(() => setWallNow(Date.now()), 3000);
    return () => {
      cancelled = true;
      off?.();
      clearInterval(tick);
    };
  }, [code]);

  // Publishing: the start, every change (spaced out), the heartbeat and the end.
  useEffect(() => {
    if (!code) return;
    finished.current = false;
    send("playing");
    const poll = setInterval(() => {
      if (finished.current) return;
      const s = stateRef.current;
      const sent = lastSent.current;
      const changed = s.level !== sent.level || s.score !== sent.score;
      const due = Date.now() - sent.at;
      if ((changed && due >= MIN_PUBLISH_MS) || due >= HEARTBEAT_MS) send("playing");
    }, 1000);
    return () => {
      clearInterval(poll);
      if (!finished.current) {
        // Leaving in the middle of the run counts as stopping where the hero is.
        finished.current = true;
        send("done");
      }
    };
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!code || !runEnded || finished.current) return;
    finished.current = true;
    send("done");
  }, [code, runEnded, send]);

  // Rivals: only the players of this match. Time is the server's (this player's own last write), so a wrong clock changes nothing.
  const members = new Set(memberKey ? memberKey.split(",") : []);
  const now = room.serverNow ?? wallNow;
  const mine = room.rivals.filter(r => members.has(r.pid));
  const rivals: RivalView[] = mine.map(r => ({ pid: r.pid, name: r.name, level: r.level, score: r.score, victory: r.victory, characterIndex: r.characterIndex, status: rivalStatus(r, r.updatedAt, now) }));
  // A member whose document has not arrived yet still counts as playing (the duel is never decided without them).
  const missing = [...members].filter(id => !mine.some(r => r.pid === id));
  const s = stateRef.current;
  const me = { victory: s.isVictory, level: s.level, score: s.score, time: Math.round(sessionTimeRef.current) };
  const standing = code && runEnded
    ? duelStanding(me, true, [
        ...mine.map((r, i) => ({ result: { victory: r.victory, level: r.level, score: r.score, time: r.time }, finished: rivals[i].status === "done" || (r.updatedAt !== null && isGone(r.updatedAt, now)) })),
        ...missing.map(() => ({ result: { victory: false, level: 1, score: 0, time: 0 }, finished: false })),
      ])
    : null;

  // A rival who goes down a floor or finishes is felt in the hand.
  const seen = useRef<Record<string, { level: number; done: boolean }>>({});
  useEffect(() => {
    if (!code) return;
    for (const r of rivals) {
      const before = seen.current[r.pid];
      const done = r.status === "done";
      if (before && r.level > before.level) haptic.impact();
      if (before && done && !before.done) haptic.notify(NotificationFeedbackType.Warning);
      seen.current[r.pid] = { level: r.level, done };
    }
  }, [code, rivals.map(r => `${r.pid}:${r.level}:${r.status}`).join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  // The prize goes out once per match: the winner takes the pot minus the fee, players tied for first share the whole pot.
  const standingState = standing?.decided ? standing.state : null;
  // Only stakes that were really paid make the pot: a member who never started their run (closed the app at the countdown) paid nothing.
  const players = 1 + mine.filter(r => r.state === "playing" || r.state === "done").length;
  const tiedFirst = standing?.tiedFirst ?? 1;
  const amount = standingState === "won" ? prizeOf(stake, players) : standingState === "tie" ? tieShare(stake, players, tiedFirst) : 0;
  useEffect(() => {
    if (!code || stake <= 0 || amount <= 0 || paying.current) return;
    paying.current = true;
    void (async () => {
      try {
        if (await AsyncStorage.getItem(paidKey(code, matchId))) return;
        const credited = await creditEmbersFor(amount);
        if (!credited) throw new Error("not credited");
        await AsyncStorage.setItem(paidKey(code, matchId), "1"); // marked only once the embers are in
        if (alive.current) setPrize(amount);
      } catch (e) {
        console.warn("[duel] could not pay the prize:", e);
        paying.current = false; // the next render tries again
      }
    })();
  }, [code, matchId, stake, amount]);

  // The finished duel goes into the history (once: the same code replaces itself).
  useEffect(() => {
    if (!code || !standing || !standing.decided) return;
    const record = recordOf(code, standing, stake, amount, Date.now());
    if (record) void saveDuelRecord(record);
  }, [code, standing?.state, standing?.decided, stake, amount]); // eslint-disable-line react-hooks/exhaustive-deps

  return { active: !!code, rivals, standing, stake, prize };
}
