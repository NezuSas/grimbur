import { useCallback, useEffect, useRef } from 'react';
import { Direction, GameState, HUNTER_TYPES } from '../core/engine/types';
import { travelPath } from '../core/engine/travel';

const STEP_MS = 110;
/** A roaming guardian or the Wumpus this close (in tiles) stops the walk. */
const HUNTER_ALERT_DISTANCE = 3;

const DELTA: Record<Direction, (cols: number) => number> = {
  UP: cols => -cols,
  DOWN: cols => cols,
  LEFT: () => -1,
  RIGHT: () => 1,
};

const distance = (a: number, b: number, cols: number) =>
  Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs((a % cols) - (b % cols));

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
      let from = s.playerIndex;
      let late = 0;
      timer.current = setInterval(() => {
        const cur = stateRef.current;
        // The last step may simply not have been drawn yet (a busy phone): wait a few ticks before calling it a stall.
        if (cur.playerIndex === from && expected !== from && late < 3) {
          late++;
          return;
        }
        late = 0;
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
        const dir = path[step];
        const next = expected + DELTA[dir](cur.cols);
        // Something now sits on the tile ahead (a hunter stepped onto the route), or a hunter is close:
        // hand control back to the player instead of walking into it.
        // Only hunters the player can actually see (on explored tiles) count, so stopping never leaks hidden positions.
        const hunterNear = cur.entities.some(
          e =>
            HUNTER_TYPES.includes(e.type) &&
            cur.visited.includes(e.index) &&
            distance(e.index, cur.playerIndex, cur.cols) <= HUNTER_ALERT_DISTANCE,
        );
        if (cur.entityMap[next] || hunterNear) {
          cancel();
          return;
        }
        step++;
        moveRef.current(dir);
        // Predict where this step lands; a mismatch on the next tick means something intervened.
        from = expected;
        expected = next;
        if (step >= path.length) cancel();
      }, STEP_MS);
    },
    [cancel],
  );

  return { travelTo, cancel };
}
