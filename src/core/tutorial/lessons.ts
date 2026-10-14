import { GameEntity, GameState } from '../engine/types';
import type { RelicId } from '../engine/relics';

/**
 * Optional lessons, one topic each, played on the real reducer (like the first tutorial in `tutorial.ts`).
 * A lesson starts from a hand-made state: a tiny board, or a draft / shop that is already open.
 */
export type LessonId = 'deduce' | 'relics' | 'shop' | 'tools';

export const LESSON_IDS: readonly LessonId[] = ['deduce', 'relics', 'shop', 'tools'];

/** Facts the screen knows that the game state does not (flags are the player's own marks). */
export interface LessonContext {
  flags: ReadonlySet<number>;
  /** The player pressed "descend" in the shop. */
  went: boolean;
}

export interface LessonStep {
  id: string;
  textKey: string;
  /** Tiles to highlight on the board while this step is active. */
  highlight: readonly number[];
  isDone(state: GameState, ctx: LessonContext): boolean;
}

export type LessonKind = 'board' | 'draft' | 'shop';

export interface LessonDef {
  id: LessonId;
  /** `board`: play on the grid. `draft` / `shop`: the real overlay is open on top of a cleared floor. */
  kind: LessonKind;
  board: { rows: number; cols: number; attack: number; coins: number; entities: GameEntity[] };
  /** Applied on top of the fresh board state. */
  patch: Partial<GameState>;
  steps: readonly LessonStep[];
}

const DONE: LessonStep = { id: 'done', textKey: '', highlight: [], isDone: () => false };

/** A pit at 8 touches 2, 7, 9 and 14: the clues on 2 and 7 meet only on 8.  (6 columns)
 *   0  1  2g 3  4  5
 *   6  7  8X 9  10 11
 *   12 13 14g 15 16 17 */
const DEDUCE_PIT = 8;
const DEDUCE_CLUE_TILE = 7;

/** A guardian at 2, two steps from the start: the detector sees it, the bomb needs the hero beside it. */
const TOOLS_GUARDIAN = 2;
const TOOLS_BOMB_TILE = 1;

const DRAFT_OFFER: RelicId[] = ['quiver', 'lucky_coin', 'glass_bow'];

const emptyBoard = { rows: 4, cols: 6, attack: 99, coins: 0, entities: [] as GameEntity[] };

export const LESSONS: Record<LessonId, LessonDef> = {
  deduce: {
    id: 'deduce',
    kind: 'board',
    board: {
      rows: 4,
      cols: 6,
      attack: 99,
      coins: 2,
      entities: [
        { index: 2, type: 'coin' },
        { index: DEDUCE_PIT, type: 'pit' },
        { index: 14, type: 'coin' },
      ],
    },
    patch: {},
    steps: [
      { id: 'explore', textKey: 'lesson.deduce.explore', highlight: [2], isDone: s => s.totalCoins >= 1 },
      { id: 'clue', textKey: 'lesson.deduce.clue', highlight: [DEDUCE_CLUE_TILE], isDone: s => s.visited.includes(DEDUCE_CLUE_TILE) },
      { id: 'flag', textKey: 'lesson.deduce.flag', highlight: [DEDUCE_PIT], isDone: (_s, c) => c.flags.has(DEDUCE_PIT) },
      { id: 'finish', textKey: 'lesson.deduce.finish', highlight: [14], isDone: s => s.isLevelUp },
      { ...DONE, textKey: 'lesson.deduce.done' },
    ],
  },
  relics: {
    id: 'relics',
    kind: 'draft',
    board: emptyBoard,
    patch: { isLevelUp: true, level: 2, pendingDraft: DRAFT_OFFER },
    steps: [
      { id: 'pick', textKey: 'lesson.relics.pick', highlight: [], isDone: s => s.relics.length > 0 },
      { ...DONE, textKey: 'lesson.relics.done' },
    ],
  },
  shop: {
    id: 'shop',
    kind: 'shop',
    board: emptyBoard,
    patch: { isLevelUp: true, gems: 12 },
    steps: [
      { id: 'buy', textKey: 'lesson.shop.buy', highlight: [], isDone: s => s.shield || s.altarUsed },
      { id: 'altar', textKey: 'lesson.shop.altar', highlight: [], isDone: s => s.altarUsed },
      { id: 'go', textKey: 'lesson.shop.go', highlight: [], isDone: (_s, c) => c.went },
      { ...DONE, textKey: 'lesson.shop.done' },
    ],
  },
  tools: {
    id: 'tools',
    kind: 'board',
    board: {
      rows: 4,
      cols: 6,
      attack: 99,
      coins: 1,
      entities: [
        { index: TOOLS_GUARDIAN, type: 'enemy' },
        { index: 3, type: 'coin' },
      ],
    },
    patch: { items: { detector: 1, bomb: 1 } },
    steps: [
      { id: 'detector', textKey: 'lesson.tools.detector', highlight: [], isDone: s => s.marked.length > 0 },
      { id: 'undo', textKey: 'lesson.tools.undo', highlight: [], isDone: s => s.undoUsed },
      { id: 'bomb', textKey: 'lesson.tools.bomb', highlight: [TOOLS_BOMB_TILE], isDone: s => !s.entityMap[TOOLS_GUARDIAN] },
      { id: 'finish', textKey: 'lesson.tools.finish', highlight: [3], isDone: s => s.isLevelUp },
      { ...DONE, textKey: 'lesson.tools.done' },
    ],
  },
};

/** Moves forward over every step the current state already satisfies. */
export function advanceLesson(lesson: LessonDef, stepIndex: number, state: GameState, ctx: LessonContext): number {
  const last = lesson.steps.length - 1;
  // A board lesson ends the moment the floor is cleared, whatever order the player took.
  if (lesson.kind === 'board' && state.isLevelUp) return last;
  let index = stepIndex;
  while (index < last && lesson.steps[index].isDone(state, ctx)) index++;
  return index;
}

/** The starting state of a lesson, from the state a fresh board produces. */
export const lessonState = (lesson: LessonDef, base: GameState): GameState => ({ ...base, ...lesson.patch });
