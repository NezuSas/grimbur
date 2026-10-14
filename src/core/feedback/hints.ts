export interface HintFacts {
  turn: number;
  ability: string | null;
  canUndo: boolean;
  detector: number;
  bomb: number;
  /** An explored tile shows a clue (echo icon) on the board. */
  cluesShown: boolean;
  /** Tiles explored on this floor. */
  explored: number;
  arrows: number;
}

export type HintId = 'ability' | 'undo' | 'detector' | 'bomb' | 'clues' | 'travel' | 'flag' | 'aim';

/**
 * The next first-time hint to show, or null. A hint is returned until it is marked seen, in priority order, so the
 * caller shows one at a time and never repeats it. The control hints (travel, flag, aim) wait until the player
 * has explored a bit.
 */
export function nextHint(facts: HintFacts, seen: readonly string[]): HintId | null {
  const unseen = (id: HintId) => !seen.includes(id);
  if (facts.turn === 0) return null;
  if (facts.ability && unseen('ability')) return 'ability';
  if (facts.cluesShown && unseen('clues')) return 'clues';
  if (facts.canUndo && unseen('undo')) return 'undo';
  if (facts.detector > 0 && unseen('detector')) return 'detector';
  if (facts.bomb > 0 && unseen('bomb')) return 'bomb';
  if (facts.explored >= 4 && unseen('travel')) return 'travel';
  if (facts.explored >= 6 && unseen('flag')) return 'flag';
  if (facts.arrows > 0 && facts.explored >= 8 && unseen('aim')) return 'aim';
  return null;
}
