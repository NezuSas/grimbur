import { gameReducer } from '../../src/core/engine/reducer';
import { getNearbyHazards } from '../../src/core/engine/proximity';
import { GameAction, GameState } from '../../src/core/engine/types';
import {
  TUTORIAL_BOARD,
  TUTORIAL_CLUE_TILE,
  TUTORIAL_GUARDIAN_INDEX,
  TUTORIAL_SAFE_CLUE_TILE,
  TUTORIAL_SHIELD_TILE,
  TUTORIAL_STEPS,
  TUTORIAL_VORTEX_CLUE_TILE,
  TUTORIAL_VORTEX_INDEX,
  advanceTutorial,
} from '../../src/core/tutorial/tutorial';
import { createState } from '../helpers/state';

const start = (): GameState =>
  createState({
    rows: TUTORIAL_BOARD.rows,
    cols: TUTORIAL_BOARD.cols,
    entities: [...TUTORIAL_BOARD.entities],
    coins: TUTORIAL_BOARD.coins,
    attack: TUTORIAL_BOARD.attack,
  });

const play = (state: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, state);
const right: GameAction = { type: 'MOVE', direction: 'RIGHT' };
const left: GameAction = { type: 'MOVE', direction: 'LEFT' };
const down: GameAction = { type: 'MOVE', direction: 'DOWN' };
const shoot: GameAction = { type: 'ATTACK' };

describe('tutorial board', () => {
  it('has the clue tile next to the guardian, straight ahead of a player walking right', () => {
    const state = start();
    const clue = getNearbyHazards(TUTORIAL_CLUE_TILE, state.rows, state.cols, state.entityMap);
    expect(clue.enemyCount).toBe(1);
    expect(TUTORIAL_GUARDIAN_INDEX).toBe(TUTORIAL_CLUE_TILE + 1);
  });

  it('teaches a real deduction: no clue at the scout tile, one vortex clue next to it', () => {
    const state = start();
    const scout = getNearbyHazards(TUTORIAL_SAFE_CLUE_TILE, state.rows, state.cols, state.entityMap);
    expect(scout.pitCount).toBe(0);
    expect(scout.enemyCount).toBe(0);
    const compare = getNearbyHazards(TUTORIAL_VORTEX_CLUE_TILE, state.rows, state.cols, state.entityMap);
    expect(compare.pitCount).toBe(1);
    // The shield rules out the only other candidate tile, so the vortex is deducible.
    expect(state.entityMap[TUTORIAL_SHIELD_TILE]?.type).toBe('shield');
    expect(state.entityMap[TUTORIAL_VORTEX_INDEX]?.type).toBe('pit');
  });

  it('starts on the first step', () => {
    expect(advanceTutorial(0, start())).toBe(0);
  });
});

describe('tutorial walkthrough with the real reducer', () => {
  it('follows the intended path: gem -> clue -> shoot -> scout -> compare -> shield -> mark -> last gem -> done', () => {
    let state = start();
    let step = 0;
    let flags: number[] = [];

    const act = (...actions: GameAction[]) => {
      state = play(state, ...actions);
      step = advanceTutorial(step, state, flags);
    };

    act(right, right); // collects the first gem
    expect(TUTORIAL_STEPS[step].id).toBe('clue');

    act(right); // steps onto the clue tile, facing the guardian
    expect(TUTORIAL_STEPS[step].id).toBe('shoot');
    expect(state.isGameOver).toBe(false);

    act(shoot); // kills the guardian
    expect(TUTORIAL_STEPS[step].id).toBe('scout');

    act(down); // the tile with no clue at all
    expect(state.playerIndex).toBe(TUTORIAL_SAFE_CLUE_TILE);
    expect(TUTORIAL_STEPS[step].id).toBe('compare');

    act(left); // the tile whose clue shows one vortex
    expect(state.playerIndex).toBe(TUTORIAL_VORTEX_CLUE_TILE);
    expect(TUTORIAL_STEPS[step].id).toBe('shield');

    act(left); // takes the shield, ruling that tile out
    expect(state.shield).toBe(true);
    expect(TUTORIAL_STEPS[step].id).toBe('mark');

    flags = [TUTORIAL_VORTEX_INDEX]; // the long-press the screen wires up
    step = advanceTutorial(step, state, flags);
    expect(TUTORIAL_STEPS[step].id).toBe('finish');

    act(right, right, down); // around the vortex to the last gem
    expect(state.isLevelUp).toBe(true);
    expect(TUTORIAL_STEPS[step].id).toBe('done');
  });

  it('finishes even when the floor is cleared out of order (no soft-lock)', () => {
    // Take the gem at tile 2, then reach the last gem without ever standing on the clue tile.
    let state = play(start(), right, right);
    expect(advanceTutorial(0, state)).toBeGreaterThan(0);
    const cleared = { ...state, isLevelUp: true };
    expect(advanceTutorial(1, cleared)).toBe(TUTORIAL_STEPS.length - 1);
    expect(advanceTutorial(0, cleared)).toBe(TUTORIAL_STEPS.length - 1);
  });

  it('never softlocks: the guardian is only dangerous if the player walks into it', () => {
    const state = play(start(), right, right, right, right);
    expect(state.isGameOver).toBe(true); // stepping onto the guardian is lethal, the screen restarts the tutorial
  });

  it('stepping into the tutorial vortex teleports instead of killing', () => {
    // From the spawn: down, down puts the hero at 12, one step left of the vortex at 14... walk right into it.
    let state = play(start(), down, down, right, right);
    expect(state.isGameOver).toBe(false);
    expect(state.wasTeleported || state.playerIndex !== TUTORIAL_VORTEX_INDEX).toBe(true);
  });

  it('arrows are effectively unlimited', () => {
    let state = start();
    for (let i = 0; i < 20; i++) state = gameReducer(state, shoot);
    expect(state.attack).toBeGreaterThan(0);
  });

  it('every step has a translation key and the last step never completes by itself', () => {
    expect(TUTORIAL_STEPS.every(s => s.textKey.startsWith('tutorial.'))).toBe(true);
    expect(TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1].isDone(start(), [])).toBe(false);
  });
});
