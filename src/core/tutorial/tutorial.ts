import { GameEntity, GameState } from '../engine/types';

/**
 * The interactive tutorial is a fixed mini-floor played with the real reducer.
 * Each step completes from the game state alone, so the script stays pure and testable.
 *
 *   col:  0  1  2  3  4  5
 * row 0:  P  .  G  .  W  .      P = spawn, G = gem, W = guardian
 * row 1:  .  S  .  .  .  .      S = shield pickup
 * row 2:  .  .  .  G  .  .
 * row 3:  .  .  .  .  .  .
 */
export const TUTORIAL_BOARD = {
  rows: 4,
  cols: 6,
  /** Plenty of arrows: the tutorial teaches aiming, it should not punish misses. */
  attack: 99,
  coins: 2,
  entities: [
    { index: 2, type: 'coin' },
    { index: 4, type: 'enemy' },
    { index: 7, type: 'shield' },
    { index: 15, type: 'coin' },
  ] as GameEntity[],
} as const;

export const TUTORIAL_GUARDIAN_INDEX = 4;
export const TUTORIAL_CLUE_TILE = 3;

export type TutorialStepId = 'walk' | 'clue' | 'shoot' | 'finish' | 'done';

export interface TutorialStep {
  id: TutorialStepId;
  /** Translation key of the instruction shown to the player. */
  textKey: string;
  /** Tiles to highlight on the board while this step is active. */
  highlight: readonly number[];
  /** True once the player has completed the step. */
  isDone(state: GameState): boolean;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'walk',
    textKey: 'tutorial.walk',
    highlight: [2],
    isDone: s => s.totalCoins >= 1,
  },
  {
    id: 'clue',
    textKey: 'tutorial.clue',
    highlight: [TUTORIAL_CLUE_TILE],
    isDone: s => s.playerIndex === TUTORIAL_CLUE_TILE,
  },
  {
    id: 'shoot',
    textKey: 'tutorial.shoot',
    highlight: [TUTORIAL_GUARDIAN_INDEX],
    isDone: s => !s.entityMap[TUTORIAL_GUARDIAN_INDEX],
  },
  {
    id: 'finish',
    textKey: 'tutorial.finish',
    highlight: [15],
    isDone: s => s.isLevelUp,
  },
  {
    id: 'done',
    textKey: 'tutorial.done',
    highlight: [],
    isDone: () => false,
  },
];

/** Moves forward over every step the current state already satisfies. */
export function advanceTutorial(stepIndex: number, state: GameState): number {
  let index = stepIndex;
  while (index < TUTORIAL_STEPS.length - 1 && TUTORIAL_STEPS[index].isDone(state)) index++;
  return index;
}
