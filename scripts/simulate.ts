/**
 * Balance simulator.
 *
 * Plays the real reducer with a "careful player" bot that only uses what a
 * human can see (clues on explored tiles, visible gems/power-ups) plus
 * Minesweeper-style deduction, and only guesses when nothing is provably safe.
 *
 *   npx tsx scripts/simulate.ts [runsPerFloor] [firstFloor] [lastFloor] [depth] [aim] [heroIndex]
 *
 * Output per floor: clear rate, how often the board forced a guess, and how
 * often a guess killed the bot. Use it to tune `core/difficulty/difficulty.ts`.
 */
import { gameReducer, initialState } from '../src/core/engine/reducer';
import { generateBoard } from '../src/core/engine/generator';
import { omenFor } from '../src/core/engine/omens';
import { getNearbyHazards } from '../src/core/engine/proximity';
import { Direction, GameState } from '../src/core/engine/types';
import { NO_PERKS, getHeroPerks } from '../src/core/engine/heroes';
import { modifiersFor } from '../src/core/engine/ascension';
import { UPGRADES, applyMeta, maxLevel, metaEffects, NO_META } from '../src/core/stats/forge';

const RUNS = Number(process.argv[2] ?? 200);
const FIRST = Number(process.argv[3] ?? 1);
const LAST = Number(process.argv[4] ?? 9);
const DEPTH = Number(process.argv[5] ?? 0);
/** Default bot only shoots a stalker it already faces (the baseline); `aim` also turns to shoot any adjacent stalker, like a quick person would. */
const AIM = process.argv[6] === 'aim';

/** Hero whose passive perks the bot plays with (default: none). The bot does not press abilities or use items. */
const HERO = process.argv[7] === undefined ? -1 : Number(process.argv[7]);
const BASE_PERKS = HERO >= 0 ? getHeroPerks(HERO) : NO_PERKS;

/** Forge upgrades the bot plays with: META=max (everything bought), META=half (half the levels of every upgrade, rounded up), default none. */
const META_MODE = process.env.META ?? 'none';
const META = META_MODE === 'none'
  ? NO_META
  : metaEffects(Object.fromEntries(UPGRADES.map(u => [u.id, META_MODE === 'max' ? maxLevel(u.id) : Math.ceil(maxLevel(u.id) / 2)])));
const PERKS = applyMeta(BASE_PERKS, META);

type Mark = 'safe' | 'danger';

function neighbours(index: number, rows: number, cols: number): number[] {
  const r = Math.floor(index / cols);
  const c = index % cols;
  const out: number[] = [];
  if (r > 0) out.push(index - cols);
  if (r < rows - 1) out.push(index + cols);
  if (c > 0) out.push(index - 1);
  if (c < cols - 1) out.push(index + 1);
  return out;
}

const dirBetween = (from: number, to: number, cols: number): Direction =>
  to === from - cols ? 'UP' : to === from + cols ? 'DOWN' : to === from - 1 ? 'LEFT' : 'RIGHT';

/** What the player can deduce from explored tiles and visible items. */
function deduce(state: GameState): Map<number, Mark> {
  const { rows, cols } = state;
  const visited = new Set(state.visited);
  const marks = new Map<number, Mark>();

  // Gems and power-ups are visible and cannot share a tile with a hazard.
  for (const e of state.entities) {
    if (e.type === 'coin' || e.type === 'shield' || e.type === 'ammo') marks.set(e.index, 'safe');
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const v of visited) {
      const clue = getNearbyHazards(v, rows, cols, state.entityMap);
      const total = clue.enemyCount + clue.pitCount;
      const around = neighbours(v, rows, cols).filter(n => !visited.has(n));
      const dangers = around.filter(n => marks.get(n) === 'danger');
      const unknown = around.filter(n => !marks.has(n));
      if (unknown.length === 0) continue;

      if (total === dangers.length) {
        unknown.forEach(n => marks.set(n, 'safe'));
        changed = true;
      } else if (total - dangers.length === unknown.length) {
        unknown.forEach(n => marks.set(n, 'danger'));
        changed = true;
      }
    }
  }
  return marks;
}

/** Shortest path over explored / known-safe tiles; returns the tile sequence after `from`. */
function pathTo(state: GameState, marks: Map<number, Mark>, target: number): number[] | null {
  const { rows, cols, playerIndex } = state;
  const visited = new Set(state.visited);
  const walkable = (i: number) => i === target || visited.has(i) || marks.get(i) === 'safe';

  const prev = new Map<number, number>([[playerIndex, -1]]);
  const queue = [playerIndex];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    if (cur === target) break;
    for (const n of neighbours(cur, rows, cols)) {
      if (!prev.has(n) && walkable(n) && marks.get(n) !== 'danger') {
        prev.set(n, cur);
        queue.push(n);
      }
    }
  }
  if (!prev.has(target)) return null;
  const path: number[] = [];
  for (let at = target; at !== playerIndex; at = prev.get(at)!) path.push(at);
  return path.reverse();
}

type Choice = { next: number; guess: boolean } | { attack: true; dir?: Direction } | null;

const manhattan = (a: number, b: number, cols: number) =>
  Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs((a % cols) - (b % cols));

/**
 * What a reasonable player does about roaming stalkers (who are visible to a player through the
 * changing clues): shoot one that is right in front of you, step away from one next to you.
 */
function dealWithStalkers(state: GameState, marks: Map<number, Mark>): Choice | undefined {
  const { rows, cols, playerIndex } = state;
  const stalkers = state.entities.filter(e => e.type === 'stalker').map(e => e.index);
  const adjacent = stalkers.filter(s => manhattan(s, playerIndex, cols) === 1);
  if (adjacent.length === 0) return undefined;

  const facing = adjacent.find(s => dirBetween(playerIndex, s, cols) === state.facingDir);
  if (facing !== undefined && state.attack > 0) return { attack: true };
  if (AIM && state.attack > 0) return { attack: true, dir: dirBetween(playerIndex, adjacent[0], cols) };

  // Step to the neighbouring tile (explored or known safe) that is farthest from every stalker.
  const visited = new Set(state.visited);
  let best = -1;
  let bestScore = -1;
  for (const n of neighbours(playerIndex, rows, cols)) {
    if (stalkers.includes(n) || marks.get(n) === 'danger') continue;
    if (!visited.has(n) && marks.get(n) !== 'safe') continue;
    const score = Math.min(...stalkers.map(s => manhattan(s, n, cols)));
    if (score > bestScore) {
      bestScore = score;
      best = n;
    }
  }
  return best === -1 ? undefined : { next: best, guess: false };
}

/** Picks the next action: a tile to step onto (and whether that is a guess), or a shot. */
function choose(state: GameState): Choice {
  const marks = deduce(state);
  const reaction = dealWithStalkers(state, marks);
  if (reaction) return reaction;
  const visited = new Set(state.visited);

  const targets: number[] = [];
  const gems = state.entities.filter(e => e.type === 'coin').map(e => e.index);
  const items = state.entities.filter(e => e.type === 'shield' || e.type === 'ammo').map(e => e.index);
  const frontierSafe = [...marks.entries()].filter(([i, m]) => m === 'safe' && !visited.has(i)).map(([i]) => i);
  targets.push(...gems, ...items, ...frontierSafe);

  let best: number[] | null = null;
  for (const t of targets) {
    const p = pathTo(state, marks, t);
    if (p && (!best || p.length < best.length)) best = p;
  }
  if (best) return { next: best[0], guess: false };

  // Nothing is provably safe: guess the least risky frontier tile.
  const { rows, cols } = state;
  let guessTile = -1;
  let guessRisk = Infinity;
  for (const v of visited) {
    for (const x of neighbours(v, rows, cols)) {
      if (visited.has(x) || marks.get(x) === 'danger') continue;
      let risk = 0;
      let samples = 0;
      for (const v2 of neighbours(x, rows, cols).filter(n => visited.has(n))) {
        const clue = getNearbyHazards(v2, rows, cols, state.entityMap);
        const around = neighbours(v2, rows, cols).filter(n => !visited.has(n));
        const dangers = around.filter(n => marks.get(n) === 'danger').length;
        const unknown = around.filter(n => !marks.has(n)).length || 1;
        risk += (clue.enemyCount + clue.pitCount - dangers) / unknown;
        samples++;
      }
      const r = samples ? risk / samples : 0.2;
      if (r < guessRisk && pathTo(state, marks, x)) {
        guessRisk = r;
        guessTile = x;
      }
    }
  }
  if (guessTile === -1) return null;
  const path = pathTo(state, marks, guessTile)!;
  // Only the last step onto the unknown tile is the actual gamble.
  return { next: path[0], guess: path.length === 1 };
}

interface FloorStats {
  runs: number;
  clears: number;
  deaths: number;
  stuck: number;
  forcedGuess: number; // runs that needed at least one guess
  guessDeaths: number;
  guesses: number;
  moves: number;
  revisits: number;
  explored: number;
  clearedMoves: number;
  clearedRevisits: number;
  clearedExplored: number;
  causes: Record<string, number>;
  arrowsLeft: number;
}

interface FloorResult {
  cleared: boolean;
  died: boolean;
  stuck: boolean;
  guesses: number;
  guessDeath: boolean;
  moves: number;
  /** Moves that step onto an already explored tile (pure walking, no new information). */
  revisits: number;
  /** Share of the board explored when the floor ended. */
  explored: number;
  /** What killed the bot (null when it survived or got stuck). */
  cause: string | null;
  /** Arrows left when the floor ended. */
  arrowsLeft: number;
}

function playFloor(floor: number, seed: number): FloorResult {
  const board = generateBoard(floor, seed, { ascension: DEPTH, omen: omenFor(seed, floor, floor > 10 ? "endless" : "expedition"), endless: floor > 10 });
  let state: GameState = gameReducer(
    { ...initialState },
    {
      type: 'RESET',
      character: { playerName: 'bot' } as never,
      rows: board.rows,
      cols: board.cols,
      entities: board.entities,
      coins: board.coins,
      attack: Math.max(1, board.attack - modifiersFor(DEPTH).arrowPenalty),
      draftBonus: META.draftBonus,
      startShield: META.shield,
      startRelics: META.startRelics,
      seed,
      perks: PERKS,
      ascension: DEPTH,
    },
  );
  state = { ...state, level: floor };

  let guesses = 0;
  let moves = 0;
  let revisits = 0;
  let lastWasGuess = false;
  const cells = state.rows * state.cols;
  const done = (partial: Omit<FloorResult, 'revisits' | 'explored' | 'cause' | 'arrowsLeft'>): FloorResult => ({
    ...partial,
    cause: partial.died ? state.deathCause : null,
    arrowsLeft: state.attack,
    revisits,
    explored: new Set(state.visited).size / cells,
  });

  for (let step = 0; step < 800; step++) {
    if (state.isGameOver) return done({ cleared: false, died: true, stuck: false, guesses, guessDeath: lastWasGuess, moves });
    if (state.isLevelUp) return done({ cleared: true, died: false, stuck: false, guesses, guessDeath: false, moves });

    const choice = choose(state);
    if (!choice) return done({ cleared: false, died: false, stuck: true, guesses, guessDeath: false, moves });

    if ('attack' in choice) {
      state = gameReducer(state, { type: 'ATTACK', direction: choice.dir });
      moves++;
      lastWasGuess = false;
      continue;
    }

    if (choice.guess) guesses++;
    if (state.visited.includes(choice.next)) revisits++;
    lastWasGuess = choice.guess;
    state = gameReducer(state, { type: 'MOVE', direction: dirBetween(state.playerIndex, choice.next, state.cols) });
    moves++;
  }
  return done({ cleared: false, died: false, stuck: true, guesses, guessDeath: false, moves });
}

const pct = (n: number, d: number) => (d === 0 ? '  -  ' : `${((100 * n) / d).toFixed(0).padStart(3)}%`);

console.log(`Balance simulation: ${RUNS} runs per floor, depth ${DEPTH} (${AIM ? 'aiming' : 'standard'} careful bot, no relics, ${HERO >= 0 ? `hero ${HERO} perks` : 'no hero perks'})\n`);
console.log('floor | size  | gems | enemies pits | dens | clear | needed a guess | died on a guess | stuck | avg moves');
console.log('------+-------+------+--------------+------+-------+----------------+-----------------+-------+----------');

const DETAIL: string[] = [];
const CAUSES: string[] = [];
for (let floor = FIRST; floor <= LAST; floor++) {
  const s: FloorStats = { runs: 0, clears: 0, deaths: 0, stuck: 0, forcedGuess: 0, guessDeaths: 0, guesses: 0, moves: 0, revisits: 0, explored: 0, clearedMoves: 0, clearedRevisits: 0, clearedExplored: 0, causes: {}, arrowsLeft: 0 };
  let dims = '';
  let gems = 0;
  let enemies = 0;
  let pits = 0;
  let cells = 1;

  for (let i = 0; i < RUNS; i++) {
    const seed = floor * 100003 + i * 7919 + 1;
    const board = generateBoard(floor, seed, { ascension: DEPTH, omen: omenFor(seed, floor, floor > 10 ? "endless" : "expedition"), endless: floor > 10 });
    dims = `${board.rows}x${board.cols}`;
    cells = board.rows * board.cols;
    gems += board.coins;
    enemies += board.entities.filter(e => e.type === 'enemy').length;
    pits += board.entities.filter(e => e.type === 'pit').length;

    const r = playFloor(floor, seed);
    s.runs++;
    if (r.cleared) s.clears++;
    if (r.died) {
      s.deaths++;
      s.causes[r.cause ?? '?'] = (s.causes[r.cause ?? '?'] ?? 0) + 1;
    }
    s.arrowsLeft += r.arrowsLeft;
    if (r.stuck) s.stuck++;
    if (r.guesses > 0) s.forcedGuess++;
    if (r.guessDeath) s.guessDeaths++;
    s.guesses += r.guesses;
    s.moves += r.moves;
    s.revisits += r.revisits;
    s.explored += r.explored;
    if (r.cleared) {
      s.clearedMoves += r.moves;
      s.clearedRevisits += r.revisits;
      s.clearedExplored += r.explored;
    }
  }

  console.log(
    `${String(floor).padStart(5)} | ${dims.padEnd(5)} | ${(gems / RUNS).toFixed(1).padStart(4)} | ${(enemies / RUNS).toFixed(1).padStart(7)} ${(pits / RUNS).toFixed(1).padStart(4)} | ` +
      `${pct((enemies + pits) / RUNS, cells)} | ` +
      `${pct(s.clears, s.runs)}  | ${pct(s.forcedGuess, s.runs)}            | ${pct(s.guessDeaths, s.runs)}             | ${pct(s.stuck, s.runs)}  | ${(s.moves / s.runs).toFixed(0).padStart(5)}`,
  );
  const causes = Object.entries(s.causes).map(([k, v]) => `${k} ${pct(v, s.runs).trim()}`).join(', ') || 'none';
  CAUSES.push(`  floor ${floor}: ${causes} | arrows left ${(s.arrowsLeft / s.runs).toFixed(1)}`);
  if (s.clears > 0) {
    DETAIL.push(
      `  floor ${floor}: ${(s.clearedMoves / s.clears).toFixed(0).padStart(4)} moves | ${pct(s.clearedRevisits, s.clearedMoves)} walking | ${(100 * s.clearedExplored / s.clears).toFixed(0).padStart(3)}% explored`,
    );
  }
}
console.log('\n"needed a guess" = the board offered no provably safe tile at some point (Minesweeper-style luck).');
console.log('\nPer cleared floor: moves, % of those moves spent walking over already explored tiles (no new information), % of the board explored.');
for (const row of DETAIL) console.log(row);

console.log('\nDeaths by cause (share of all runs on that floor) and arrows left at the end of the floor.');
for (const row of CAUSES) console.log(row);
