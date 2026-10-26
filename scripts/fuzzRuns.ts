/**
 * Full-run fuzzer: plays whole runs through the real reducer with a bot that mixes a "knows the board" path-finder (so runs
 * reach deep floors and the lair) with random actions of every kind (shop, altar, items, abilities, undo, relic picks, shots in
 * every direction). After every action it checks the invariants a real run must never break, and every run is replayed from
 * its action log to prove the engine is deterministic (a daily challenge depends on it).
 *
 *   npx tsx scripts/fuzzRuns.ts [runs] [firstSeed]
 */
import { gameReducer, initialState } from '../src/core/engine/reducer';
import { generateBoard } from '../src/core/engine/generator';
import { deriveLevelSeed, GameMode } from '../src/core/engine/seed';
import { omenFor, OmenId } from '../src/core/engine/omens';
import { biomeFor } from '../src/core/engine/biomes';
import { isLairFloor, lairHeartBonus } from '../src/core/engine/lair';
import { modifiersFor, MAX_ASCENSION } from '../src/core/engine/ascension';
import { getHeroPerks } from '../src/core/engine/heroes';
import { relicCount } from '../src/core/engine/relics';
import { applyMeta, metaEffects, NO_META, UPGRADES } from '../src/core/stats/forge';
import type { MetaEffects } from '../src/core/stats/forge';
/** The engine only reads the hero's number; the pictures (which Node cannot load) are not needed. */
const characters = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, playerName: `H${i}` })) as unknown as import('../src/data/characters').Character[];
import { Direction, GameAction, GameState, LETHAL_TYPES } from '../src/core/engine/types';
import { stepTarget } from '../src/core/engine/travel';
import { SHOP_PRICES } from '../src/core/engine/shop';
import type { ShopItem } from '../src/core/engine/shop';

const RUNS = Number(process.argv[2] ?? 300);
const FIRST = Number(process.argv[3] ?? 1);
const DIRS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

function rng(seed: number) {
  let v = (seed * 2654435761) >>> 0;
  return () => ((v = (v * 1664525 + 1013904223) >>> 0) / 4294967296);
}

interface Failure {
  run: number;
  mode: string;
  hero: number;
  depth: number;
  step: number;
  floor: number;
  what: string;
  last: string;
}
const failures: Failure[] = [];
const stats = { runs: 0, actions: 0, floors: 0, wins: 0, deaths: 0, capped: 0, deepest: 0, reducerMs: 0, maxReducerMs: 0, byMode: {} as Record<string, number> };

function check(s: GameState): string | null {
  const total = s.rows * s.cols;
  if (!Number.isInteger(s.playerIndex) || s.playerIndex < 0 || s.playerIndex >= total) return `playerIndex out of range (${s.playerIndex}/${total})`;
  if (new Set(s.visited).size !== s.visited.length) return 'visited has duplicates';
  if (!s.visited.includes(s.playerIndex)) return 'player stands on an unvisited tile';
  for (const v of s.visited) if (v < 0 || v >= total) return `visited tile out of range (${v})`;
  for (const k of ['coins', 'attack', 'score', 'gems', 'level', 'turn', 'totalCoins'] as const) {
    const n = s[k] as number;
    if (!Number.isFinite(n)) return `${k} is not a finite number (${n})`;
  }
  if (s.coins < 0) return `coins < 0 (${s.coins})`;
  if (s.attack < 0) return `attack < 0 (${s.attack})`;
  if (s.score < 0) return `score < 0 (${s.score})`;
  if (s.gems < 0) return `gems < 0 (${s.gems})`;
  if (s.level < 1) return `level < 1`;
  if (Object.keys(s.entityMap).length !== s.entities.length) return `entityMap (${Object.keys(s.entityMap).length}) out of step with entities (${s.entities.length})`;
  const seen = new Set<number>();
  for (const e of s.entities) {
    if (e.index < 0 || e.index >= total) return `entity ${e.type} outside the board (${e.index})`;
    if (seen.has(e.index)) return `two entities on tile ${e.index}`;
    seen.add(e.index);
    if (s.entityMap[e.index] !== e) return `entityMap[${e.index}] is not the entity`;
    if (e.type === 'boss' && (e.hp === undefined || e.hp < 1)) return 'boss with no hearts is still on the board';
  }
  const coinEntities = s.entities.filter(e => e.type === 'coin').length;
  if (!s.isGameOver && coinEntities !== s.coins) return `coins counter (${s.coins}) differs from gems on the board (${coinEntities})`;
  // An alive hero never shares a tile with something lethal.
  const here = s.entityMap[s.playerIndex];
  if (!s.isGameOver && here && LETHAL_TYPES.includes(here.type)) return `alive on a lethal tile (${here.type})`;
  const boss = s.entities.find(e => e.type === 'boss');
  if (boss && !s.isGameOver && !s.isVictory && !s.pendingDraft && !s.isLevelUp && s.attack === 0 && !s.entities.some(e => e.type === 'ammo') && (s.lairRescues ?? 0) < 2) return 'lair that cannot be won: no arrows, none on the floor and no rescue left to come';
  if (s.relics.length > 40) return 'absurd relic count';
  if (s.abilityCd < 0) return 'ability cooldown < 0';
  return null;
}

/** Shortest walk to the nearest wanted tile avoiding lethal tiles (the bot "knows" the board, like a debugging cheat). */
function pathTo(s: GameState, want: (i: number) => boolean): Direction | null {
  const { rows, cols } = s;
  const prev = new Map<number, { from: number; dir: Direction }>();
  const queue = [s.playerIndex];
  prev.set(s.playerIndex, { from: -1, dir: 'UP' });
  while (queue.length) {
    const cur = queue.shift() as number;
    if (cur !== s.playerIndex && want(cur)) {
      let c = cur;
      let d: Direction = 'UP';
      while (prev.get(c)!.from !== s.playerIndex && prev.get(c)!.from !== -1) c = prev.get(c)!.from;
      d = prev.get(c)!.dir;
      return d;
    }
    for (const dir of DIRS) {
      const n = stepTarget(cur, dir, rows, cols);
      if (n === -1 || prev.has(n)) continue;
      const e = s.entityMap[n];
      if (e && LETHAL_TYPES.includes(e.type)) continue;
      prev.set(n, { from: cur, dir });
      queue.push(n);
    }
  }
  return null;
}

function boardFor(level: number, runSeed: number, mode: GameMode, ascension: number, state: GameState | null, omen?: OmenId | null) {
  const seed = deriveLevelSeed(runSeed, level);
  return {
    seed,
    board: generateBoard(level, seed, {
      boss: isLairFloor(mode, level),
      ascension,
      omen: omen !== undefined ? omen : omenFor(runSeed, level, mode),
      biome: biomeFor(level, mode),
      extraPits: state && relicCount(state.relics, 'greedy_idol') > 0 ? 2 : 0,
      bossHeartBonus: lairHeartBonus(mode, level),
      endless: mode === 'endless',
    }),
  };
}

function playRun(run: number): void {
  const r = rng(run);
  const mode: GameMode = (['expedition', 'daily', 'endless'] as const)[Math.floor(r() * 3)];
  const hero = Math.floor(r() * characters.length);
  const ascension = mode === 'daily' ? 0 : Math.floor(r() * (MAX_ASCENSION + 1));
  // Some runs carry Forge upgrades at random levels
  let meta: MetaEffects = NO_META;
  if (mode !== 'daily' && r() < 0.5) {
    const forge: Record<string, number> = {};
    for (const u of UPGRADES) if (r() < 0.4) forge[u.id] = 1 + Math.floor(r() * u.costs.length);
    meta = metaEffects(forge);
  }
  const perks = applyMeta(getHeroPerks(hero), meta);
  const runSeed = 1000 + run * 7919;
  const log: GameAction[] = [];
  let state: GameState = initialState;
  const dispatch = (a: GameAction): void => {
    log.push(a);
    const t = process.hrtime.bigint();
    state = gameReducer(state, a);
    const ms = Number(process.hrtime.bigint() - t) / 1e6;
    stats.reducerMs += ms;
    stats.actions++;
    if (ms > stats.maxReducerMs) stats.maxReducerMs = ms;
  };
  const fail = (what: string, step: number, last: string): void => {
    failures.push({ run, mode, hero, depth: ascension, step, floor: state.level, what, last });
  };

  try {
    const first = boardFor(1, runSeed, mode, ascension, null);
    dispatch({
      type: 'RESET',
      character: characters[hero],
      rows: first.board.rows,
      cols: first.board.cols,
      entities: first.board.entities,
      coins: first.board.coins,
      attack: Math.max(1, first.board.attack - modifiersFor(ascension).arrowPenalty),
      seed: first.seed,
      mode,
      runSeed,
      ascension,
      perks,
      draftBonus: meta.draftBonus,
      startShield: meta.shield,
      startRelics: meta.startRelics,
    } as GameAction);
    let bad = check(state);
    if (bad) return fail(`after RESET: ${bad}`, 0, 'RESET');

    const MAX_ACTIONS = 1500;
    let step = 0;
    let stuck = 0;
    for (; step < MAX_ACTIONS; step++) {
      if (state.isGameOver || state.isVictory) break;
      let action: GameAction | null = null;
      const roll = r();

      if (state.pendingDraft) {
        action = { type: 'PICK_RELIC', id: state.pendingDraft[Math.floor(r() * state.pendingDraft.length)] };
      } else if (state.isLevelUp) {
        // The shop and the altar, then down
        if (roll < 0.35) {
          const items = Object.keys(SHOP_PRICES) as ShopItem[];
          action = { type: 'BUY', item: items[Math.floor(r() * items.length)] };
        } else if (roll < 0.45) {
          action = { type: 'ALTAR' };
        } else {
          const next = state.level + 1;
          const { seed, board } = boardFor(next, state.runSeed, state.mode, state.ascension, state);
          action = {
            type: 'LEVEL_UP',
            payload: {
              rows: board.rows,
              cols: board.cols,
              entities: board.entities,
              coins: board.coins,
              attack: Math.max(1, board.attack - modifiersFor(state.ascension).arrowPenalty),
              seed,
              omen: omenFor(state.runSeed, next, state.mode),
            },
          } as GameAction;
        }
      } else if (roll < 0.06) {
        action = { type: 'USE_ABILITY' };
      } else if (roll < 0.10) {
        action = { type: 'USE_ITEM', item: r() < 0.5 ? 'detector' : 'bomb' };
      } else if (roll < 0.13) {
        action = { type: 'UNDO' };
      } else if (roll < 0.22) {
        action = { type: 'ATTACK', direction: r() < 0.7 ? DIRS[Math.floor(r() * 4)] : undefined };
      } else if (roll < 0.28) {
        action = { type: 'MOVE', direction: DIRS[Math.floor(r() * 4)] }; // may walk into anything
      } else {
        // The path-finder: gems first, then shields and arrows, then any explorable tile; shoot the Grimbur when aligned
        const coin = (i: number) => state.entityMap[i]?.type === 'coin';
        const loot = (i: number) => ['shield', 'ammo'].includes(state.entityMap[i]?.type ?? '');
        const fresh = (i: number) => !state.visited.includes(i) && !state.entityMap[i];
        const dir = pathTo(state, coin) ?? pathTo(state, loot) ?? pathTo(state, fresh);
        if (dir) action = { type: 'MOVE', direction: dir };
        else action = state.attack > 0 ? { type: 'ATTACK', direction: DIRS[Math.floor(r() * 4)] } : { type: 'MOVE', direction: DIRS[Math.floor(r() * 4)] };
      }

      const before = state;
      try {
        dispatch(action);
      } catch (e) {
        return fail(`reducer threw on ${action.type}: ${(e as Error).message}`, step, JSON.stringify(action).slice(0, 120));
      }
      bad = check(state);
      if (bad) return fail(bad, step, action.type);
      stuck = state === before ? stuck + 1 : 0;
      if (stuck > 80) {
        const boss = state.entities.find(e => e.type === 'boss');
        const ammo = state.entities.filter(e => e.type === 'ammo').length;
        return fail(`stuck: 80 actions in a row changed nothing [arrows ${state.attack}, coins ${state.coins}, boss hearts ${boss?.hp ?? '-'}, ammo on board ${ammo}, items ${JSON.stringify(state.items)}, hero ${hero}]`, step, action.type);
      }
    }

    stats.floors += state.level;
    stats.deepest = Math.max(stats.deepest, state.level);
    stats.byMode[mode] = (stats.byMode[mode] ?? 0) + 1;
    if (state.isVictory) stats.wins++;
    else if (state.isGameOver) stats.deaths++;
    else stats.capped++;

    // Determinism: replaying the same actions from the same start must give the same final state.
    let replay: GameState = initialState;
    for (const a of log) replay = gameReducer(replay, a);
    if (JSON.stringify(replay) !== JSON.stringify(state)) fail('replay from the action log differs (the engine is not deterministic)', step, 'replay');
  } catch (e) {
    fail(`threw: ${(e as Error).stack?.split('\n').slice(0, 3).join(' | ')}`, -1, 'run');
  }
}

const t0 = Date.now();
for (let run = FIRST; run < FIRST + RUNS; run++) {
  stats.runs++;
  playRun(run);
}

console.log(`runs ${stats.runs} (${JSON.stringify(stats.byMode)})  actions ${stats.actions}  in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`ended: ${stats.wins} wins, ${stats.deaths} deaths, ${stats.capped} hit the action cap   deepest floor ${stats.deepest}   avg floor ${(stats.floors / stats.runs).toFixed(1)}`);
console.log(`reducer: avg ${(stats.reducerMs / Math.max(1, stats.actions)).toFixed(3)} ms/action, worst ${stats.maxReducerMs.toFixed(2)} ms`);
if (!failures.length) {
  console.log('\nNO FAILURES');
} else {
  const groups = new Map<string, Failure[]>();
  if (process.env.FULL) for (const f of failures) console.log(`  run ${f.run}: ${f.what}`);
  for (const f of failures) {
    const key = f.what.replace(/\d+/g, 'N').slice(0, 110);
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }
  console.log(`\n${failures.length} FAILURES in ${groups.size} kinds:`);
  for (const [key, list] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const f = list[0];
    console.log(`  x${list.length}  ${key}\n       e.g. run ${f.run} (${f.mode}, hero ${f.hero}, depth ${f.depth}) floor ${f.floor} step ${f.step} after ${f.last}`);
  }
  process.exitCode = 1;
}
