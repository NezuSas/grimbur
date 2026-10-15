import type { Direction, GameState } from '../engine/types';
import { stepTarget } from '../engine/travel';

/**
 * The joystick: the player puts a thumb anywhere in the control zone and slides it; the stick follows the thumb's travel.
 * Sliding to a side takes a step; holding repeats it. The rules live here (pure) so they can be tested.
 */

/** Fraction of the pad's radius the thumb must leave before a side is read (the dead zone in the middle). */
export const FLOATING_DEAD_ZONE = 0.28;
/** One axis must beat the other by this factor: a diagonal thumb picks nothing (and keeps the side it had). */
const DOMINANCE = 1.35;

/** First repeat after this long, then every REPEAT_MS: slow enough to read the board between steps. */
export const REPEAT_FIRST_MS = 380;
export const REPEAT_MS = 210;

/**
 * The side a thumb at (dx, dy) from the pad's centre points to, or null inside the dead zone.
 * In the ambiguous band between two sides it keeps `previous` (so the pad does not flicker), or reads nothing.
 */
export function floatingDirection(dx: number, dy: number, radius: number, previous: Direction | null = null): Direction | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < radius * FLOATING_DEAD_ZONE) return null;
  if (ax >= ay * DOMINANCE) return dx > 0 ? 'RIGHT' : 'LEFT';
  if (ay >= ax * DOMINANCE) return dy > 0 ? 'DOWN' : 'UP';
  return previous;
}

type StepState = Pick<GameState, 'playerIndex' | 'rows' | 'cols' | 'visited' | 'entityMap' | 'isGameOver' | 'isLevelUp' | 'pendingDraft'>;

/**
 * Whether a HELD pad may take another step. The first step of a press is always allowed (it is a plain tap); repeating
 * only walks over ground that is already explored and empty, so holding the pad can never carry the hero blindly into the
 * unknown, onto a pickup or onto a marked tile: it simply stops, and one more slide takes the next step by choice.
 */
export function canRepeatStep(state: StepState, direction: Direction, flagged: ReadonlySet<number>): boolean {
  if (state.isGameOver || state.isLevelUp || state.pendingDraft) return false;
  const target = stepTarget(state.playerIndex, direction, state.rows, state.cols);
  if (target === -1) return false;
  if (flagged.has(target)) return false;
  if (!state.visited.includes(target)) return false;
  if (state.entityMap[target]) return false;
  return true;
}
