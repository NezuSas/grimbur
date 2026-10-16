import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { emitSound } from "../../audio/audioEventBus";
import { haptic, NotificationFeedbackType } from "../../shared/haptics";
import { useTravel } from "../../hooks/useTravel";
import { arrowPath, arrowReachOf } from "../../core/engine/reducer";
import { lineOfFire, stepTarget } from "../../core/engine/travel";
import { canRepeatStep } from "../../core/input/floatingPad";
import type { Direction, GameState } from "../../core/engine/types";
import type { ArrowShot } from "../../ui/components/BoardView";

type Params = {
  state: GameState;
  /** Always the latest state (read by handlers that live longer than one render). */
  stateRef: MutableRefObject<GameState>;
  /** True while the pause card is up: a held stick or button must not act behind it. */
  pausedRef: MutableRefObject<boolean>;
  /** Walking, shooting and aiming are allowed right now (no overlay, no end of run, no floor change). */
  playing: boolean;
  /** Changes with every new run so the flags of the previous one are cleared. */
  runNumber: number;
  move: (direction: Direction) => void;
  attack: (direction?: Direction) => void;
  /** A step onto a flagged tile was refused (the game screen shows its message). */
  onRefusedFlag: () => void;
};

/**
 * Everything the player does on the board with a finger: steps (the pad, the joystick, swipes), shots (the button, dragging from
 * the hero), the aim preview, the danger flags and tap-to-travel. It owns no layout; GameScreen hands its results to the board
 * and the controls.
 */
export function useBoardInput({ state, stateRef, pausedRef, playing, runNumber, move, attack, onRefusedFlag }: Params) {
  // Tap an explored tile to walk there; any control press interrupts the walk.
  const { travelTo, cancel: cancelTravel } = useTravel(state, move, playing);

  // Tiles the player marked as dangerous (long press). Cosmetic memory aid with one safety rule: stepping onto a marked tile is
  // refused, so a slip of the thumb cannot walk into a suspected hazard.
  const [flags, setFlags] = useState<ReadonlySet<number>>(() => new Set());
  const flagsRef = useRef(flags);
  flagsRef.current = flags;
  const [flagPing, setFlagPing] = useState<{ index: number; n: number } | null>(null);

  const toggleFlag = useCallback(
    (index: number) => {
      if (stateRef.current.visited.includes(index)) return;
      haptic.impact();
      setFlags(prev => {
        const next = new Set(prev);
        if (!next.delete(index)) next.add(index);
        return next;
      });
    },
    [stateRef],
  );
  useEffect(() => setFlags(new Set()), [state.level, state.runSeed, runNumber]);
  // The detector flags the hazards it finds, exactly like the player's own long-press flags.
  useEffect(() => {
    if (state.marked.length === 0) return;
    setFlags(prev => new Set([...prev, ...state.marked]));
  }, [state.marked]);

  /** When the step sound of the last tap was already played at input time, so the state effect does not repeat it. */
  const stepSoundedAt = useRef(0);
  const manualMove = useCallback(
    (d: Direction) => {
      if (pausedRef.current) return; // a stick still held under the pause card must not walk the hero
      cancelTravel();
      const s = stateRef.current;
      const target = stepTarget(s.playerIndex, d, s.rows, s.cols);
      if (flagsRef.current.has(target)) {
        haptic.notify(NotificationFeedbackType.Warning); // marked as dangerous: refuse the step
        setFlagPing({ index: target, n: Date.now() });
        onRefusedFlag();
        return;
      }
      // A plain step (an empty tile) sounds the moment the finger lands, not after the board has re-rendered: on a slow phone that
      // render is what players feel as a delay. Tiles with something on them keep their own sounds.
      if (target !== -1 && !s.entityMap[target] && !s.isGameOver && !s.isLevelUp && !s.pendingDraft && playing) {
        stepSoundedAt.current = Date.now();
        emitSound("MOVE");
      }
      move(d);
    },
    [cancelTravel, move, onRefusedFlag, playing, pausedRef, stateRef],
  );

  // The arrow in flight: where it goes is worked out from the board as it is when the shot is taken.
  const [shot, setShot] = useState<ArrowShot | null>(null);
  const shotCount = useRef(0);
  const manualAttack = useCallback(
    (direction?: Direction) => {
      if (pausedRef.current) return;
      cancelTravel();
      const s = stateRef.current;
      if (s.attack > 0 && !s.isGameOver && !s.isLevelUp && !s.pendingDraft) {
        const dir = direction ?? s.facingDir;
        const { tiles, targetIndex } = arrowPath(s, dir);
        if (tiles.length > 0) setShot({ key: ++shotCount.current, dir, tiles: tiles.length, hit: targetIndex !== -1 });
      }
      attack(direction);
    },
    [cancelTravel, attack, pausedRef, stateRef],
  );

  // While the attack button is held, the board shows where the arrow would go (its full reach: what lies ahead stays hidden).
  const [aim, setAim] = useState<Direction | "facing" | null>(null);
  const aimDir: Direction | null = aim === "facing" ? state.facingDir : aim;
  const reach = arrowReachOf(state);
  const aimTiles = useMemo(
    () => (aimDir ? new Set(lineOfFire(state.playerIndex, aimDir, reach, state.rows, state.cols)) : undefined),
    [aimDir, state.playerIndex, state.rows, state.cols, reach],
  );

  // The joystick keeps walking while it is held, but only over explored, empty ground (never blindly).
  const canRepeatMove = useCallback((direction: Direction) => !pausedRef.current && canRepeatStep(stateRef.current, direction, flagsRef.current), [pausedRef, stateRef]);

  // Drag from the hero: letting go on a side shoots that way (without arrows it is refused, like the button).
  const fireDragged = useCallback(
    (direction: Direction) => {
      if (stateRef.current.attack <= 0) {
        haptic.notify(NotificationFeedbackType.Warning);
        return;
      }
      manualAttack(direction);
    },
    [manualAttack, stateRef],
  );

  return { flags, flagPing, toggleFlag, manualMove, manualAttack, canRepeatMove, fireDragged, setAim, aimDir, aimTiles, shot, travelTo, cancelTravel, stepSoundedAt };
}
