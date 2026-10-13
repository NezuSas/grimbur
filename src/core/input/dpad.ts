import type { Direction } from '../engine/types';

/**
 * Reads a touch on a round direction pad. The pad is one disc, so a thumb that drifts a little still
 * lands on the intended arrow: the disc is split into four quadrants along its diagonals.
 *
 * `x` and `y` are measured from the disc's top-left corner. Touches in the dead centre (where the attack
 * button sits, or where a thumb rests) and outside the disc return null.
 */
export function dpadDirection(x: number, y: number, diameter: number, deadZone = 0.22): Direction | null {
  const radius = diameter / 2;
  const dx = x - radius;
  const dy = y - radius;
  const distance = Math.hypot(dx, dy);
  if (distance > radius || distance < radius * deadZone) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'RIGHT' : 'LEFT';
  return dy > 0 ? 'DOWN' : 'UP';
}
