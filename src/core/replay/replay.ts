/**
 * Basic in-memory action recorder for debugging and replay.
 */
export const actionHistory: any[] = [];

export function recordAction(action: any) {
  actionHistory.push({
    ...action,
    timestamp: Date.now(),
  });
}

export function getActionHistory() {
  return [...actionHistory];
}

export function clearActionHistory() {
  actionHistory.length = 0;
}
