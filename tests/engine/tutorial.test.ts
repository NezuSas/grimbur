import { gameReducer } from '../../src/core/engine/reducer';
import { getNearbyHazards } from '../../src/core/engine/proximity';
import { GameAction, GameState } from '../../src/core/engine/types';
import {
  TUTORIAL_BOARD,
  TUTORIAL_CLUE_TILE,
  TUTORIAL_GUARDIAN_INDEX,
  TUTORIAL_STEPS,
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
const down: GameAction = { type: 'MOVE', direction: 'DOWN' };
const shoot: GameAction = { type: 'ATTACK' };

describe('tutorial board', () => {
  it('has the clue tile next to the guardian, straight ahead of a player walking right', () => {
    const state = start();
    const clue = getNearbyHazards(TUTORIAL_CLUE_TILE, state.rows, state.cols, state.entityMap);
    expect(clue.enemyCount).toBe(1);
    expect(TUTORIAL_GUARDIAN_INDEX).toBe(TUTORIAL_CLUE_TILE + 1);
  });

  it('starts on the first step', () => {
    expect(advanceTutorial(0, start())).toBe(0);
  });
});

describe('tutorial walkthrough with the real reducer', () => {
  it('follows the intended path: gem -> clue -> shoot -> last gem -> done', () => {
    let state = start();
    let step = 0;
    const ids: string[] = [TUTORIAL_STEPS[step].id];

    const act = (...actions: GameAction[]) => {
      state = play(state, ...actions);
      step = advanceTutorial(step, state);
      ids.push(TUTORIAL_STEPS[step].id);
    };

    act(right, right); // collects the first gem
    expect(TUTORIAL_STEPS[step].id).toBe('clue');

    act(right); // steps onto the clue tile, facing the guardian
    expect(TUTORIAL_STEPS[step].id).toBe('shoot');
    expect(state.isGameOver).toBe(false);

    act(shoot); // kills the guardian
    expect(TUTORIAL_STEPS[step].id).toBe('finish');

    act(down, down); // (1,3) then (2,3): the last gem
    expect(state.isLevelUp).toBe(true);
    expect(TUTORIAL_STEPS[step].id).toBe('done');
  });

  it('never softlocks: the guardian is only dangerous if the player walks into it', () => {
    const state = play(start(), right, right, right, right);
    expect(state.isGameOver).toBe(true); // stepping onto the guardian is lethal, the screen restarts the tutorial
  });

  it('arrows are effectively unlimited', () => {
    let state = start();
    for (let i = 0; i < 20; i++) state = gameReducer(state, shoot);
    expect(state.attack).toBeGreaterThan(0);
  });

  it('every step has a translation key and the last step never completes by itself', () => {
    expect(TUTORIAL_STEPS.every(s => s.textKey.startsWith('tutorial.'))).toBe(true);
    expect(TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1].isDone(start())).toBe(false);
  });
});
