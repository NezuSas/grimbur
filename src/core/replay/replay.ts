/**
 * Basic in-memory action recorder for debugging and replay.
 */
/** Oldest entries are dropped so a long session cannot grow memory without bound. */
const MAX_HISTORY = 2000;

export const actionHistory: any[] = [];

export function recordAction(action: any) {
  actionHistory.push({
    ...action,
    timestamp: Date.now(),
  });
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
