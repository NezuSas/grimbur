import type { Direction } from '../engine/types';

/** Finger travel (dp) that counts as a swipe rather than a tap. */
export const SWIPE_MIN_DISTANCE = 28;
/** Travel below this is a tap; in between the touch is ignored (an unsure gesture must never move the hero). */
export const TAP_MAX_DISTANCE = 12;
/** The dominant axis must beat the other by this factor, so diagonal smears do nothing. */
const AXIS_DOMINANCE = 1.4;

export type Gesture = { kind: 'swipe'; direction: Direction } | { kind: 'tap' } | { kind: 'none' };

/** Classifies a finished touch from how far the finger travelled. */
export function classifyGesture(dx: number, dy: number, minSwipe = SWIPE_MIN_DISTANCE): Gesture {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const longest = Math.max(ax, ay);
  if (longest <= TAP_MAX_DISTANCE) return { kind: 'tap' };
  if (longest < minSwipe) return { kind: 'none' };
  if (ax >= ay * AXIS_DOMINANCE) return { kind: 'swipe', direction: dx > 0 ? 'RIGHT' : 'LEFT' };
  if (ay >= ax * AXIS_DOMINANCE) return { kind: 'swipe', direction: dy > 0 ? 'DOWN' : 'UP' };
  return { kind: 'none' };
}

/** Shortest drag (dp) from the attack button that aims a shot. */
export const AIM_MIN_DISTANCE = 22;

/**
 * Direction of a drag that starts on the attack button, or null while the finger has barely moved.
 * More forgiving than a movement swipe: the dominant axis always wins, because aiming should never be refused.
 */
export function aimFromDrag(dx: number, dy: number, minDistance = AIM_MIN_DISTANCE): Direction | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < minDistance) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'RIGHT' : 'LEFT';
  return dy > 0 ? 'DOWN' : 'UP';
}
