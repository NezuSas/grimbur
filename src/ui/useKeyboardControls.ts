import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import type { Direction } from "../core/engine/types";

/** What the keys of a computer do on a board (each one optional: a screen passes what it has). */
export type KeyHandlers = {
  onMove: (direction: Direction) => void;
  /** Shoot: the hero's facing side (Space), or a side (Shift + a direction). */
  onAttack?: (direction?: Direction) => void;
  onPause?: () => void;
  onAbility?: () => void;
  onUndo?: () => void;
};

/** The keys, as Settings and the Manual list them. */
export const KEY_BINDINGS = {
  move: "↑ ↓ ← →  /  W A S D",
  shoot: "Space",
  aim: "Shift + ↑ ↓ ← →",
  ability: "Q",
  undo: "Z",
  pause: "P / Esc",
} as const;

const DIRECTION: Record<string, Direction> = {
  arrowup: "UP",
  w: "UP",
  arrowdown: "DOWN",
  s: "DOWN",
  arrowleft: "LEFT",
  a: "LEFT",
  arrowright: "RIGHT",
  d: "RIGHT",
};

/**
 * Plays a board from a computer's keyboard (web only; phones have the pad): arrows or WASD walk, Space shoots where the hero
 * faces, Shift + a direction shoots that way, Q the hero's ability, Z undo, P or Esc pause. Keys do nothing while `enabled` is
 * false (a card is open, the run is over) or while typing in a field.
 */
export function useKeyboardControls(handlers: KeyHandlers, enabled: boolean): void {
  const latest = useRef({ handlers, enabled });
  latest.current = { handlers, enabled };
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      const { handlers: h, enabled: on } = latest.current;
      if (!on || e.metaKey || e.ctrlKey || e.altKey || e.repeat && !DIRECTION[e.key.toLowerCase()]) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const key = e.key.toLowerCase();
      const dir = DIRECTION[key];
      if (dir) {
        e.preventDefault();
        if (e.shiftKey && h.onAttack) h.onAttack(dir);
        else h.onMove(dir);
        return;
      }
      if (key === " " && h.onAttack) {
        e.preventDefault();
        h.onAttack();
      } else if ((key === "p" || key === "escape") && h.onPause) h.onPause();
      else if (key === "q" && h.onAbility) h.onAbility();
      else if (key === "z" && h.onUndo) h.onUndo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
