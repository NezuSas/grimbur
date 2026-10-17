import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { HEARTBEAT_MS, MIN_PUBLISH_MS, duelOutcome, duelSettled, rivalStatus } from "../../core/duel/duel";
import type { DuelOutcome, RivalStatus } from "../../core/duel/duel";
import type { GameState } from "../../core/engine/types";
import { publishDuelState, watchRoom, type Room } from "../../services/duel";
import { getPlayerId } from "../../services/playerProfile";

type Params = {
  /** The duel this run belongs to (null: not a duel). */
  duel: { code: string; name: string } | null;
  stateRef: MutableRefObject<GameState>;
  characterIndex: number;
  /** The run is over (the hero died or the Wumpus fell). */
  runEnded: boolean;
  sessionTimeRef: { readonly current: number };
};

export interface DuelView {
  active: boolean;
  status: RivalStatus;
  rival: { name: string; level: number; score: number; victory: boolean; time: number } | null;
  /** Only once this player is done: how the duel stands (final when the rival is done or gone). */
  outcome: DuelOutcome | null;
  settled: boolean;
}

/**
 * The live duel during a run: it publishes this player's floor and score (when they change, never more often than every few
 * seconds, and as a heartbeat), listens to the rival's, and works out the result once the run is over. Nothing here changes the
 * game: a failed connection only means the rival's progress is not shown.
 */
export function useDuel({ duel, stateRef, characterIndex, runEnded, sessionTimeRef }: Params): DuelView {
  const [room, setRoom] = useState<Room>({ me: null, rival: null, full: false });
  const [now, setNow] = useState(() => Date.now());
  const lastSent = useRef({ level: 0, score: -1, at: 0 });
  const finished = useRef(false);
  const code = duel?.code ?? null;
  const name = duel?.name ?? "";

  const send = useCallback(
    (state: "playing" | "done") => {
      if (!code) return;
      const s = stateRef.current;
      lastSent.current = { level: s.level, score: s.score, at: Date.now() };
      void publishDuelState(code, name, {
        characterIndex,
        state,
        level: Math.min(10, Math.max(1, s.level)),
        score: s.score,
        victory: s.isVictory,
        time: state === "done" ? Math.max(1, Math.round(sessionTimeRef.current)) : 0,
      }).catch(e => console.warn("[duel] could not publish:", e));
    },
    [code, name, characterIndex, stateRef, sessionTimeRef],
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
    const tick = setInterval(() => setNow(Date.now()), 3000);
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

  const rivalDoc = room.rival;
  const status = rivalStatus(rivalDoc, rivalDoc?.updatedAt ?? null, now);
  const s = stateRef.current;
  const rival = rivalDoc ? { name: rivalDoc.name, level: rivalDoc.level, score: rivalDoc.score, victory: rivalDoc.victory, time: rivalDoc.time } : null;
  const me = { victory: s.isVictory, level: s.level, score: s.score, time: Math.round(sessionTimeRef.current) };
  return {
    active: !!code,
    status,
    rival,
    outcome: runEnded && rival ? duelOutcome(me, rival) : null,
    settled: duelSettled(runEnded, status),
  };
}
