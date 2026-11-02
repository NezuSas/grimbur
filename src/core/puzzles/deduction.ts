import { isClueHazard, type GameEntity } from '../engine/types';

/**
 * Deduction for the cave's puzzles, in levels of reasoning, so a board can be rated by the deepest thought it demands:
 *  1. one clue at a time, counting dangers of any kind ("nothing here", "all its dangers are placed", "only these are left");
 *  2. one clue, guardians and vortices apart (a tile can be ruled out as a guardian by one clue and as a vortex by another);
 *  3. two clues side by side: what one has more than the other lies on the tiles only it touches;
 *  4. everything at once: every way the hidden dangers around the explored tiles can lie is tried, and a tile safe in all is safe.
 * A tile's knowledge is the set of things it may still be: safe, a guardian, a vortex.
 */
export const SAFE = 1;
export const GUARDIAN = 2;
export const VORTEX = 4;
const DANGER = GUARDIAN | VORTEX;
const ALL = SAFE | GUARDIAN | VORTEX;

export type DeductionLevel = 1 | 2 | 3 | 4;

export interface DeductionReport {
  solvable: boolean;
  /** The deepest level the board needed (0 when nothing beyond walking was needed). */
  level: number;
  /** How many times each level had to be used, levels 1..4. */
  uses: [number, number, number, number];
  /** Uses of levels 3 and 4: the moments a player has to really think. */
  hard: number;
  /** Tiles explored when the last gem is reached. */
  explored: number;
}

interface Board {
  rows: number;
  cols: number;
  nb: number[][];
  guardians: Int8Array;
  vortices: Int8Array;
}

const NODE_CAP = 250_000;

function boardOf(rows: number, cols: number, entities: readonly GameEntity[]): { board: Board; gems: number[] } {
  const cells = rows * cols;
  const nb: number[][] = [];
  for (let i = 0; i < cells; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const out: number[] = [];
    if (r > 0) out.push(i - cols);
    if (r < rows - 1) out.push(i + cols);
    if (c > 0) out.push(i - 1);
    if (c < cols - 1) out.push(i + 1);
    nb.push(out);
  }
  const kind = new Int8Array(cells);
  const gems: number[] = [];
  for (const e of entities) {
    if (e.type === 'coin') gems.push(e.index);
    else if (isClueHazard(e.type)) kind[e.index] = e.type === 'pit' ? VORTEX : GUARDIAN;
  }
  const guardians = new Int8Array(cells);
  const vortices = new Int8Array(cells);
  for (let i = 0; i < cells; i++) {
    for (const n of nb[i]) {
      if (kind[n] === VORTEX) vortices[i]++;
      else if (kind[n] === GUARDIAN) guardians[i]++;
    }
  }
  return { board: { rows, cols, nb, guardians, vortices }, gems };
}

/** What the player knows: a mask per tile, and which tiles are explored. */
class Knowledge {
  mask: Uint8Array;
  seen: Uint8Array;
  constructor(
    readonly b: Board,
    visited: readonly number[],
    known: readonly number[],
  ) {
    const cells = b.rows * b.cols;
    this.mask = new Uint8Array(cells).fill(ALL);
    this.seen = new Uint8Array(cells);
    for (const k of known) this.mask[k] = SAFE;
    for (const v of visited) {
      this.mask[v] = SAFE;
      this.seen[v] = 1;
    }
  }

  /** Walks onto every tile proven safe next to the explored ones; true when the explored part grew. */
  walk(): boolean {
    const queue: number[] = [];
    for (let i = 0; i < this.seen.length; i++) if (this.seen[i]) queue.push(i);
    let grew = false;
    for (let h = 0; h < queue.length; h++) {
      for (const n of this.b.nb[queue[h]]) {
        if (this.seen[n] || this.mask[n] !== SAFE) continue;
        this.seen[n] = 1;
        queue.push(n);
        grew = true;
      }
    }
    return grew;
  }

  private set(i: number, m: number): boolean {
    const next = this.mask[i] & m;
    if (next === this.mask[i] || next === 0) return false;
    this.mask[i] = next;
    return true;
  }

  /** The explored tiles that still have something unknown around them. */
  private clues(): number[] {
    const out: number[] = [];
    for (let v = 0; v < this.seen.length; v++) if (this.seen[v] && this.b.nb[v].some(n => !this.seen[n] && !isSingle(this.mask[n]))) out.push(v);
    return out;
  }

  /** Level 1: one clue, all dangers alike. */
  level1(): boolean {
    let changed = false;
    for (let again = true; again; ) {
      again = false;
      for (const v of this.clues()) {
        const around = this.b.nb[v].filter(n => !this.seen[n]);
        const placed = around.filter(n => !(this.mask[n] & SAFE)).length;
        const open = around.filter(n => this.mask[n] & SAFE && this.mask[n] & DANGER);
        if (open.length === 0) continue;
        const left = this.b.guardians[v] + this.b.vortices[v] - placed;
        if (left === 0) for (const n of open) again = this.set(n, SAFE) || again;
        else if (left === open.length) for (const n of open) again = this.set(n, DANGER) || again;
      }
      changed = changed || again;
    }
    return changed;
  }

  /** Level 2: one clue, guardians and vortices counted apart. */
  level2(): boolean {
    let changed = false;
    for (const v of this.clues()) {
      for (const [type, count] of [[GUARDIAN, this.b.guardians[v]], [VORTEX, this.b.vortices[v]]] as const) {
        const around = this.b.nb[v].filter(n => !this.seen[n]);
        const sure = around.filter(n => this.mask[n] === type).length;
        const maybe = around.filter(n => this.mask[n] & type && this.mask[n] !== type);
        if (maybe.length === 0) continue;
        const left = count - sure;
        if (left === 0) for (const n of maybe) changed = this.set(n, ALL & ~type) || changed;
        else if (left === maybe.length) for (const n of maybe) changed = this.set(n, type) || changed;
      }
    }
    return changed;
  }

  /** Level 3: two clues compared, for all dangers and for each kind apart. */
  level3(): boolean {
    type Rule = { tiles: number[]; left: number; yes: number; no: number };
    const rules: Rule[][] = [[], [], []];
    for (const v of this.clues()) {
      const around = this.b.nb[v].filter(n => !this.seen[n]);
      const anyOpen = around.filter(n => this.mask[n] & SAFE && this.mask[n] & DANGER);
      const placed = around.filter(n => !(this.mask[n] & SAFE)).length;
      if (anyOpen.length) rules[0].push({ tiles: anyOpen, left: this.b.guardians[v] + this.b.vortices[v] - placed, yes: DANGER, no: SAFE });
      for (const [k, type, count] of [[1, GUARDIAN, this.b.guardians[v]], [2, VORTEX, this.b.vortices[v]]] as const) {
        const maybe = around.filter(n => this.mask[n] & type && this.mask[n] !== type);
        if (maybe.length) rules[k].push({ tiles: maybe, left: count - around.filter(n => this.mask[n] === type).length, yes: type, no: ALL & ~type });
      }
    }
    let changed = false;
    for (const list of rules) {
      for (let a = 0; a < list.length; a++) {
        for (let b = 0; b < list.length; b++) {
          if (a === b) continue;
          const A = list[a];
          const B = list[b];
          if (!A.tiles.some(t => B.tiles.includes(t))) continue;
          const onlyA = A.tiles.filter(t => !B.tiles.includes(t));
          const onlyB = B.tiles.filter(t => !A.tiles.includes(t));
          // B holds `B.left - A.left` more than A can give it: if that is all of B's own tiles, they are all "yes", A's own all "no".
          if (onlyB.length > 0 && B.left - A.left === onlyB.length) {
            for (const t of onlyB) changed = this.set(t, A.yes) || changed;
            for (const t of onlyA) changed = this.set(t, A.no) || changed;
          }
        }
      }
    }
    return changed;
  }

  /** Level 4: every way the dangers around the explored tiles can lie. False when nothing new (or too many ways to try). */
  level4(): boolean {
    const clues = this.clues();
    const vars: number[] = [];
    const isVar = new Map<number, number>();
    for (const v of clues) for (const n of this.b.nb[v]) if (!this.seen[n] && !isVar.has(n) && !isSingle(this.mask[n])) {
      isVar.set(n, vars.length);
      vars.push(n);
    }
    if (vars.length === 0) return false;
    const cons = clues.map(v => ({ v, tiles: this.b.nb[v].filter(n => !this.seen[n]) }));
    const touching: number[][] = vars.map(() => []);
    cons.forEach((c, ci) => c.tiles.forEach(t => isVar.has(t) && touching[isVar.get(t)!].push(ci)));
    const value = new Uint8Array(vars.length);
    const seenMask = new Uint8Array(vars.length);
    let nodes = 0;
    let aborted = false;
    const fits = (ci: number, done: boolean): boolean => {
      const c = cons[ci];
      let g = 0;
      let p = 0;
      let openG = 0;
      let openP = 0;
      for (const t of c.tiles) {
        const k = isVar.get(t);
        const m = k === undefined ? this.mask[t] : value[k] || this.mask[t];
        if (k !== undefined && !value[k]) {
          if (m & GUARDIAN) openG++;
          if (m & VORTEX) openP++;
        } else if (m === GUARDIAN) g++;
        else if (m === VORTEX) p++;
      }
      const G = this.b.guardians[c.v];
      const P = this.b.vortices[c.v];
      if (g > G || p > P) return false;
      if (g + openG < G || p + openP < P) return false;
      return !done || (g === G && p === P);
    };
    const order = vars.map((_, k) => k);
    const go = (depth: number): void => {
      if (aborted) return;
      if (++nodes > NODE_CAP) {
        aborted = true;
        return;
      }
      if (depth === order.length) {
        for (let k = 0; k < vars.length; k++) seenMask[k] |= value[k];
        return;
      }
      const k = order[depth];
      for (const bit of [SAFE, GUARDIAN, VORTEX]) {
        if (!(this.mask[vars[k]] & bit)) continue;
        value[k] = bit;
        if (touching[k].every(ci => fits(ci, false))) go(depth + 1);
        value[k] = 0;
        if (aborted) return;
      }
    };
    go(0);
    if (aborted) return false;
    let changed = false;
    for (let k = 0; k < vars.length; k++) if (seenMask[k]) changed = this.set(vars[k], seenMask[k]) || changed;
    return changed;
  }
}

const isSingle = (m: number) => m === SAFE || m === GUARDIAN || m === VORTEX;

/** Rates a board: can it be solved by deduction alone, and how deep must the reasoning go. */
export function rateDeduction(rows: number, cols: number, entities: readonly GameEntity[], visited: readonly number[]): DeductionReport {
  const { board, gems } = boardOf(rows, cols, entities);
  const k = new Knowledge(board, visited, gems);
  const uses: [number, number, number, number] = [0, 0, 0, 0];
  for (let guard = 0; guard < 400; guard++) {
    k.walk();
    const explored = k.seen.reduce((a, s) => a + s, 0);
    if (gems.every(g => k.seen[g])) {
      const level = uses[3] ? 4 : uses[2] ? 3 : uses[1] ? 2 : uses[0] ? 1 : 0;
      return { solvable: true, level, uses, hard: uses[2] + uses[3], explored };
    }
    if (k.level1()) uses[0]++;
    else if (k.level2()) uses[1]++;
    else if (k.level3()) uses[2]++;
    else if (k.level4()) uses[3]++;
    else return { solvable: false, level: -1, uses, hard: uses[2] + uses[3], explored };
  }
  return { solvable: false, level: -1, uses, hard: 0, explored: 0 };
}

/**
 * Everything a perfect reader can prove from the explored tiles right now (all four levels), and for each tile proven safe the
 * shallowest level that proves it. Puzzles use it for the hint, so a hint always exists while a board is solvable.
 */
export function provenByLevel(rows: number, cols: number, entities: readonly GameEntity[], visited: readonly number[]): { safe: Map<number, DeductionLevel>; danger: Set<number> } {
  const { board, gems } = boardOf(rows, cols, entities);
  const k = new Knowledge(board, visited, gems);
  const safe = new Map<number, DeductionLevel>();
  const note = (level: DeductionLevel) => {
    for (let i = 0; i < k.mask.length; i++) if (!k.seen[i] && k.mask[i] === SAFE && !safe.has(i)) safe.set(i, level);
  };
  note(1);
  // Without walking: only what the clues on screen prove, level by level, each to its end.
  for (let changed = true; changed; ) {
    changed = false;
    if (k.level1()) note(1), (changed = true);
    else if (k.level2()) note(2), (changed = true);
    else if (k.level3()) note(3), (changed = true);
    else if (k.level4()) note(4), (changed = true);
  }
  const danger = new Set<number>();
  for (let i = 0; i < k.mask.length; i++) if (!k.seen[i] && !(k.mask[i] & SAFE)) danger.add(i);
  for (const g of gems) safe.delete(g);
  return { safe, danger };
}
