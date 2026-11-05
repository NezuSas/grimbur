import type { RelicId } from '../../core/engine/relics';

/** Collapses duplicates into stacks, in the order they were first picked. */
export const relicStacks = (relics: readonly RelicId[]): [RelicId, number][] => {
  const counts = new Map<RelicId, number>();
  for (const id of relics) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()];
};

/**
 * The stacks a tray of `max` tiles shows and how many hide behind its "+N" chip: the newest ones show (the last tile is the
 * chip), so a long run never buries the board in icons.
 */
export const trayView = (stacks: readonly [RelicId, number][], max?: number) => {
  if (!max || stacks.length <= max) return { shown: stacks, hidden: 0 };
  const room = Math.max(1, max - 1);
  return { shown: stacks.slice(stacks.length - room), hidden: stacks.length - room };
};
