import { GameEntity, GameState } from '../engine/types';

/**
 * The interactive tutorial is a fixed mini-floor played with the real reducer.
 * Each step completes from the game state (and the flags) alone, so the script stays pure and testable.
 *
 *   col:  0  1  2  3  4  5
 * row 0:  P  .  G  .  W  .      P = spawn, G = gem, W = guardian
 * row 1:  .  S  .  .  .  .      S = shield pickup
 * row 2:  .  .  V  G  .  .      V = vortex
 * row 3:  .  .  .  .  .  .
 *
 * The second half walks the player through the real deduction: the clue at 9 shows no vortex, the clue at 8
 * shows one, the shield at 7 rules that tile out, so the vortex can only be at 14 — mark it and go around.
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
    { index: 14, type: 'pit' },
    { index: 15, type: 'coin' },
  ] as GameEntity[],
} as const;

export const TUTORIAL_GUARDIAN_INDEX = 4;
export const TUTORIAL_CLUE_TILE = 3;
export const TUTORIAL_SAFE_CLUE_TILE = 9;
export const TUTORIAL_VORTEX_CLUE_TILE = 8;
export const TUTORIAL_SHIELD_TILE = 7;
export const TUTORIAL_VORTEX_INDEX = 14;

export type TutorialStepId = 'walk' | 'clue' | 'shoot' | 'scout' | 'compare' | 'shield' | 'mark' | 'finish' | 'done';

export interface TutorialStep {
  id: TutorialStepId;
  /** Translation key of the instruction shown to the player. */
  textKey: string;
  /** Tiles to highlight on the board while this step is active. */
  highlight: readonly number[];
  /** True once the player has completed the step. */
  isDone(state: GameState, flags: readonly number[]): boolean;
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
    id: 'scout',
    textKey: 'tutorial.scout',
    highlight: [TUTORIAL_SAFE_CLUE_TILE],
    isDone: s => s.playerIndex === TUTORIAL_SAFE_CLUE_TILE,
  },
  {
    id: 'compare',
    textKey: 'tutorial.compare',
    highlight: [TUTORIAL_VORTEX_CLUE_TILE],
    isDone: s => s.playerIndex === TUTORIAL_VORTEX_CLUE_TILE,
  },
  {
    id: 'shield',
    textKey: 'tutorial.shield',
    highlight: [TUTORIAL_SHIELD_TILE],
    isDone: s => s.playerIndex === TUTORIAL_SHIELD_TILE || s.shield,
  },
  {
    id: 'mark',
    textKey: 'tutorial.mark',
    highlight: [TUTORIAL_VORTEX_INDEX],
    isDone: (_s, flags) => flags.includes(TUTORIAL_VORTEX_INDEX),
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
export function advanceTutorial(stepIndex: number, state: GameState, flags: readonly number[] = []): number {
  // Clearing the floor in any order finishes the lesson (the reducer freezes input once cleared).
  if (state.isLevelUp) return TUTORIAL_STEPS.length - 1;
  let index = stepIndex;
  while (index < TUTORIAL_STEPS.length - 1 && TUTORIAL_STEPS[index].isDone(state, flags)) index++;
  return index;
}
