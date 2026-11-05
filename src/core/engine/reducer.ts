import { GameState, GameAction, GameEntity, PickupKind, LETHAL_TYPES, GUARDIAN_TYPES, Direction, UndoSnapshot } from './types';
import { GAME_CONFIG } from '../../config/gameConfig';
import { createPRNG } from '../random/prng';
import { coinReward, killValue, levelClearBonus } from './scoring';
import { floorEffects } from './events';
import { NO_PERKS } from './heroes';
import { modifiersFor } from './ascension';
import { REFILL_ARROWS, REVIVE_ARROWS } from './revive';
import { tallyBestiary } from '../stats/bestiary';
import { RelicId, draftRelics, relicCount, gamblerRoll, OWL_EVERY, chestRelic, isUsefulRelic, hasFamilyBonus, LOOTER_GEMS } from './relics';
import { SHOP_PRICES, SHOP_ARROWS, MAX_ITEMS, MERCHANT_ARROWS, MERCHANT_GEMS, abilityCooldown } from './shop';
import { provenSafeTiles } from './solver';
import { VOLLEY_REACH, VOLLEY_TARGETS, FLARE_REACH } from './abilities';
import { SECRET_ARROWS, SECRET_GEMS, secretScore } from './generator';
import { encounterFor, resolveEncounter } from './encounters';
import { createEntityMap, removeEntityAt, replaceEntityAt, staysDark, startingVisited, tryAbsorb, nonEmpty, draftContext, blastWorld, hasBoss, neighbour, pickTeleportDestination, huntersAct, hunterSlowdown, manhattan, wakeSleepers, gemYield, hurtBoss, splitSecret, gainRelicNow, nearestDanger, hasLairBoss } from './worldHelpers';
import type { World } from './worldHelpers';
import { shotPlan, weaponOf, scaleAmmo, BOMB_WAKE } from './weapons';

/** The state without its undo slot: what a step back restores. */
const snapshotOf = (state: GameState): UndoSnapshot => {
  const { undo: _undo, ...rest } = state;
  return rest;
};

/**
 * `count` gems taken at once (one picked up or pulled by a magnet, or a thief's whole loot, caught, shot or blown up), with
 * `totalBefore` gems already taken this run: the score each pays (hero, floor, Blood Pact, Lucky Coin), the shop gems (see
 * gemYield) and the ammo the Blood Gems give (an arrow or an orb per gem, a bomb per second one).
 */
const takeGems = (state: GameState, count: number, totalBefore: number) => {
  const mult = state.perks.coinMultiplier * floorEffects(state.omen, state.event).gemMultiplier * (relicCount(state.relics, 'blood_pact') > 0 ? 1.5 : 1);
  const bloodGems = relicCount(state.relics, 'blood_gems') > 0;
  const bomb = weaponOf(state) === 'bomb';
  let score = 0;
  let gems = 0;
  let ammo = 0;
  let total = totalBefore;
  for (let k = 0; k < count; k++) {
    score += coinReward(state.level, mult, relicCount(state.relics, 'lucky_coin'));
    total += 1;
    gems += gemYield(state, total);
    if (bloodGems && (!bomb || total % 2 === 0)) ammo += 1;
  }
  return { score, gems, ammo, total };
};

/**
 * Finishes an action that is not a step (ability, bomb): it takes a turn, clears the floor when the last gem or the
 * Grimbur is gone and otherwise lets the hunters act. `patch` carries what the action changed.
 */
const settle = (state: GameState, world: World, patch: Partial<GameState>, opts: { stunned?: boolean } = {}): GameState => {
  const { rows, cols } = state;
  // Only the Grimbur's own fall wins the run: a lieutenant or the Magma Colossus slain here just clears the floor.
  const hadBoss = hasLairBoss(state);
  const coins = patch.coins ?? state.coins;
  let score = patch.score ?? state.score;
  let shield = patch.shield ?? state.shield;
  let relics = patch.relics ?? state.relics;
  const turn = state.turn + 1;
  const cleared = coins === 0 && !hasBoss(world);
  let over = false;
  let cause: GameState['deathCause'] = null;
  let struckFrom: number | null = null;

  let gems = patch.gems ?? state.gems;
  if (cleared) {
    score += Math.round(levelClearBonus(state.level) * (1 + 0.5 * relicCount(relics, 'greed')));
    gems += relicCount(relics, 'greed');
  } else if (!opts.stunned) {
    // (Stunning Blow: a kill leaves the hunters standing for this action, as a shot's does.)
    if (relicCount(relics, 'lullaby') === 0) world = wakeSleepers(world, state.playerIndex, cols);
    const acted = huntersAct(world, state.playerIndex, rows, cols, turn, hunterSlowdown(relics), modifiersFor(state.ascension).hunterHaste);
    world = acted.world;
    for (const [k, hitter] of acted.hits.entries()) {
      const absorbed = tryAbsorb(shield, relics);
      if (absorbed.ok) {
        shield = absorbed.shield;
        relics = absorbed.relics;
        // Thorn Mail, as on a step or a shot: the stalker that struck into the shield dies on it.
        if (relicCount(state.relics, 'thorns') > 0) world = thornsStrike(world, acted.strikers[k]);
      } else {
        over = true;
        cause = hitter;
        struckFrom = acted.strikers[k];
        break;
      }
    }
  }

  return {
    ...state,
    ...patch,
    score: Math.max(0, score),
    entities: world.entities,
    entityMap: world.entityMap,
    shield,
    relics,
    gems,
    turn,
    isLevelUp: cleared,
    isVictory: cleared && hadBoss && state.mode !== 'endless',
    isGameOver: over,
    deathCause: over ? cause : null,
    struckFrom,
    abilityCd: patch.abilityCd ?? Math.max(0, state.abilityCd - 1),
    undo: null,
    lastBreath: over ? snapshotOf(state) : null,
    lastPickup: null,
    vortexCost: null,
  };
};

// ─── Initial State ─────────────────────────────────────────────────────────
export const initialState: GameState = {
  playerIndex: 0,
  rows: 8,
  cols: 15,
  entities: [],
  entityMap: {},
  visited: [0],
  score: 0,
  attack: 6,
  coins: 0,
  facingDir: 'RIGHT',
  level: 1,
  isGameOver: false,
  isLevelUp: false,
  selectedCharacter: null,
  shield: false,
  enemyCombo: 0,
  gameStatus: 'idle',
  seed: 0,
  runSeed: 0,
  mode: 'expedition',
  ascension: 0,
  draftBonus: 0,
  totalCoins: 0,
  deathCause: null,
  wasTeleported: false,
  vortexCost: null,
  perks: NO_PERKS,
  relics: [],
  pendingDraft: null,
  turn: 0,
  isVictory: false,
  lastPickup: null,
  gems: 0,
  items: { detector: 0, bomb: 0 },
  abilityCd: 0,
  omen: null,
  marked: [],
  pendingArrows: 0,
  altarPending: false,
  altarUsed: false,
  undo: null,
  undoUsed: false,
};

// ─── Reducer ───────────────────────────────────────────────────────────────
/**
 * Grimbur Adventures — Pure Reducer
 * No side-effects (logs, events, replays) allowed here.
 */
/** How many tiles an arrow flies: the hero's reach plus the bows (the Glass Bow trades safety for two more tiles). */
export const arrowReachOf = (state: Pick<GameState, 'perks' | 'relics'>): number =>
  state.perks.arrowReach + relicCount(state.relics, 'long_bow') + 2 * relicCount(state.relics, 'glass_bow');

/**
 * The flight of an arrow shot toward `aim`: the tiles it crosses (up to its reach, ending on the first hostile one, if any)
 * and the tile it hits (-1 when it flies on without hitting). The reducer, the aim preview and the arrow animation all use it,
 * so what the board shows is what the shot does.
 */
export function arrowPath(
  state: Pick<GameState, 'playerIndex' | 'rows' | 'cols' | 'perks' | 'relics' | 'entityMap'>,
  aim: Direction,
): { tiles: number[]; targetIndex: number } {
  const tiles: number[] = [];
  let cursor = state.playerIndex;
  const reach = arrowReachOf(state);
  for (let step = 0; step < reach; step++) {
    cursor = neighbour(cursor, aim, state.rows, state.cols);
    if (cursor === -1) break;
    tiles.push(cursor);
    const type = state.entityMap[cursor]?.type;
    if (type === 'boss' || type === 'thief' || (type && GUARDIAN_TYPES.includes(type))) return { tiles, targetIndex: cursor };
  }
  return { tiles, targetIndex: -1 };
}

/** The first draft of a run always offers the season's featured relic (in the last slot), when it can still help. */
const withSeasonRelic = (draft: RelicId[], state: GameState): RelicId[] => {
  const featured = state.seasonRelic;
  if (!featured || state.level !== 1 || draft.length === 0 || draft.includes(featured)) return draft;
  if (!isUsefulRelic(featured, state.relics, draftContext(state))) return draft;
  return [...draft.slice(0, -1), featured];
};

/** Shop gems the Grimbur's lieutenant drops when it falls. */
export const MID_BOSS_GEMS = 4;

/**
 * Thorn Mail: the stalker that struck into the shield (from tile `striker`) dies on it. Only that one: a stalker standing by that
 * did not strike lives, and a Grimbur, lieutenant or Colossus is too big for thorns.
 */
const thornsStrike = (world: World, striker: number): World =>
  world.entityMap[striker]?.type === 'stalker' ? removeEntityAt(world, striker) : world;

/** Raven's Eye (see worldHelpers): re-exported, the screens and tests read it from here. */
export { nearestDanger };

/** The altar costs the shield; where the next floor gives it back for nothing (Borin, the Bulwark) it would cost nothing. */
export const altarIsFree = (state: Pick<GameState, 'perks' | 'relics'>): boolean => state.perks.startShield || relicCount(state.relics, 'bulwark') > 0;

/** Sleepers within `radius` (Manhattan) of `center` wake up as stalkers (a bomb's noise). */
const wakeNear = (world: World, center: number, cols: number, radius: number): World => {
  let current = world;
  for (const e of world.entities) {
    if (e.type === 'sleeper' && manhattan(e.index, center, cols) <= radius) {
      current = replaceEntityAt(current, e.index, { index: e.index, type: 'stalker', charge: 0 });
    }
  }
  return current;
};

/**
 * The tiles of a burst (an orb, or a bomb with the Flare Arrow) that light up: the unexplored ones that hold nothing deadly are
 * explored; guardians, vortexes and traps there get flagged (the Grimbur is in plain sight and moves, so it is not).
 */
export const lightArea = (world: World, area: readonly number[], visited: readonly number[]): { safe: number[]; danger: number[] } => {
  const seen = new Set(visited);
  const safe: number[] = [];
  const danger: number[] = [];
  for (const i of area) {
    if (seen.has(i)) continue;
    const e = world.entityMap[i];
    if (!staysDark(e)) safe.push(i);
    else if (e && e.type !== 'boss') danger.push(i);
  }
  return { safe, danger };
};

/**
 * A bomb's blast over `area` (see shotPlan): every guardian there dies (each kill raises the combo and pays its value), a thief
 * drops its loot like a shot one, traps are disarmed, vortexes survive and get flagged, and a Grimbur (or its lieutenant) loses
 * one heart, never more, per throw. No kill and no heart is a miss.
 */
function bombBlast(state: GameState, area: readonly number[]) {
  const { relics } = state;
  const hunter = relicCount(relics, 'hunter');
  const maxCombo = GAME_CONFIG.multipliers.maxCombo + hunter;
  const greed = relicCount(relics, 'greed');
  let world: World = { entities: state.entities, entityMap: state.entityMap };
  let score = state.score;
  let combo = state.enemyCombo;
  let gems = state.gems;
  let coins = state.coins;
  let totalCoins = state.totalCoins;
  let guardians = 0;
  let thieves = 0;
  let hearts = 0;
  let bossKilled = false;
  let victory = false;
  let lootAmmo = 0;

  for (const i of area) {
    const e = world.entityMap[i];
    if (!e) continue;
    if (GUARDIAN_TYPES.includes(e.type)) {
      combo = Math.min(combo + 1, maxCombo);
      score += killValue(combo) * (relicCount(relics, 'reaper') > 0 ? 2 : 1);
      world = removeEntityAt(world, i);
      if (hunter > 0) gems += 1;
      guardians += 1;
    } else if (e.type === 'thief') {
      const loot = e.loot ?? 0;
      world = removeEntityAt(world, i);
      // Its loot counts as taken, exactly as if the hero had caught it.
      const taken = takeGems(state, loot, totalCoins);
      score += taken.score;
      gems += taken.gems;
      lootAmmo += taken.ammo;
      coins -= loot;
      totalCoins = taken.total;
      thieves += 1;
    } else if (e.type === 'trap') {
      world = removeEntityAt(world, i);
    }
  }
  // The Grimbur (or its lieutenant) after the guardians, so a stalker it calls when hurt is not caught by the same blast.
  for (const i of area) {
    const e = world.entityMap[i];
    if (!e || e.type !== 'boss') continue;
    const hurt = hurtBoss(world, i, state);
    world = hurt.world;
    hearts += 1;
    if (!hurt.killed) {
      score += GAME_CONFIG.boss.hitScore;
    } else if (e.mini) {
      score += Math.round(GAME_CONFIG.boss.killScore / 2);
      gems += MID_BOSS_GEMS;
      bossKilled = true;
    } else {
      score += GAME_CONFIG.boss.killScore;
      bossKilled = true;
      victory = state.mode !== 'endless';
    }
  }

  const levelUp = coins === 0 && !hasBoss(world) && (bossKilled || thieves > 0);
  if (levelUp) score += Math.round(levelClearBonus(state.level) * (1 + 0.5 * greed));
  let arrowBack = 0;
  if (guardians === 0) combo = 0;
  if (guardians === 0 && thieves === 0 && hearts === 0) {
    score += GAME_CONFIG.scoring.missPenalty;
    if (relicCount(relics, 'reaper') > 0) arrowBack = -1;
  } else if (relicCount(relics, 'echo_arrow') > 0 && guardians + thieves >= 2) {
    // Echo Arrow: one throw that slays two or more gives the bomb back.
    arrowBack = 1;
  }
  // Vortexes in the blast are flagged; flags on what the blast destroyed are dropped.
  const inBlast = new Set(area);
  const vortexes = area.filter(i => world.entityMap[i]?.type === 'pit');
  const kept = state.marked.filter(i => !inBlast.has(i) || world.entityMap[i]);
  const marked = vortexes.length > 0 ? Array.from(new Set([...kept, ...vortexes])) : kept;
  return { world, score, combo, gems, coins, totalCoins, guardians, levelUp, victory: levelUp && victory, arrowBack: arrowBack + lootAmmo, marked };
}

/**
 * The ammo a floor starts with, after the weapon's own floors: an orb hero (one orb fewer per floor) never starts below one, and
 * a bomber always starts a floor with a boss with at least its hearts plus one bombs (a bomb takes one heart per throw). The bow
 * is left exactly as it was.
 */
export const floorAmmo = (weapon: ReturnType<typeof weaponOf>, ammo: number, entities: readonly GameEntity[]): number => {
  if (weapon === 'orb') return Math.max(1, ammo);
  if (weapon !== 'bomb') return ammo;
  const hearts = entities.filter(e => e.type === 'boss').reduce((n, e) => n + (e.hp ?? GAME_CONFIG.boss.hp), 0);
  return hearts > 0 ? Math.max(ammo, hearts + 1) : ammo;
};

/** The most times a lair rescues a hero that ran out of arrows. */
export const MAX_LAIR_RESCUES = 2;

/**
 * The Grimbur can only be slain with arrows. A hero with none left, with none lying on the floor, cannot win the fight: the
 * run would only wait for the Grimbur to catch up. So when that happens on the lair floor, a few bundles turn up on free tiles
 * (enough for the Grimbur' remaining hearts), up to MAX_LAIR_RESCUES times. It only ever happens at zero arrows, so it never
 * makes shots free: a hero that still holds an arrow, or has one to pick up, is left alone.
 */
export function ensureWinnable(state: GameState): GameState {
  if (state.isGameOver || state.isVictory || state.pendingDraft || state.isLevelUp) return state;
  if (state.attack > 0 || (state.lairRescues ?? 0) >= MAX_LAIR_RESCUES) return state;
  const boss = state.entities.find(e => e.type === 'boss');
  if (!boss || (boss.hp ?? 0) < 1) return state;
  if (state.entities.some(e => e.type === 'ammo')) return state;

  // A bundle holds fewer bombs than arrows (see scaleAmmo), so a bomber gets more bundles.
  const wanted = Math.max(1, Math.ceil((boss.hp ?? 1) / scaleAmmo(weaponOf(state), GAME_CONFIG.pickups.ammoAmount)));
  const total = state.rows * state.cols;
  const rnd = createPRNG(((state.seed ^ Math.imul(state.turn + 1, 2654435761)) >>> 0) || 1);
  rnd(); // discard the weakly-mixed first sample
  const taken = new Set<number>([state.playerIndex, ...state.entities.map(e => e.index)]);
  // Only tiles the hero can walk to (around the vortexes; guardians in the way can be shot, so they do not wall anything off).
  const reachable = new Set<number>([state.playerIndex]);
  const queue = [state.playerIndex];
  for (let head = 0; head < queue.length; head++) {
    for (const d of ['UP', 'DOWN', 'LEFT', 'RIGHT'] as Direction[]) {
      const n = neighbour(queue[head], d, state.rows, state.cols);
      if (n === -1 || reachable.has(n) || state.entityMap[n]?.type === 'pit' || state.entityMap[n]?.type === 'boss') continue;
      reachable.add(n);
      queue.push(n);
    }
  }
  // Hemmed in (between the Grimbur and a vortex, say) nothing is walkable from here: any free tile will do, the way out is the vortex.
  const walkable = [...reachable].some(i => !taken.has(i));
  const placed: GameEntity[] = [];
  for (let tries = 0; placed.length < wanted && tries < total * 4; tries++) {
    const index = Math.floor(rnd() * total);
    if (taken.has(index) || (walkable && !reachable.has(index))) continue;
    taken.add(index);
    placed.push({ index, type: 'ammo' });
  }
  if (placed.length === 0) return state;
  const entities = [...state.entities, ...placed];
  return { ...state, entities, entityMap: createEntityMap(entities), lairRescues: (state.lairRescues ?? 0) + 1 };
}

/** Actions held while the floor's encounter waits for a choice. */
const HELD_BY_ENCOUNTER: readonly GameAction['type'][] = ['MOVE', 'ATTACK', 'USE_ITEM', 'USE_ABILITY', 'UNDO'];

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (state.encounter && !state.encounter.outcome && HELD_BY_ENCOUNTER.includes(action.type)) return state;
  const core = reduceCore(state, action);
  // Blood Gems: the hero can never hold a shield, whatever would give one.
  const next = core.shield && relicCount(core.relics, 'blood_gems') > 0 ? { ...core, shield: false } : core;
  // A new floor starts its own count of rescues.
  const counted = next === state ? next : { ...next, ...tallyBestiary(state as never, next as never) };
  const newFloor = counted.level !== state.level || counted.runSeed !== state.runSeed || action.type === 'RESET';
  const fresh = newFloor ? { ...counted, lairRescues: 0 } : counted;
  return ensureWinnable(counted === state ? fresh : pruneMarks(payOwl(state, fresh, newFloor)));
}

/**
 * Every flag the engine sets (detector, Raven's Eye, a burst, a revive) is on a tile that holds something. When that is gone (the
 * stalker moved on, the keg blew up the vortex, the lava cooled, the thief ran) the flag goes too, or it would keep refusing steps
 * onto a tile that is now free.
 */
function pruneMarks(state: GameState): GameState {
  if (!state.marked.some(i => !state.entityMap[i])) return state;
  return { ...state, marked: state.marked.filter(i => state.entityMap[i]) };
}

/**
 * Owl Totem: every OWL_EVERY tiles explored on a floor give a detector charge (never past the bag). It is settled after every
 * action, so the tiles an orb, a Flare, a Scout, a vortex or an encounter light count as much as the steps, and an action that
 * explores past two thresholds pays two. `owlPaid` counts the charges already paid on the floor; a new floor starts the count
 * over (its starting light pays nothing), and an Owl gained mid-floor only pays for what is explored from then on.
 */
function payOwl(before: GameState, next: GameState, newFloor: boolean): GameState {
  const earned = Math.floor(next.visited.length / OWL_EVERY);
  if (newFloor) return { ...next, owlPaid: earned };
  if (relicCount(next.relics, 'owl') === 0) return next;
  // (A run saved before the count existed, or an Owl just gained: everything explored so far counts as paid.)
  const paid = relicCount(before.relics, 'owl') > 0 && next.owlPaid !== undefined
    ? next.owlPaid
    : Math.floor(before.visited.length / OWL_EVERY);
  if (earned <= paid) return paid === next.owlPaid ? next : { ...next, owlPaid: paid };
  return {
    ...next,
    owlPaid: earned,
    items: { ...next.items, detector: Math.min(MAX_ITEMS, next.items.detector + earned - paid) },
  };
}

function reduceCore(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'MOVE': {
      if (state.isGameOver || state.isLevelUp || state.pendingDraft) return state;

      const { rows, cols, perks } = state;
      const has = (id: Parameters<typeof relicCount>[1]) => relicCount(state.relics, id);
      const { direction } = action;

      let nextIndex = neighbour(state.playerIndex, direction, rows, cols);
      if (nextIndex === -1) {
        return { ...state, facingDir: direction, lastPickup: null, vortexCost: null };
      }

      const isNewTile = !state.visited.includes(nextIndex);
      let newVisited = isNewTile
        ? [...state.visited, nextIndex]
        : [...state.visited];

      let newScore = Math.max(0, state.score + (has('iron_boots') ? 0 : GAME_CONFIG.scoring.stepCost));
      // Whole points only: a Forge multiplier of 1.25 used to leave scores like 6.25, which the leaderboard rejects.
      if (isNewTile) newScore += Math.round(GAME_CONFIG.scoring.newTile * perks.newTileMultiplier * (has('hasty_boots') ? 3 : 1));

      let newIsGameOver: boolean = false;
      let newCoins = state.coins;
      let newAttack = state.attack;
      let world: World = { entities: state.entities, entityMap: state.entityMap };
      let newShield = state.shield;
      let newRelics = state.relics;
      let newTotalCoins = state.totalCoins;
      let newGems = state.gems;
      let newDeathCause: GameState['deathCause'] = null;
      let newStruckFrom: number | null = null;
      let newWasTeleported = false;
      let newLastPickup: PickupKind | null = null;
      let newVortexCost: 'arrow' | 'gem' | null = null;
      let newChestRelic: RelicId | null = null;
      let chestItems = state.items;
      let newSecrets = state.secretsFound ?? 0;
      let newMarked = state.marked;

      /** A shield or a Phoenix Feather soaks one deadly touch. */
      let absorbedThisMove = false;
      const absorbHit = (): boolean => {
        const absorbed = tryAbsorb(newShield, newRelics);
        if (!absorbed.ok) return false;
        newShield = absorbed.shield;
        newRelics = absorbed.relics;
        absorbedThisMove = true;
        return true;
      };

      const consumeEntity = () => {
        world = removeEntityAt(world, nextIndex);
      };

      // O(1) collision check via the entity map
      const entityAtPoint = state.entityMap[nextIndex];

      switch (entityAtPoint?.type) {
        case 'enemy':
        case 'stalker':
        case 'sleeper':
        case 'mimic':
          if (absorbHit()) {
            // The shield (or feather) breaks and takes the guardian with it.
            consumeEntity();
          } else {
            newIsGameOver = true;
            newDeathCause = entityAtPoint.type;
          }
          break;

        case 'boss':
          if (absorbHit()) {
            // Throws the player back; the Grimbur survives. No movement, so no step cost or bonus.
            nextIndex = state.playerIndex;
            newVisited = [...state.visited];
            newScore = state.score;
          } else {
            newIsGameOver = true;
            newDeathCause = entityAtPoint.warden ? 'warden' : entityAtPoint.mini ? 'brute' : 'boss';
          }
          break;

        case 'thief': {
          // Caught: the thief gives back every gem it carried and runs off for good.
          const loot = entityAtPoint.loot ?? 0;
          const taken = takeGems(state, loot, newTotalCoins);
          newScore += taken.score;
          newGems += taken.gems;
          newAttack += taken.ammo;
          newTotalCoins = taken.total;
          newCoins -= loot;
          newScore += GAME_CONFIG.scoring.pickup;
          newLastPickup = 'thief';
          consumeEntity();
          break;
        }

        case 'chest': {
          // A chest holds a relic, now and for the rest of the run; sometimes a cursed one (never a second).
          const found = chestRelic(state.runSeed, state.level, nextIndex, newRelics, draftContext(state));
          if (found) {
            const gained = gainRelicNow({ ...state, relics: newRelics, attack: newAttack, shield: newShield, items: chestItems, visited: newVisited, marked: newMarked, playerIndex: nextIndex }, found);
            newRelics = gained.relics;
            newAttack = gained.attack;
            newShield = gained.shield;
            chestItems = gained.items;
            newVisited = gained.visited;
            newMarked = gained.marked;
            newChestRelic = found;
          }
          newScore += GAME_CONFIG.scoring.pickup;
          newLastPickup = 'chest';
          consumeEntity();
          break;
        }

        case 'pit': {
          // Vortex: teleport to a safe tile (never onto a hazard).
          const destination = pickTeleportDestination(state, nextIndex, newVisited);
          if (destination === null) {
            newIsGameOver = true;
            newDeathCause = 'pit';
          } else {
            nextIndex = destination;
            newWasTeleported = true;
            // The vortex takes a toll: one arrow, or else one shop gem, or else nothing (the Void Compass pays none).
            if (has('toll_free')) {
              // free passage
            } else if (newAttack > 0) {
              newAttack -= 1;
              newVortexCost = 'arrow';
            } else if (newGems > 0) {
              newGems -= 1;
              newVortexCost = 'gem';
            }
            if (!newVisited.includes(destination)) {
              newVisited = [...newVisited, destination];
            }
          }
          break;
        }

        case 'coin': {
          const taken = takeGems(state, 1, newTotalCoins);
          newScore += taken.score;
          newCoins -= 1;
          newTotalCoins = taken.total;
          newGems += taken.gems;
          newAttack += taken.ammo;
          consumeEntity();
          break;
        }

        case 'trap':
          if (!perks.trapImmune && !has('trap_sense')) {
            newScore += GAME_CONFIG.scoring.trapPenalty * modifiersFor(state.ascension).trapPenaltyMultiplier;
            newLastPickup = 'trap';
          }
          consumeEntity();
          break;

        case 'shield':
          newShield = true;
          newScore += GAME_CONFIG.scoring.pickup;
          newLastPickup = 'shield';
          consumeEntity();
          break;

        case 'ammo':
          newAttack += scaleAmmo(weaponOf(state), GAME_CONFIG.pickups.ammoAmount);
          newScore += GAME_CONFIG.scoring.pickup;
          newLastPickup = 'ammo';
          consumeEntity();
          break;
      }

      // A secret room: its cache, found by following the glint on the tiles beside it (stepped onto, or landed on by a vortex).
      let newSecret = state.secret ?? null;
      if (!newIsGameOver && newSecret !== null && nextIndex === newSecret) {
        newGems += SECRET_GEMS;
        newAttack += scaleAmmo(weaponOf(state), SECRET_ARROWS);
        newScore += secretScore(state.level);
        newSecrets += 1;
        newLastPickup = newLastPickup ?? 'secret';
        newSecret = null;
      }

      // Gem Magnet: gems on the four tiles beside where the hero ends up are taken too, even unseen.
      if (has('magnet') && !newIsGameOver) {
        for (const dir of ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const) {
          const n = neighbour(nextIndex, dir, rows, cols);
          if (n === -1 || world.entityMap[n]?.type !== 'coin') continue;
          const taken = takeGems(state, 1, newTotalCoins);
          newScore += taken.score;
          newCoins -= 1;
          newTotalCoins = taken.total;
          newGems += taken.gems;
          newAttack += taken.ammo;
          world = removeEntityAt(world, n);
          if (!newVisited.includes(n)) newVisited = [...newVisited, n];
        }
      }

      // (The Owl Totem pays for the tiles explored after every action: see payOwl.)
      const newItems = chestItems;

      // Taking the last gem clears the floor before anything can strike, and a hit that was just soaked
      // by a shield (or feather) stuns the hunters for this action, so one move never costs two protections.
      const floorCleared = newCoins === 0 && !newIsGameOver && !hasBoss(world);
      // Wayfarer Boots: retracing explored ground (outside the lair) does not move the hunters' clocks at all.
      // Only the Grimbur's own lair counts: the lieutenant's floor and the Magma Colossus's are not it.
      const retracing = has('iron_boots') && !isNewTile && !entityAtPoint && !hasLairBoss(world);
      const newTurn = retracing ? state.turn : state.turn + 1;
      if (!newIsGameOver && !floorCleared) {
        // Sleepers wake whenever the player ends an action near them, even when a shield just soaked a hit.
        if (!has('lullaby')) world = wakeSleepers(world, nextIndex, cols);
      }
      if (!newIsGameOver && !floorCleared && !absorbedThisMove && !retracing) {
        const acted = huntersAct(world, nextIndex, rows, cols, newTurn, hunterSlowdown(state.relics), modifiersFor(state.ascension).hunterHaste);
        world = acted.world;
        for (const [k, hitter] of acted.hits.entries()) {
          if (!absorbHit()) {
            newIsGameOver = true;
            newDeathCause = hitter;
            newStruckFrom = acted.strikers[k];
            break;
          }
          if (has('thorns')) world = thornsStrike(world, acted.strikers[k]);
        }
      }

      let newIsLevelUp: boolean = state.isLevelUp;
      if (floorCleared && !newIsGameOver) {
        newScore += Math.round(levelClearBonus(state.level) * (1 + 0.5 * has('greed')));
        newGems += has('greed');
        newIsLevelUp = true;
      }

      newScore = Math.max(0, newScore);

      return {
        ...state,
        playerIndex: nextIndex,
        facingDir: direction,
        score: newScore,
        visited: newVisited,
        marked: newMarked,
        isGameOver: newIsGameOver,
        isLevelUp: newIsLevelUp,
        coins: newCoins,
        attack: newAttack,
        entities: world.entities,
        entityMap: world.entityMap,
        enemyCombo: 0,
        shield: newShield,
        relics: newRelics,
        items: newItems,
        totalCoins: newTotalCoins,
        gems: newGems,
        wasTeleported: newWasTeleported,
        vortexCost: newVortexCost,
        lastPickup: newLastPickup,
        chestRelic: newChestRelic,
        secretsFound: newSecrets,
        secret: newSecret,
        turn: newTurn,
        // Retracing with the Wayfarer Boots is not an action for the clocks: the ability does not recharge either.
        abilityCd: retracing ? state.abilityCd : Math.max(0, state.abilityCd - 1),
        // One step per floor can be taken back, never the one that ended the run or cleared the floor.
        undo: state.undoUsed || newIsGameOver || newIsLevelUp ? null : snapshotOf(state),
        lastBreath: newIsGameOver ? snapshotOf(state) : null,
        deathCause: newIsGameOver ? newDeathCause : null,
        struckFrom: newIsGameOver ? newStruckFrom : null,
      };
    }

    case 'ATTACK': {
      if (state.isGameOver || state.isLevelUp || state.pendingDraft || state.attack <= 0) return state;

      const { rows, cols } = state;
      // An aimed shot turns the hero toward the target first; a plain shot keeps the current facing.
      const aim = action.direction ?? state.facingDir;

      // The arrow flies up to its reach and hits the first hostile tile.
      const { targetIndex } = arrowPath(state, aim);
      // The orb and the bomb follow the same flight; their plan adds where they land and the tiles their burst / blast covers.
      const weapon = weaponOf(state);
      const plan = weapon === 'bow' ? null : shotPlan(state, aim);

      let world: World = { entities: state.entities, entityMap: state.entityMap };
      let newScore = state.score;
      let newEnemyCombo = state.enemyCombo;
      let newIsLevelUp = false;
      let newIsVictory = false;
      let newGems = state.gems;
      let arrowBack = 0;
      let killedGuardian = false;
      let newCoinsAfter = state.coins;
      let newTotalCoinsAfter = state.totalCoins;
      let newMarked = state.marked;

      const target = targetIndex !== -1 ? state.entityMap[targetIndex] : undefined;

      if (plan && weapon === 'bomb') {
        const blast = bombBlast(state, plan.area);
        world = blast.world;
        newScore = blast.score;
        newEnemyCombo = blast.combo;
        newGems = blast.gems;
        newCoinsAfter = blast.coins;
        newTotalCoinsAfter = blast.totalCoins;
        newIsLevelUp = blast.levelUp;
        newIsVictory = blast.victory;
        killedGuardian = blast.guardians > 0;
        arrowBack = blast.arrowBack;
        newMarked = blast.marked;
      } else if (target?.type === 'boss') {
        const hurt = hurtBoss(world, targetIndex, state);
        world = hurt.world;
        if (!hurt.killed) {
          newScore += GAME_CONFIG.boss.hitScore;
        } else if (target.mini) {
          // The lieutenant falls: a bounty of shop gems, and the floor is clear once its gems are taken too.
          newScore += Math.round(GAME_CONFIG.boss.killScore / 2);
          newGems += MID_BOSS_GEMS;
          if (state.coins === 0) {
            newScore += Math.round(levelClearBonus(state.level) * (1 + 0.5 * relicCount(state.relics, 'greed')));
            newIsLevelUp = true;
          }
        } else {
          newScore += GAME_CONFIG.boss.killScore;
          if (state.coins === 0) {
            newScore += Math.round(levelClearBonus(state.level) * (1 + 0.5 * relicCount(state.relics, 'greed')));
            newIsLevelUp = true;
            // The endless descent has no final lair: slaying the Grimbur just opens the next floor.
            newIsVictory = state.mode !== 'endless';
          }
        }
        newEnemyCombo = 0;
      } else if (target?.type === 'thief') {
        // A shot thief drops what it stole; the gems count as taken.
        const loot = target.loot ?? 0;
        world = removeEntityAt(world, targetIndex);
        const taken = takeGems(state, loot, state.totalCoins);
        newScore += taken.score;
        newGems += taken.gems;
        arrowBack += taken.ammo;
        newCoinsAfter = state.coins - loot;
        newTotalCoinsAfter = taken.total;
        if (newCoinsAfter === 0 && !hasBoss(world)) {
          newScore += Math.round(levelClearBonus(state.level) * (1 + 0.5 * relicCount(state.relics, 'greed')));
          newIsLevelUp = true;
        }
      } else if (target && GUARDIAN_TYPES.includes(target.type)) {
        newEnemyCombo = Math.min(
          state.enemyCombo + 1,
          GAME_CONFIG.multipliers.maxCombo + relicCount(state.relics, 'hunter'),
        );
        newScore += killValue(newEnemyCombo) * (relicCount(state.relics, 'reaper') > 0 ? 2 : 1);
        world = removeEntityAt(world, targetIndex);
        killedGuardian = true;
        if (relicCount(state.relics, 'hunter') > 0) newGems += 1; // Hunter's Mark: every kill drops a shop gem
        // Echo Arrow: a kill from two or more tiles away gives the arrow back.
        if (relicCount(state.relics, 'echo_arrow') > 0 && manhattan(targetIndex, state.playerIndex, cols) >= 2) arrowBack = 1;
        // Piercing Head: the arrow flies on through the fallen guardian and can slay one more.
        if (relicCount(state.relics, 'piercing') > 0) {
          const second = arrowPath({ ...state, entityMap: world.entityMap }, aim).targetIndex;
          const behind = second !== -1 ? world.entityMap[second] : undefined;
          if (behind && GUARDIAN_TYPES.includes(behind.type)) {
            newEnemyCombo = Math.min(newEnemyCombo + 1, GAME_CONFIG.multipliers.maxCombo + relicCount(state.relics, 'hunter'));
            newScore += killValue(newEnemyCombo) * (relicCount(state.relics, 'reaper') > 0 ? 2 : 1);
            world = removeEntityAt(world, second);
            if (relicCount(state.relics, 'hunter') > 0) newGems += 1;
          }
        }
      } else {
        newScore += GAME_CONFIG.scoring.missPenalty;
        newEnemyCombo = 0;
        // Reaper's Scythe: a miss costs a second arrow.
        if (relicCount(state.relics, 'reaper') > 0) arrowBack = -1;
      }

      // Flare Arrow: the tiles the arrow crossed light up; empty ones are explored, vortexes and traps get marked.
      let newVisited = state.visited;
      if (plan && (weapon === 'orb' || relicCount(state.relics, 'flare_arrow') > 0)) {
        // The orb's burst (and a Flare Arrow's bomb): the tiles around where it landed light up, the dangers there get flagged.
        const lit = lightArea(world, plan.area, state.visited);
        if (lit.safe.length > 0) newVisited = [...state.visited, ...lit.safe];
        if (lit.danger.length > 0) newMarked = Array.from(new Set([...newMarked, ...lit.danger]));
      } else if (!plan && relicCount(state.relics, 'flare_arrow') > 0) {
        const lit = arrowPath(state, aim).tiles.filter(i => i !== targetIndex && !state.visited.includes(i));
        const danger = lit.filter(i => state.entityMap[i]?.type === 'pit' || state.entityMap[i]?.type === 'trap');
        const safe = lit.filter(i => !danger.includes(i));
        if (safe.length > 0) newVisited = [...state.visited, ...safe];
        if (danger.length > 0) newMarked = Array.from(new Set([...state.marked, ...danger]));
      }

      // Shooting is a turn: the hunting Grimbur keeps closing in while you aim.
      let newShield = state.shield;
      let newRelics = state.relics;
      let newIsGameOver = false;
      let newDeathCause: GameState['deathCause'] = null;
      let newStruckFrom: number | null = null;
      const newTurn = state.turn + 1;

      // Stunning Blow: a kill leaves the hunters standing for this action.
      const stunned = killedGuardian && relicCount(state.relics, 'stun_shot') > 0;
      // A bomb is loud: the sleepers near the blast wake up (before the hunters act), stunned or not.
      if (plan && weapon === 'bomb' && plan.landing !== -1 && !newIsLevelUp && relicCount(state.relics, 'lullaby') === 0) {
        world = wakeNear(world, plan.landing, cols, BOMB_WAKE);
      }
      if (!newIsLevelUp && !stunned) {
        if (relicCount(state.relics, 'lullaby') === 0) world = wakeSleepers(world, state.playerIndex, cols);
        const acted = huntersAct(world, state.playerIndex, rows, cols, newTurn, hunterSlowdown(state.relics), modifiersFor(state.ascension).hunterHaste);
        world = acted.world;
        for (const [k, hitter] of acted.hits.entries()) {
          const absorbed = tryAbsorb(newShield, newRelics);
          if (absorbed.ok) {
            newShield = absorbed.shield;
            newRelics = absorbed.relics;
            if (relicCount(state.relics, 'thorns') > 0) world = thornsStrike(world, acted.strikers[k]);
          } else {
            newIsGameOver = true;
            newDeathCause = hitter;
            newStruckFrom = acted.strikers[k];
            break;
          }
        }
      }

      return {
        ...state,
        facingDir: aim,
        attack: Math.max(0, state.attack - 1 + arrowBack),
        coins: newCoinsAfter,
        totalCoins: newTotalCoinsAfter,
        visited: newVisited,
        marked: newMarked,
        gems: newGems + (newIsLevelUp ? relicCount(state.relics, 'greed') : 0),
        vortexCost: null,
        score: Math.max(0, newScore),
        entities: world.entities,
        entityMap: world.entityMap,
        enemyCombo: newEnemyCombo,
        isLevelUp: newIsLevelUp,
        isVictory: newIsVictory,
        isGameOver: newIsGameOver,
        deathCause: newIsGameOver ? newDeathCause : null,
        struckFrom: newIsGameOver ? newStruckFrom : null,
        shield: newShield,
        relics: newRelics,
        turn: newTurn,
        abilityCd: Math.max(0, state.abilityCd - 1),
        undo: null,
        lastBreath: newIsGameOver ? snapshotOf(state) : null,
        lastPickup: null,
      };
    }

    case 'LEVEL_UP': {
      // Only a cleared, non-final floor with no draft pending can advance (guards double dispatches).
      if (!state.isLevelUp || state.isVictory || state.pendingDraft || state.isGameOver) return state;
      const { rows, cols, coins, attack, seed, omen, skip = 0 } = action.payload;
      const split = splitSecret(action.payload.entities);
      const entities = split.entities;
      const secret = state.features && !state.features.secrets ? null : split.secret;
      const weapon = weaponOf(state);
      // Bombs are scarcer: the floor's own grant is halved (rounded up), never below one. The relics' flat bonuses below then
      // count in bombs (the Quiver's +1 is one more bomb, the Blood Pact's -1 one bomb less, the Dice's +3 two more bombs), as
      // their texts say; halving after them used to round most of them away.
      let arrows = attack + state.perks.bonusArrows;
      if (weapon === 'bomb') arrows = Math.max(1, scaleAmmo(weapon, arrows));
      arrows += relicCount(state.relics, 'quiver');
      if (relicCount(state.relics, 'blood_pact') > 0) arrows = Math.max(1, arrows - 1);
      if (relicCount(state.relics, 'glass_bow') > 0) arrows = Math.max(1, Math.floor(arrows / 2));
      if (relicCount(state.relics, 'gambler') > 0) {
        const roll = gamblerRoll(state.runSeed, state.level + 1);
        arrows = Math.max(1, arrows + (roll > 0 ? scaleAmmo(weapon, roll) : roll));
      }
      // The archers' set bonus: one more arrow (bomb) on every floor.
      if (hasFamilyBonus(state.relics, 'archer')) arrows += 1;
      // Arrows are a resource: some of the unused ones come along to the next floor.
      arrows += Math.min(scaleAmmo(weapon, GAME_CONFIG.arrows.carryOverCap), Math.max(0, state.attack));
      arrows = floorAmmo(weapon, arrows + state.pendingArrows, entities);
      const draft = nonEmpty(withSeasonRelic(draftRelics(state.runSeed, state.level, state.relics, modifiersFor(state.ascension).draftSize + state.draftBonus, draftContext(state)), state));
      return {
        ...state,
        level: state.level + 1 + skip,
        // The floors a shortcut jumped pay their clearing bonus.
        score: state.score + Array.from({ length: skip }, (_, k) => levelClearBonus(state.level + 1 + k)).reduce((a, b) => a + b, 0),
        rows,
        cols,
        entities,
        entityMap: createEntityMap(entities),
        secret,
        coins,
        attack: arrows,
        pendingArrows: 0,
        shield: state.shield || state.perks.startShield || relicCount(state.relics, 'bulwark') > 0,
        seed: seed || state.seed,
        playerIndex: 0,
        visited: startingVisited(cols, rows, relicCount(state.relics, 'lantern') > 0 || state.perks.startLit, entities),
        // With every relic maxed there is nothing to offer: no draft, rather than an empty one that blocks input.
        pendingDraft: draft,
        // An elite floor cleared earns a second pick, like the altar (the two do not add up to a third).
        altarPending: draft ? state.altarPending || !!floorEffects(state.omen, state.event).extraRelic : false,
        altarUsed: false,
        omen: omen ?? null,
        encounter: (() => {
          if (state.features && !state.features.encounters) return null;
          const id = encounterFor(state.runSeed, state.level + 1 + skip, state.mode, state.event);
          return id ? { id } : null;
        })(),
        marked: relicCount(state.relics, 'raven_eye') > 0 ? nearestDanger(entities, cols) : [],
        // The Powder Belt's bomb and the explorers' set bonus (a detector charge) on every floor, never past the bag.
        items: {
          bomb: Math.min(MAX_ITEMS, state.items.bomb + (relicCount(state.relics, 'bomb_belt') > 0 ? 1 : 0)),
          detector: Math.min(MAX_ITEMS, state.items.detector + (hasFamilyBonus(state.relics, 'explorer') ? 1 : 0)),
        },
        // The looters' set bonus: shop gems on every new floor.
        gems: state.gems + (hasFamilyBonus(state.relics, 'looter') ? LOOTER_GEMS : 0),
        abilityCd: 0,
        undo: null,
        undoUsed: false,
        hourglassUsed: false,
        merchantUsed: false,
        turn: 0,
        isLevelUp: false,
        isGameOver: false,
        enemyCombo: 0,
        deathCause: null,
        lastPickup: null,
        vortexCost: null,
        wasTeleported: false,
      };
    }

    case 'RESOLVE_ENCOUNTER':
      return resolveEncounter(state, action.take);

    case 'DISMISS_ENCOUNTER':
      return state.encounter?.outcome ? { ...state, encounter: null } : state;

    case 'PICK_RELIC': {
      if (!state.pendingDraft || !state.pendingDraft.includes(action.id)) return state;

      const gained = gainRelicNow(state, action.id);
      const relics = gained.relics;
      // The altar buys a second pick right after the first.
      const second = state.altarPending
        ? nonEmpty(draftRelics(state.runSeed, 500 + state.level, relics, modifiersFor(state.ascension).draftSize + state.draftBonus, draftContext(state)))
        : null;
      return {
        ...state,
        relics,
        pendingDraft: second,
        altarPending: false,
        // Relics with an immediate effect on the floor that is already loaded:
        attack: gained.attack,
        items: gained.items,
        shield: gained.shield,
        visited: gained.visited,
        marked: gained.marked,
      };
    }

    case 'BUY': {
      if (!state.isLevelUp || state.isVictory || state.pendingDraft || state.isGameOver) return state;
      const price = SHOP_PRICES[action.item];
      if (state.gems < price) return state;
      switch (action.item) {
        case 'arrows':
          return { ...state, gems: state.gems - price, pendingArrows: state.pendingArrows + scaleAmmo(weaponOf(state), SHOP_ARROWS) };
        case 'shield':
          return state.shield ? state : { ...state, gems: state.gems - price, shield: true };
        case 'detector':
        case 'bomb':
          return state.items[action.item] >= MAX_ITEMS
            ? state
            : { ...state, gems: state.gems - price, items: { ...state.items, [action.item]: state.items[action.item] + 1 } };
        default:
          return state;
      }
    }

    case 'SELL_ARROWS': {
      if (!state.isLevelUp || state.isVictory || state.pendingDraft || state.isGameOver) return state;
      // The merchant takes fewer bombs for the same gems (a bomb is worth two arrows).
      const sold = scaleAmmo(weaponOf(state), MERCHANT_ARROWS);
      if (state.merchantUsed || state.attack < sold) return state;
      return { ...state, attack: state.attack - sold, gems: state.gems + MERCHANT_GEMS, merchantUsed: true };
    }

    case 'ALTAR': {
      if (!state.isLevelUp || state.isVictory || state.pendingDraft || state.isGameOver) return state;
      if (!state.shield || state.altarUsed) return state;
      // A hero or relic that hands the shield back every floor would make the offering free.
      if (altarIsFree(state)) return state;
      return { ...state, shield: false, altarUsed: true, altarPending: true };
    }

    case 'USE_ITEM': {
      if (state.isGameOver || state.isLevelUp || state.pendingDraft || state.items[action.item] <= 0) return state;
      const items = { ...state.items, [action.item]: state.items[action.item] - 1 };

      if (action.item === 'detector') {
        // Shows every hostile tile within two steps; it costs no turn.
        const found = state.entities
          .filter(e => LETHAL_TYPES.includes(e.type) && manhattan(e.index, state.playerIndex, state.cols) <= 2)
          .map(e => e.index);
        return { ...state, items, marked: Array.from(new Set([...state.marked, ...found])) };
      }

      // Bomb: destroys every guardian and vortex in the 3x3 around the player (not the Grimbur), then the hunters act.
      const world = blastWorld({ entities: state.entities, entityMap: state.entityMap }, state.playerIndex, state.cols);
      return settle(state, world, { items, marked: state.marked.filter(i => world.entityMap[i]) });
    }

    case 'USE_ABILITY': {
      const ability = state.perks.ability;
      if (!ability || state.abilityCd > 0 || state.isGameOver || state.isLevelUp || state.pendingDraft) return state;
      const { rows, cols } = state;
      let world: World = { entities: state.entities, entityMap: state.entityMap };
      const cooldown = { abilityCd: Math.max(1, abilityCooldown(ability) - (state.perks.abilityHaste ?? 0)) };

      if (ability === 'brace') {
        if (state.shield) return state;
        return settle(state, world, { ...cooldown, shield: true });
      }

      if (ability === 'scout') {
        // A safe unexplored tile beside the explored area that the player could NOT already deduce, preferring the one
        // with the most unexplored neighbours (the most new information); the nearest one breaks ties.
        const seen = new Set(state.visited);
        const known = provenSafeTiles(rows, cols, state.entities, state.visited);
        const candidates = new Set<number>();
        for (const v of state.visited) {
          for (const d of ['UP', 'DOWN', 'LEFT', 'RIGHT'] as Direction[]) {
            const n = neighbour(v, d, rows, cols);
            if (n !== -1 && !seen.has(n) && !staysDark(state.entityMap[n])) candidates.add(n);
          }
        }
        if (candidates.size === 0) return state;
        const unknownAround = (n: number) =>
          (['UP', 'DOWN', 'LEFT', 'RIGHT'] as Direction[]).filter(d => {
            const m = neighbour(n, d, rows, cols);
            return m !== -1 && !seen.has(m);
          }).length;
        const hidden = [...candidates].filter(n => !known.has(n));
        const pool = hidden.length > 0 ? hidden : [...candidates];
        const best = pool.reduce((a, b) => {
          const ua = unknownAround(a);
          const ub = unknownAround(b);
          if (ub !== ua) return ub > ua ? b : a;
          const da = manhattan(a, state.playerIndex, cols);
          const db = manhattan(b, state.playerIndex, cols);
          return db < da || (db === da && b < a) ? b : a;
        });
        return settle(state, world, { ...cooldown, visited: [...state.visited, best] });
      }

      if (ability === 'blast') {
        // The bomb's effect without spending a bomb.
        world = blastWorld(world, state.playerIndex, cols);
        return settle(state, world, { ...cooldown, marked: state.marked.filter(i => world.entityMap[i]) });
      }

      if (ability === 'flare') {
        // Every tile within two steps that is not lethal becomes explored; hazards stay hidden (their clues show).
        const seen = new Set(state.visited);
        const lit: number[] = [];
        for (let i = 0; i < rows * cols; i++) {
          if (seen.has(i) || manhattan(i, state.playerIndex, cols) > FLARE_REACH) continue;
          if (staysDark(state.entityMap[i])) continue;
          lit.push(i);
        }
        if (lit.length === 0) return state;
        return settle(state, world, { ...cooldown, visited: [...state.visited, ...lit] });
      }

      if (ability === 'magnet') {
        const gems = state.entities.filter(e => e.type === 'coin');
        if (gems.length === 0) return state;
        const nearest = gems.reduce((a, b) => (manhattan(b.index, state.playerIndex, cols) < manhattan(a.index, state.playerIndex, cols) ? b : a));
        world = removeEntityAt(world, nearest.index);
        const taken = takeGems(state, 1, state.totalCoins);
        return settle(state, world, {
          ...cooldown,
          coins: state.coins - 1,
          totalCoins: taken.total,
          gems: state.gems + taken.gems,
          score: state.score + taken.score,
          attack: state.attack + taken.ammo,
          visited: state.visited.includes(nearest.index) ? state.visited : [...state.visited, nearest.index],
        });
      }

      // volley: along the facing line, up to two guardians within reach; a Grimbur in the line takes one heart and stops it.
      let score = state.score;
      let combo = state.enemyCombo;
      let hits = 0;
      let bonusGems = 0;
      let cursor = state.playerIndex;
      for (let step = 0; step < VOLLEY_REACH && hits < VOLLEY_TARGETS; step++) {
        cursor = neighbour(cursor, state.facingDir, rows, cols);
        if (cursor === -1) break;
        const target = world.entityMap[cursor];
        if (!target) continue;
        if (target.type === 'boss') {
          const hurt = hurtBoss(world, cursor, state);
          world = hurt.world;
          if (!hurt.killed) {
            score += GAME_CONFIG.boss.hitScore;
          } else if (target.mini) {
            // The lieutenant (or the Magma Colossus) pays what it pays to a shot: half the bounty and its shop gems.
            score += Math.round(GAME_CONFIG.boss.killScore / 2);
            bonusGems += MID_BOSS_GEMS;
          } else {
            score += GAME_CONFIG.boss.killScore;
          }
          break;
        }
        if (GUARDIAN_TYPES.includes(target.type)) {
          combo = Math.min(combo + 1, GAME_CONFIG.multipliers.maxCombo + relicCount(state.relics, 'hunter'));
          score += killValue(combo) * (relicCount(state.relics, 'reaper') > 0 ? 2 : 1);
          world = removeEntityAt(world, cursor);
          if (relicCount(state.relics, 'hunter') > 0) bonusGems += 1;
          hits++;
        }
      }
      // Stunning Blow: a volley that slays a guardian leaves the hunters standing, like a killing shot.
      return settle(state, world, { ...cooldown, score, enemyCombo: combo, gems: state.gems + bonusGems }, { stunned: hits > 0 && relicCount(state.relics, 'stun_shot') > 0 });
    }

    case 'UNDO': {
      if (!state.undo || state.undoUsed || state.isGameOver || state.isLevelUp || state.pendingDraft) return state;
      // The Sand Hourglass keeps a second take-back for the floor.
      const spare = relicCount(state.relics, 'hourglass') > 0 && !state.undo.hourglassUsed;
      return { ...state.undo, undo: null, undoUsed: !spare, hourglassUsed: state.undo.hourglassUsed || spare };
    }

    case 'REVIVE': {
      const before = state.lastBreath;
      if (!state.isGameOver || state.isVictory || !before || state.mode === 'daily') return state;
      // Back to just before the fatal action, with a shield and a few arrows; what struck is flagged so it is not walked into blind:
      // the tile the hero stepped onto when it held what killed, or else the tile of the hunter that struck from beside the hero
      // (it stays flagged until it moves). The hero's own tile is never flagged.
      const killer = state.playerIndex;
      const deadly = !!state.entityMap[killer] && killer !== before.playerIndex;
      const hunterAt = state.struckFrom ?? -1;
      const flagged = deadly ? killer : hunterAt !== -1 && before.entityMap[hunterAt] ? hunterAt : -1;
      const marked = flagged !== -1 && !before.marked.includes(flagged) ? [...before.marked, flagged] : before.marked;
      return { ...before, undo: null, lastBreath: null, revives: (state.revives ?? 0) + 1, shield: true, attack: Math.max(before.attack, scaleAmmo(weaponOf(state), REVIVE_ARROWS)), marked, isGameOver: false, deathCause: null, struckFrom: null };
    }

    case 'REFILL': {
      // The daily is the same cave and the same tools for everyone: nothing is bought there.
      if (state.isGameOver || state.isVictory || state.isLevelUp || state.pendingDraft || state.mode === 'daily') return state;
      return { ...state, attack: state.attack + scaleAmmo(weaponOf(state), REFILL_ARROWS), refills: (state.refills ?? 0) + 1 };
    }

    case 'RESET': {
      const { character, rows, cols, coins, attack, seed, mode, runSeed, perks, ascension, draftBonus, startShield, startRelics, seasonRelic, event } = action;
      const split = splitSecret(action.entities);
      const entities = split.entities;
      const secret = action.features && !action.features.secrets ? null : split.secret;
      const heroPerks = perks ?? NO_PERKS;
      const startingRelics: RelicId[] = startRelics ? [...startRelics] : [];
      const withRelic = (id: RelicId) => relicCount(startingRelics, id) > 0;
      const weapon = heroPerks.weapon ?? 'bow';
      let ammo = attack + heroPerks.bonusArrows + (withRelic('quiver') ? 2 : 0);
      if (weapon === 'bomb') ammo = Math.max(1, scaleAmmo(weapon, ammo));
      ammo = floorAmmo(weapon, ammo, entities);
      return {
        ...initialState,
        selectedCharacter: character,
        rows,
        cols,
        secret,
        features: action.features,
        entities,
        entityMap: createEntityMap(entities),
        coins,
        // Relics the run begins with act at once, exactly as if they had just been picked: the Quiver adds its two
        // arrows, the Bulwark its shield and the Lantern lights the area around the start.
        attack: ammo,
        shield: heroPerks.startShield || startShield === true || withRelic('bulwark'),
        perks: heroPerks,
        seed,
        runSeed: runSeed ?? seed ?? 0,
        mode: mode ?? 'expedition',
        ascension: ascension ?? 0,
        draftBonus: draftBonus ?? 0,
        seasonRelic: seasonRelic ?? null,
        event: event ?? null,
        relics: startingRelics,
        visited: startingVisited(cols, rows, withRelic('lantern') || heroPerks.startLit, entities),
        items: { ...heroPerks.startItems },
        playerIndex: 0,
        totalCoins: 0,
      };
    }

    case 'RESTORE': {
      const loaded = action.state;
      if (!loaded.entities.some(e => e.type === 'secret')) return loaded;
      const { entities, secret } = splitSecret(loaded.entities);
      return { ...loaded, entities, entityMap: createEntityMap(entities), secret };
    }

    default:
      return state;
  }
}
