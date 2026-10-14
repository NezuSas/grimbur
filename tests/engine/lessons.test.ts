import { gameReducer } from '../../src/core/engine/reducer';
import { getNearbyHazards } from '../../src/core/engine/proximity';
import { GameAction, GameState } from '../../src/core/engine/types';
import { LESSONS, LESSON_IDS, LessonContext, LessonDef, advanceLesson, lessonState } from '../../src/core/tutorial/lessons';
import { createState } from '../helpers/state';

const begin = (lesson: LessonDef): GameState =>
  lessonState(
    lesson,
    createState({
      rows: lesson.board.rows,
      cols: lesson.board.cols,
      entities: [...lesson.board.entities],
      coins: lesson.board.coins,
      attack: lesson.board.attack,
    }),
  );

const play = (state: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, state);
const move = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'): GameAction => ({ type: 'MOVE', direction });
const noCtx: LessonContext = { flags: new Set(), went: false };

describe('lessons', () => {
  it('every lesson ends with a closing step and has text for each step', () => {
    for (const id of LESSON_IDS) {
      const steps = LESSONS[id].steps;
      expect(steps[steps.length - 1].id).toBe('done');
      expect(steps.every(s => s.textKey.startsWith(`lesson.${id}.`))).toBe(true);
    }
  });

  it('deduce: the clues on tiles 2 and 7 meet only on the hidden vortex', () => {
    const lesson = LESSONS.deduce;
    const s = begin(lesson);
    const touching = (tile: number) => getNearbyHazards(tile, s.rows, s.cols, s.entityMap).pitCount;
    expect(touching(2)).toBe(1);
    expect(touching(7)).toBe(1);
    expect(touching(14)).toBe(1);
    expect(touching(1)).toBe(0);
  });

  it('deduce: can be completed walking around the flagged vortex', () => {
    const lesson = LESSONS.deduce;
    let s = begin(lesson);
    let step = 0;
    let flags = new Set<number>();
    const advance = () => { step = advanceLesson(lesson, step, s, { flags, went: false }); };

    s = play(s, move('RIGHT'), move('RIGHT')); // the first gem
    advance();
    expect(lesson.steps[step].id).toBe('clue');
    s = play(s, move('LEFT'), move('DOWN')); // tile 7
    advance();
    expect(lesson.steps[step].id).toBe('flag');
    flags = new Set([8]);
    advance();
    expect(lesson.steps[step].id).toBe('finish');
    s = play(s, move('DOWN'), move('RIGHT')); // 13 then the gem on 14
    expect(s.isLevelUp).toBe(true);
    advance();
    expect(lesson.steps[step].id).toBe('done');
  });

  it('relics: picking one of the offered relics finishes the lesson, and the draft offers a cursed one', () => {
    const lesson = LESSONS.relics;
    const s = begin(lesson);
    expect(s.pendingDraft).toEqual(['quiver', 'lucky_coin', 'glass_bow']);
    expect(advanceLesson(lesson, 0, s, noCtx)).toBe(0);
    const picked = play(s, { type: 'PICK_RELIC', id: 'lucky_coin' });
    expect(advanceLesson(lesson, 0, picked, noCtx)).toBe(lesson.steps.length - 1);
  });

  it('shop: the shield and the altar can both be done with the starting gems, whatever is bought first', () => {
    const lesson = LESSONS.shop;
    let s = begin(lesson);
    s = play(s, { type: 'BUY', item: 'shield' });
    expect(advanceLesson(lesson, 0, s, noCtx)).toBe(1);
    s = play(s, { type: 'ALTAR' });
    expect(s.altarUsed).toBe(true);
    expect(advanceLesson(lesson, 1, s, noCtx)).toBe(2);
    expect(advanceLesson(lesson, 2, s, { ...noCtx, went: true })).toBe(3);
    // the lesson gems pay for the shield plus a detector and arrows, so nothing can strand it by buying first
    expect(begin(lesson).gems).toBeGreaterThanOrEqual(5);
  });

  it('tools: detector, undo, bomb and the last gem work in that order', () => {
    const lesson = LESSONS.tools;
    let s = begin(lesson);
    let step = 0;
    const advance = () => { step = advanceLesson(lesson, step, s, noCtx); };

    s = play(s, { type: 'USE_ITEM', item: 'detector' });
    expect(s.marked).toContain(2);
    advance();
    expect(lesson.steps[step].id).toBe('undo');

    s = play(s, move('RIGHT'));
    expect(s.undo).not.toBeNull();
    s = play(s, { type: 'UNDO' });
    expect(s.playerIndex).toBe(0);
    advance();
    expect(lesson.steps[step].id).toBe('bomb');

    s = play(s, move('RIGHT'), { type: 'USE_ITEM', item: 'bomb' });
    expect(s.entityMap[2]).toBeUndefined();
    advance();
    expect(lesson.steps[step].id).toBe('finish');

    s = play(s, move('RIGHT'), move('RIGHT'));
    expect(s.isLevelUp).toBe(true);
    advance();
    expect(lesson.steps[step].id).toBe('done');
  });
});
