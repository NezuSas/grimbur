import { useEffect, useRef } from "react";
import { Platform } from "react-native";

/**
 * Enter and Esc on a computer, for menus and cards: the most recent card or screen that asked for a key gets it. A card that
 * opens over a screen therefore answers first (Enter presses its main button, Esc closes it), and when it closes, the screen
 * under it answers again (Esc goes back). Web only; nothing happens while typing in a field.
 */
type Entry = { id: number; fn: () => void; enabled: boolean };
const stacks: Record<"Enter" | "Escape", Entry[]> = { Enter: [], Escape: [] };
let nextId = 1;
let listening = false;

function listen(): void {
  if (listening || Platform.OS !== "web" || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== "Escape") return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
    const stack = stacks[e.key];
    for (let i = stack.length - 1; i >= 0; i--) {
      if (!stack[i].enabled) continue;
      e.preventDefault();
      stack[i].fn();
      return;
    }
  });
}

function useHotkey(key: "Enter" | "Escape", fn: (() => void) | undefined, enabled: boolean): void {
  const entry = useRef<Entry | null>(null);
  if (entry.current) {
    entry.current.fn = fn ?? (() => {});
    entry.current.enabled = enabled && !!fn;
  }
  useEffect(() => {
    if (Platform.OS !== "web") return;
    listen();
    const e: Entry = { id: nextId++, fn: fn ?? (() => {}), enabled: enabled && !!fn };
    entry.current = e;
    stacks[key].push(e);
    return () => {
      const at = stacks[key].indexOf(e);
      if (at >= 0) stacks[key].splice(at, 1);
      entry.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Enter presses this (the main button of a card). */
export const useEnterKey = (fn: (() => void) | undefined, enabled = true): void => useHotkey("Enter", fn, enabled);
/** Esc does this (close a card, go back from a screen). */
export const useEscapeKey = (fn: (() => void) | undefined, enabled = true): void => useHotkey("Escape", fn, enabled);
