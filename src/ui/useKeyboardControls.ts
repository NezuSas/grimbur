import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import type { Direction } from "../core/engine/types";
import { actionOf } from "../core/input/keyBindings";
import { useSettingsStore } from "../state/settings/store";

/** What the keys of a computer do on a board (each one optional: a screen passes what it has). */
export type KeyHandlers = {
  onMove: (direction: Direction) => void;
  /** Shoot: the hero's facing side (Space), or a side (Shift + a direction). */
  onAttack?: (direction?: Direction) => void;
  onPause?: () => void;
  onAbility?: () => void;
  onUndo?: () => void;
};

const DIRECTION: Partial<Record<string, Direction>> = { up: "UP", down: "DOWN", left: "LEFT", right: "RIGHT" };

/**
 * Plays a board from a computer's keyboard (web only; phones have the pad), with the player's keys (core/input/keyBindings):
 * arrows or the walking keys move one tile per press (a held key does not repeat), the shooting key shoots where the hero faces, Shift + a direction shoots that way, then the
 * ability, undo and pause keys (Esc pauses too). Keys do nothing while `enabled` is
 * false (a card is open, the run is over) or while typing in a field.
 */
export function useKeyboardControls(handlers: KeyHandlers, enabled: boolean): void {
  const latest = useRef({ handlers, enabled });
  latest.current = { handlers, enabled };
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      const { handlers: h, enabled: on } = latest.current;
      if (!on || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "Escape" && h.onPause) {
        h.onPause();
        return;
      }
      const action = actionOf(useSettingsStore.getState().keyBindings, e.key);
      if (!action) return;
      const dir = DIRECTION[action];
      if (dir) {
        e.preventDefault();
        // One press, one step: a held key repeating would walk the hero on and on, into whatever lies ahead.
        if (e.repeat) return;
        if (e.shiftKey && h.onAttack) h.onAttack(dir);
        else h.onMove(dir);
        return;
      }
      if (e.repeat) return;
      if (action === "shoot" && h.onAttack) {
        e.preventDefault();
        h.onAttack();
      } else if (action === "pause" && h.onPause) h.onPause();
      else if (action === "ability" && h.onAbility) h.onAbility();
      else if (action === "undo" && h.onUndo) h.onUndo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
