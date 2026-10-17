import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HEARTBEAT_MS, MIN_PUBLISH_MS, duelStanding, potOf, rivalStatus } from "../../core/duel/duel";
import type { RivalStatus, Standing } from "../../core/duel/duel";
import type { GameState } from "../../core/engine/types";
import { publishDuelState, watchRoom, type Room } from "../../services/duel";
import { creditEmbersFor } from "../../services/localStats";
import { getPlayerId } from "../../services/playerProfile";

type Params = {
  /** The duel this run belongs to (null: not a duel). `stake` is what each player put in the pot, already paid when the run began. */
  duel: { code: string; name: string; stake: number } | null;
  stateRef: MutableRefObject<GameState>;
  characterIndex: number;
  /** The run is over (the hero died or the Wumpus fell). */
  runEnded: boolean;
  sessionTimeRef: { readonly current: number };
};

export interface RivalView {
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
  /** The embers this player took from the pot (the whole pot for a win, their own stake back for a tie), once paid. */
  prize: number;
}

const paidKey = (code: string) => `wumpus.duel.paid.${code}`;

/**
 * The live duel during a run: it publishes this player's floor and score (when they change, never more often than every few seconds,
 * and as a heartbeat), listens to every rival, works out the standing once the run is over and pays the pot to the winner once.
 * Nothing here changes the game: a failed connection only means the rivals' progress is not shown.
 */
export function useDuel({ duel, stateRef, characterIndex, runEnded, sessionTimeRef }: Params): DuelView {
  const [room, setRoom] = useState<Room>({ me: null, rivals: [], full: false });
  const [now, setNow] = useState(() => Date.now());
  const [prize, setPrize] = useState(0);
  const lastSent = useRef({ level: 0, score: -1, at: 0 });
  const finished = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const code = duel?.code ?? null;
  const name = duel?.name ?? "";
  const stake = duel?.stake ?? 0;

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

  // Only rivals who started count (a document still in the lobby or ready belongs to somebody who never began the run).
  const started = room.rivals.filter(r => r.state === "playing" || r.state === "done");
  const rivals: RivalView[] = started.map(r => ({ name: r.name, level: r.level, score: r.score, victory: r.victory, characterIndex: r.characterIndex, status: rivalStatus(r, r.updatedAt, now) }));
  const s = stateRef.current;
  const me = { victory: s.isVictory, level: s.level, score: s.score, time: Math.round(sessionTimeRef.current) };
  const standing = code && runEnded
    ? duelStanding(
        me,
        true,
        started.map((r, i) => ({ result: { victory: r.victory, level: r.level, score: r.score, time: r.time }, finished: rivals[i].status === "done" || rivals[i].status === "away" })),
      )
    : null;

  // The pot goes to the winner once; a tie gives every stake back. A code is paid only once on this phone, however often the screen is opened.
  const standingState = standing?.decided ? standing.state : null;
  const matching = started.filter(r => r.stake === stake).length + 1;
  useEffect(() => {
    if (!code || stake <= 0 || (standingState !== "won" && standingState !== "tie")) return;
    void (async () => {
      try {
        if (await AsyncStorage.getItem(paidKey(code))) return;
        await AsyncStorage.setItem(paidKey(code), "1"); // marked first: a crash must never pay twice
        const amount = standingState === "won" ? potOf(stake, matching) : stake;
        const credited = await creditEmbersFor(amount);
        if (credited && alive.current) setPrize(amount);
      } catch (e) {
        console.warn("[duel] could not pay the pot:", e);
      }
    })();
  }, [code, stake, standingState, matching]);

  return { active: !!code, rivals, standing, stake, prize };
}
