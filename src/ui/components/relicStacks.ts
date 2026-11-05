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
  const room = Math.max(0, max - 1);
  return { shown: stacks.slice(stacks.length - room), hidden: stacks.length - room };
};

const TRAY_PAD = 5;
const TRAY_GAP = 4;

/**
 * How many tiles of `size` a tray can show in a box of `width` x `height` (its padding and gaps paid), at least one (the
 * "+N" chip alone), so the tray never spills over the buttons under it on a short phone.
 */
export const trayCapacity = (width: number, height: number, size: number): number => {
  const fit = (room: number) => Math.floor((room - TRAY_PAD * 2 + TRAY_GAP) / (size + TRAY_GAP));
  return Math.max(1, Math.max(1, fit(width)) * Math.max(1, fit(height)));
};
