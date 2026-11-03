/**
 * The keys of a computer. Every action has one key the player can change (Settings > Controls); movement also always answers to
 * the arrows, Esc always pauses or closes, and Enter always plays on. Keys are stored as `KeyboardEvent.key` lowercased (" " for
 * the space bar).
 */
export type KeyAction = "up" | "down" | "left" | "right" | "shoot" | "ability" | "undo" | "pause" | "flag" | "note" | "hint" | "restart";

export const KEY_ACTIONS: readonly KeyAction[] = ["up", "down", "left", "right", "shoot", "ability", "undo", "pause", "flag", "note", "hint", "restart"];

export type KeyBindings = Partial<Record<KeyAction, string>>;

export const DEFAULT_BINDINGS: Record<KeyAction, string> = {
  up: "w",
  down: "s",
  left: "a",
  right: "d",
  shoot: " ",
  ability: "q",
  undo: "z",
  pause: "p",
  flag: "f",
  note: "n",
  hint: "h",
  restart: "r",
};

/** Keys that keep their own meaning and cannot be given to an action. */
const RESERVED = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "escape", "enter", "tab", "shift", "control", "alt", "meta", "capslock"]);

const ARROWS: Record<string, KeyAction> = { arrowup: "up", arrowdown: "down", arrowleft: "left", arrowright: "right" };

/** The key an action answers to now (the player's choice, or the default). */
export const keyOf = (bindings: KeyBindings | undefined, action: KeyAction): string => bindings?.[action] ?? DEFAULT_BINDINGS[action];

/** The action a key stands for, or null. The arrows always move. */
export function actionOf(bindings: KeyBindings | undefined, key: string): KeyAction | null {
  const k = key.toLowerCase();
  if (ARROWS[k]) return ARROWS[k];
  for (const action of KEY_ACTIONS) if (keyOf(bindings, action) === k) return action;
  return null;
}

/** Whether a key can be given to an action. */
export const canBind = (key: string): boolean => {
  const k = key.toLowerCase();
  return k.length > 0 && !RESERVED.has(k) && !k.startsWith("f1") && !/^f\d+$/.test(k);
};

/** Gives `key` to `action`; the action that had it takes the old key in exchange, so no key does two things. */
export function rebind(bindings: KeyBindings | undefined, action: KeyAction, key: string): KeyBindings {
  const k = key.toLowerCase();
  if (!canBind(k)) return { ...bindings };
  const next: KeyBindings = { ...bindings };
  const previous = keyOf(next, action);
  const other = KEY_ACTIONS.find(a => a !== action && keyOf(next, a) === k);
  next[action] = k;
  if (other) next[other] = previous;
  return next;
}

/** A key as it is printed on a keycap: letters in capitals, the space bar and arrows by name or symbol. */
export function keyCap(key: string, space: string): string {
  const k = key.toLowerCase();
  if (k === " ") return space;
  const arrows: Record<string, string> = { arrowup: "↑", arrowdown: "↓", arrowleft: "←", arrowright: "→" };
  if (arrows[k]) return arrows[k];
  return k.length === 1 ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1);
}
