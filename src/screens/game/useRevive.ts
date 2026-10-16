import { useCallback, useEffect, useState } from "react";
import { analytics } from "../../services/analytics";
import { getLocalStats, spendEmbersFor } from "../../services/localStats";
import { revivePrice } from "../../core/engine/revive";
import type { GameState } from "../../core/engine/types";
import { GAME_OVER_CARD_DELAY_MS } from "./types";

type Params = {
  state: GameState;
  /** The daily board is the same for everyone: no second chances there. */
  isDaily: boolean;
  /** Changes with every new run. */
  runNumber: number;
  revive: () => void;
  /** The Forge's Second wind: the first revive of the run costs nothing. */
  freeFirst?: boolean;
  /** The hero is back (the screen tells the player what happened). */
  onRevived: () => void;
};

type Gate = { key: string; result: "offer" | "none" | "declined" };

/**
 * The second chance after a death: when the hero falls and the purse can pay, the result card waits for the player's answer. It
 * only offers what can be bought (a button that cannot be pressed would be a nag). `holdEnd` tells the run record to wait.
 */
export function useRevive({ state, isDaily, runNumber, revive, onRevived, freeFirst }: Params) {
  const used = state.revives ?? 0;
  const price = used === 0 && freeFirst ? 0 : revivePrice(used, state.level, state.ascension);
  const eligible = state.isGameOver && !state.isVictory && !isDaily && !!state.lastBreath;
  const key = `${runNumber}:${used}`;
  const [gate, setGate] = useState<Gate | null>(null);
  const [embers, setEmbers] = useState(0);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  // Are there embers enough? (The purse is read the moment the hero falls.)
  useEffect(() => {
    if (!eligible) {
      setVisible(false);
      return;
    }
    let cancelled = false;
    getLocalStats()
      .then(stats => {
        if (cancelled) return;
        setEmbers(stats.embers);
        setGate({ key, result: stats.embers >= price ? "offer" : "none" });
      })
      .catch(() => !cancelled && setGate({ key, result: "none" }));
    return () => {
      cancelled = true;
    };
  }, [eligible, key, price]);

  // The offer waits for the death animation, like the result card does.
  const offered = eligible && gate?.key === key && gate.result === "offer";
  useEffect(() => {
    if (!offered) return;
    const timer = setTimeout(() => setVisible(true), GAME_OVER_CARD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [offered]);

  const decline = useCallback(() => {
    setVisible(false);
    setGate({ key, result: "declined" });
  }, [key]);

  const accept = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const paid = price === 0 ? true : await spendEmbersFor(price);
      if (!paid) {
        decline();
        return;
      }
      analytics.track("revived", { level: state.level, score: state.score, price });
      setVisible(false);
      revive();
      onRevived();
    } catch {
      decline();
    } finally {
      setBusy(false);
    }
  }, [busy, price, state.level, state.score, revive, onRevived, decline]);

  // The record of the run waits while the question is open (and for the moment it takes to read the purse).
  const holdEnd = eligible && (gate?.key !== key || gate.result === "offer");
  return { visible, price, embers, used, busy, accept, decline, holdEnd };
}
