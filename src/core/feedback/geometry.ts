export interface BoardLayout {
  /** Screen position of the board's top-left corner. */
  originX: number;
  originY: number;
  tileSize: number;
  cols: number;
}

/** Screen coordinates of the centre of a board tile. */
export function tileCenter(index: number, layout: BoardLayout): { x: number; y: number } {
  const row = Math.floor(index / layout.cols);
  const col = index % layout.cols;
  return {
    x: layout.originX + (col + 0.5) * layout.tileSize,
    y: layout.originY + (row + 0.5) * layout.tileSize,
  };
}

/** Vertical offset of the nth popup stacked on the same spot (0 = the newest, at the bottom). */
export const popupStackOffset = (slot: number, step = 22): number => -Math.max(0, slot) * step;
