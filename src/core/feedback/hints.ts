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
  /** What this floor holds that the player may not know yet (see `floorNovelties`). */
  novelties?: readonly FloorNovelty[];
}

/** Things a floor can hold that change how it is played: each one is explained the first time it is met. */
export type FloorNovelty = 'lieutenant' | 'mimic' | 'dark' | 'thief' | 'elite' | 'chest' | 'sleeper' | 'stalker' | 'secret';

export type HintId = 'ability' | 'undo' | 'detector' | 'bomb' | 'clues' | 'travel' | 'flag' | 'aim' | FloorNovelty;

/** The order novelties are explained in when a floor holds several: what can kill first. */
const NOVELTY_ORDER: readonly FloorNovelty[] = ['lieutenant', 'mimic', 'dark', 'stalker', 'sleeper', 'thief', 'elite', 'chest', 'secret'];

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
  // Something new on this floor: explained before the tools, since it can change what the next step should be.
  for (const n of NOVELTY_ORDER) if (facts.novelties?.includes(n) && unseen(n)) return n;
  if (facts.canUndo && unseen('undo')) return 'undo';
  if (facts.detector > 0 && unseen('detector')) return 'detector';
  if (facts.bomb > 0 && unseen('bomb')) return 'bomb';
  if (facts.explored >= 4 && unseen('travel')) return 'travel';
  if (facts.explored >= 6 && unseen('flag')) return 'flag';
  if (facts.arrows > 0 && facts.explored >= 8 && unseen('aim')) return 'aim';
  return null;
}

/** The novelties of a floor, read from what it holds (the mimic is hidden, but the floor announces it holds one). */
export function floorNovelties(s: { entities: readonly { type: string; mini?: boolean; index?: number }[]; omen?: string | null; visited?: readonly number[]; cols?: number; rows?: number }): FloorNovelty[] {
  const out: FloorNovelty[] = [];
  const has = (type: string) => s.entities.some(e => e.type === type);
  if (s.entities.some(e => e.type === 'boss' && e.mini)) out.push('lieutenant');
  if (has('mimic')) out.push('mimic');
  if (s.omen === 'dark') out.push('dark');
  if (has('stalker')) out.push('stalker');
  if (has('sleeper')) out.push('sleeper');
  if (has('thief')) out.push('thief');
  if (s.omen === 'elite') out.push('elite');
  if (has('chest')) out.push('chest');
  // A secret room is explained once its glint shows (an explored tile beside it), not before: there is nothing to see yet.
  if (s.visited && s.cols && s.rows) {
    const seen = new Set(s.visited);
    const { cols, rows } = s;
    const glints = s.entities.some(e => {
      if (e.type !== 'secret' || e.index === undefined) return false;
      const r = Math.floor(e.index / cols);
      const c = e.index % cols;
      return (r > 0 && seen.has(e.index - cols)) || (r < rows - 1 && seen.has(e.index + cols)) || (c > 0 && seen.has(e.index - 1)) || (c < cols - 1 && seen.has(e.index + 1));
    });
    if (glints) out.push('secret');
  }
  return out;
}
