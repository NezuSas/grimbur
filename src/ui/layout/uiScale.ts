/** The scale for a menu screen on a window: 1 up to a large landscape phone, growing with the shorter side of a bigger window up to 1.8. */
export function uiScaleFor(width: number, height: number): number {
  const s = Math.min(width / 900, height / 520);
  return s <= 1.08 ? 1 : Math.min(1.8, s);
}
