import { useCallback, useEffect, useRef } from 'react';
import { Direction, GameState } from '../core/engine/types';
import { travelPath } from '../core/engine/travel';

const STEP_MS = 110;

/**
 * Tap-to-travel: walks the player along an explored, empty route one step at a time, exactly as if
 * the D-pad were tapped. It stops at once when anything changes (pickup, shield, arrows, a wind-up
 * on the board, a teleport) or when the player touches any control.
 */
export function useTravel(state: GameState, move: (d: Direction) => void, enabled: boolean) {
  const stateRef = useRef(state);
  stateRef.current = state;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const moveRef = useRef(move);
  moveRef.current = move;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const cancel = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);
  // A new floor or run, a draft or a pause all end the walk.
  useEffect(() => {
    if (!enabled) cancel();
  }, [enabled, cancel]);
  useEffect(() => cancel, [state.level, state.isGameOver, state.isLevelUp, cancel]);

  const travelTo = useCallback(
    (target: number) => {
      cancel();
      const s = stateRef.current;
      if (!enabledRef.current || s.isGameOver || s.isLevelUp || s.pendingDraft) return;
      const path = travelPath(s.visited, s.entityMap, s.playerIndex, target, s.rows, s.cols);
      if (!path) return;

      const start = { coins: s.coins, attack: s.attack, shield: s.shield, relics: s.relics.length, level: s.level };
      let step = 0;
      let expected = s.playerIndex;
      timer.current = setInterval(() => {
        const cur = stateRef.current;
        const stalled =
          !enabledRef.current ||
          cur.isGameOver ||
          cur.isLevelUp ||
          cur.pendingDraft ||
          cur.playerIndex !== expected ||
          cur.level !== start.level ||
          cur.coins !== start.coins ||
          cur.attack !== start.attack ||
          cur.shield !== start.shield ||
          cur.relics.length !== start.relics ||
          cur.entities.some(e => (e.charge ?? 0) >= 1);
        if (stalled || step >= path.length) {
          cancel();
          return;
        }
        const dir = path[step++];
        moveRef.current(dir);
        // Predict where this step lands; a mismatch on the next tick means something intervened.
        const delta = { UP: -cur.cols, DOWN: cur.cols, LEFT: -1, RIGHT: 1 }[dir];
        expected += delta;
        if (step >= path.length) cancel();
      }, STEP_MS);
    },
    [cancel],
  );

  return { travelTo, cancel };
}
