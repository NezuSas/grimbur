import { useCallback, useEffect, useState } from "react";
import { analytics } from "../../services/analytics";
import { getLocalStats, spendEmbersFor } from "../../services/localStats";
import { REFILL_ARROWS, refillPrice } from "../../core/engine/revive";
import type { GameState } from "../../core/engine/types";

type Params = {
  state: GameState;
  /** The daily board is the same for everyone: nothing is bought there. */
  isDaily: boolean;
  /** Walking and shooting are allowed right now (no overlay, no end of run, no floor change). */
  playing: boolean;
  refill: () => void;
};

/**
 * Arrows for embers, for the hero that ran dry in the middle of a floor. The offer shows only while there are no arrows left and
 * only when the purse can pay it (a button that cannot be pressed would be a nag).
 */
export function useArrowRefill({ state, isDaily, playing, refill }: Params) {
  const used = state.refills ?? 0;
  const price = refillPrice(used);
  const dry = playing && !isDaily && state.attack <= 0;
  const [embers, setEmbers] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // The purse is read when the last arrow is gone (and again after each pack).
  useEffect(() => {
    if (!dry) {
      setEmbers(null);
      return;
    }
    let cancelled = false;
    getLocalStats()
      .then(stats => !cancelled && setEmbers(stats.embers))
      .catch(() => !cancelled && setEmbers(null));
    return () => {
      cancelled = true;
    };
  }, [dry, used]);

  const buy = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const paid = await spendEmbersFor(price);
      if (paid) {
        analytics.track("arrows_bought", { level: state.level, price });
        refill();
      }
      setEmbers(paid ? paid.embers : null);
    } catch {
      setEmbers(null);
    } finally {
      setBusy(false);
    }
  }, [busy, price, state.level, refill]);

  const show = dry && embers !== null && embers >= price;
  return { show, price, arrows: REFILL_ARROWS, busy, buy };
}
