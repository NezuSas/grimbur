import { FLOATING_DEAD_ZONE, FLOATING_STAY_ZONE, MIN_STEP_GAP_MS, REPEAT_FIRST_MS, REPEAT_MS, REVERSE_STEP_GAP_MS, canRepeatStep, floatingDirection, stepWait } from '../../src/core/input/floatingPad';
import { initialState } from '../../src/core/engine/reducer';
import type { GameState } from '../../src/core/engine/types';

describe('floatingDirection', () => {
  const R = 60;
  const far = R * 0.8;

  it('reads nothing inside the dead zone', () => {
    const inside = R * FLOATING_DEAD_ZONE - 1;
    expect(floatingDirection(0, 0, R)).toBeNull();
    expect(floatingDirection(inside, -inside, R)).toBeNull();
  });

  it('reads the four sides', () => {
    expect(floatingDirection(far, 3, R)).toBe('RIGHT');
    expect(floatingDirection(-far, -3, R)).toBe('LEFT');
    expect(floatingDirection(2, far, R)).toBe('DOWN');
    expect(floatingDirection(-2, -far, R)).toBe('UP');
  });

  it('does nothing on a clean diagonal, and keeps the side it already had', () => {
    expect(floatingDirection(far, far, R)).toBeNull();
    expect(floatingDirection(far, far, R, 'RIGHT')).toBe('RIGHT');
    expect(floatingDirection(-far, far * 0.95, R, 'DOWN')).toBe('DOWN');
  });

  it('lets go of the side when the thumb comes back to the middle', () => {
    expect(floatingDirection(2, 2, R, 'RIGHT')).toBeNull();
  });

  it('repeats at a pace a player can follow', () => {
    expect(REPEAT_FIRST_MS).toBeGreaterThan(REPEAT_MS);
    expect(REPEAT_MS).toBeGreaterThanOrEqual(150);
  });
});

describe('hysteresis: a thumb resting near the edge does not flicker', () => {
  const R = 60;
  it('needs more travel to enter a side than to stay in it', () => {
    const between = R * ((FLOATING_DEAD_ZONE + FLOATING_STAY_ZONE) / 2);
    expect(floatingDirection(between, 0, R, null)).toBeNull(); // not enough to start a step
    expect(floatingDirection(between, 0, R, 'RIGHT')).toBe('RIGHT'); // enough to keep holding it
  });
});

describe('stepWait: steps are decisions, not reflexes', () => {
  it('lets the first step go at once', () => {
    expect(stepWait(10_000, { at: 0, dir: null }, 'RIGHT')).toBe(0);
  });

  it('makes a quick second step wait for the pace limit', () => {
    expect(stepWait(1_100, { at: 1_000, dir: 'RIGHT' }, 'RIGHT')).toBe(MIN_STEP_GAP_MS - 100);
    expect(stepWait(1_100, { at: 1_000, dir: 'RIGHT' }, 'UP')).toBe(MIN_STEP_GAP_MS - 100);
    expect(stepWait(1_000 + MIN_STEP_GAP_MS, { at: 1_000, dir: 'RIGHT' }, 'UP')).toBe(0);
  });

  it('makes a step straight back wait longer (wiggling the stick)', () => {
    expect(REVERSE_STEP_GAP_MS).toBeGreaterThan(MIN_STEP_GAP_MS);
    expect(stepWait(1_100, { at: 1_000, dir: 'RIGHT' }, 'LEFT')).toBe(REVERSE_STEP_GAP_MS - 100);
    expect(stepWait(1_000 + MIN_STEP_GAP_MS, { at: 1_000, dir: 'RIGHT' }, 'LEFT')).toBeGreaterThan(0);
  });

  it('never lets a wiggling stick go faster than the pace limit', () => {
    // The thumb alternates RIGHT / LEFT, holding each side for 120 ms. As in the game, a step happens when its wait is over
    // only if the thumb is still on that side by then; otherwise the flick is dropped.
    const HOLD = 120;
    const last: { at: number; dir: 'LEFT' | 'RIGHT' | null } = { at: -10_000, dir: null };
    const steps: { at: number; dir: 'LEFT' | 'RIGHT' }[] = [];
    let dir: 'LEFT' | 'RIGHT' = 'RIGHT';
    for (let t = 0; t < 2_000; t += HOLD) {
      const wait = stepWait(t, last, dir);
      if (wait < HOLD) {
        const at = t + wait;
        steps.push({ at, dir });
        last.at = at;
        last.dir = dir;
      }
      dir = dir === 'RIGHT' ? 'LEFT' : 'RIGHT';
    }
    for (let i = 1; i < steps.length; i++) {
      const gap = steps[i].at - steps[i - 1].at;
      expect(gap).toBeGreaterThanOrEqual(steps[i].dir !== steps[i - 1].dir ? REVERSE_STEP_GAP_MS : MIN_STEP_GAP_MS);
    }
    expect(steps.length).toBeLessThanOrEqual(Math.ceil(2_000 / MIN_STEP_GAP_MS)); // an unrestricted stick would take 16
  });
});

describe('canRepeatStep: holding the pad never walks blindly', () => {
  // 5x5 board, hero on tile 12 (the centre); tile 13 (right) explored, tile 11 (left) explored, tile 7 (up) not explored.
  const board = (over: Partial<GameState> = {}): GameState => ({
    ...initialState,
    rows: 5,
    cols: 5,
    playerIndex: 12,
    visited: [12, 13, 11, 17],
    entityMap: {},
    entities: [],
    isGameOver: false,
    isLevelUp: false,
    pendingDraft: null,
    ...over,
  });
  const none = new Set<number>();

  it('walks over explored, empty ground', () => {
    expect(canRepeatStep(board(), 'RIGHT', none)).toBe(true);
    expect(canRepeatStep(board(), 'LEFT', none)).toBe(true);
    expect(canRepeatStep(board(), 'DOWN', none)).toBe(true);
  });

  it('stops before unexplored tiles', () => {
    expect(canRepeatStep(board(), 'UP', none)).toBe(false);
  });

  it('stops before the edge of the board', () => {
    expect(canRepeatStep(board({ playerIndex: 14, visited: [14, 13] }), 'RIGHT', none)).toBe(false);
  });

  it('stops before a marked tile and before anything left on a tile', () => {
    expect(canRepeatStep(board(), 'RIGHT', new Set([13]))).toBe(false);
    expect(canRepeatStep(board({ entityMap: { 13: { type: 'coin' } as any } }), 'RIGHT', none)).toBe(false);
  });

  it('stops when the run is over or a choice is pending', () => {
    expect(canRepeatStep(board({ isGameOver: true }), 'RIGHT', none)).toBe(false);
    expect(canRepeatStep(board({ isLevelUp: true }), 'RIGHT', none)).toBe(false);
  });
});
