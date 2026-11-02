/** The scale for a menu screen on a window: 1 up to a large landscape phone, growing with the shorter side of a bigger window up to 2.2 (a full-HD desktop browser draws a phone-sized layout about twice as big). */
export function uiScaleFor(width: number, height: number): number {
  const s = Math.min(width / 900, height / 520);
  return s <= 1.08 ? 1 : Math.min(2.2, s);
}
