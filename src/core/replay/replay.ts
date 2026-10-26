/**
 * Basic in-memory action recorder for debugging (inspect `actionHistory` from the debugger).
 * Production builds record nothing: nobody reads the history there, so the per-action cost would be waste.
 */
/** Oldest entries are dropped so a long session cannot grow memory without bound. */
const MAX_HISTORY = 2000;

type RecordedAction = { type: string; timestamp: number } & Record<string, unknown>;

export const actionHistory: RecordedAction[] = [];

export function recordAction(action: { type: string }) {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  actionHistory.push({ ...action, timestamp: Date.now() });
  if (actionHistory.length > MAX_HISTORY) {
    actionHistory.splice(0, actionHistory.length - MAX_HISTORY);
  }
}

export function getActionHistory() {
  return [...actionHistory];
}

export function clearActionHistory() {
  actionHistory.length = 0;
}
