import { GameState, GameAction, GameEntity, PickupKind, LETHAL_TYPES, GUARDIAN_TYPES, Direction, UndoSnapshot } from './types';
import { GAME_CONFIG } from '../../config/gameConfig';
import { createPRNG } from '../random/prng';
import { coinReward, killValue, levelClearBonus } from './scoring';
import { omenEffects } from './omens';
import { NO_PERKS } from './heroes';
import { modifiersFor } from './ascension';
import { REFILL_ARROWS, REVIVE_ARROWS } from './revive';
import { RelicId, draftRelics, relicCount } from './relics';
import { SHOP_PRICES, SHOP_ARROWS, MAX_ITEMS, abilityCooldown } from './shop';
import { provenSafeTiles } from './solver';
import { VOLLEY_REACH, VOLLEY_TARGETS, FLARE_REACH } from './abilities';
import { createEntityMap, removeEntityAt, startingVisited, tryAbsorb, nonEmpty, draftContext, blastWorld, hasBoss, neighbour, pickTeleportDestination, huntersAct, hunterSlowdown, manhattan, wakeSleepers, gemYield, hurtBoss } from './worldHelpers';
import type { World } from './worldHelpers';

/** The state without its undo slot: what a step back restores. */
const snapshotOf = (state: GameState): UndoSnapshot => {
  const { undo: _undo, ...rest } = state;
  return rest;
};

/**
 * Finishes an action that is not a step (ability, bomb): it takes a turn, clears the floor when the last gem or the
 * Wumpus is gone and otherwise lets the hunters act. `patch` carries what the action changed.
 */
const settle = (state: GameState, world: World, patch: Partial<GameState>): GameState => {
  const { rows, cols } = state;
  const hadBoss = hasBoss({ entities: state.entities, entityMap: state.entityMap });
  const coins = patch.coins ?? state.coins;
  let score = patch.score ?? state.score;
  let shield = patch.shield ?? state.shield;
  let relics = patch.relics ?? state.relics;
  const turn = state.turn + 1;
  const cleared = coins === 0 && !hasBoss(world);
  let over = false;
  let cause: GameState['deathCause'] = null;

  let gems = patch.gems ?? state.gems;
  if (cleared) {
    score += Math.round(levelClearBonus(state.level) * (1 + 0.5 * relicCount(relics, 'greed')));
    gems += relicCount(relics, 'greed');
  } else {
    world = wakeSleepers(world, state.playerIndex, cols);
    const acted = huntersAct(world, state.playerIndex, rows, cols, turn, hunterSlowdown(relics), modifiersFor(state.ascension).hunterHaste);
    world = acted.world;
    for (const hitter of acted.hits) {
      const absorbed = tryAbsorb(shield, relics);
      if (absorbed.ok) {
        shield = absorbed.shield;
        relics = absorbed.relics;
      } else {
        over = true;
        cause = hitter;
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
 * Wumpus Adventures — Pure Reducer
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
    if (type === 'boss' || (type && GUARDIAN_TYPES.includes(type))) return { tiles, targetIndex: cursor };
  }
  return { tiles, targetIndex: -1 };
}

/** The altar costs the shield; where the next floor gives it back for nothing (Borin, the Bulwark) it would cost nothing. */
export const altarIsFree = (state: Pick<GameState, 'perks' | 'relics'>): boolean => state.perks.startShield || relicCount(state.relics, 'bulwark') > 0;

/** The most times a lair rescues a hero that ran out of arrows. */
export const MAX_LAIR_RESCUES = 2;

/**
 * The Wumpus can only be slain with arrows. A hero with none left, with none lying on the floor, cannot win the fight: the
 * run would only wait for the Wumpus to catch up. So when that happens on the lair floor, a few bundles turn up on free tiles
 * (enough for the Wumpus' remaining hearts), up to MAX_LAIR_RESCUES times. It only ever happens at zero arrows, so it never
 * makes shots free: a hero that still holds an arrow, or has one to pick up, is left alone.
 */
export function ensureWinnable(state: GameState): GameState {
  if (state.isGameOver || state.isVictory || state.pendingDraft || state.isLevelUp) return state;
  if (state.attack > 0 || (state.lairRescues ?? 0) >= MAX_LAIR_RESCUES) return state;
  const boss = state.entities.find(e => e.type === 'boss');
  if (!boss || (boss.hp ?? 0) < 1) return state;
  if (state.entities.some(e => e.type === 'ammo')) return state;

  const wanted = Math.max(1, Math.ceil((boss.hp ?? 1) / GAME_CONFIG.pickups.ammoAmount));
  const total = state.rows * state.cols;
  const rnd = createPRNG(((state.seed ^ Math.imul(state.turn + 1, 2654435761)) >>> 0) || 1);
  rnd(); // discard the weakly-mixed first sample
  const taken = new Set<number>([state.playerIndex, ...state.entities.map(e => e.index)]);
  const placed: GameEntity[] = [];
  for (let tries = 0; placed.length < wanted && tries < total * 4; tries++) {
    const index = Math.floor(rnd() * total);
    if (taken.has(index)) continue;
    taken.add(index);
    placed.push({ index, type: 'ammo' });
  }
  if (placed.length === 0) return state;
  const entities = [...state.entities, ...placed];
  return { ...state, entities, entityMap: createEntityMap(entities), lairRescues: (state.lairRescues ?? 0) + 1 };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const next = reduceCore(state, action);
  // A new floor starts its own count of rescues.
  const fresh = next.level !== state.level || next.runSeed !== state.runSeed ? { ...next, lairRescues: 0 } : next;
  return ensureWinnable(fresh);
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
      let newWasTeleported = false;
      let newLastPickup: PickupKind | null = null;
      let newVortexCost: 'arrow' | 'gem' | null = null;

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
            // Throws the player back; the Wumpus survives. No movement, so no step cost or bonus.
            nextIndex = state.playerIndex;
            newVisited = [...state.visited];
            newScore = state.score;
          } else {
            newIsGameOver = true;
            newDeathCause = 'boss';
          }
          break;

        case 'pit': {
          // Vortex: teleport to a safe tile (never onto a hazard).
          const destination = pickTeleportDestination(state, nextIndex, newVisited);
          if (destination === null) {
            newIsGameOver = true;
            newDeathCause = 'pit';
          } else {
            nextIndex = destination;
            newWasTeleported = true;
            // The vortex takes a toll: one arrow, or else one shop gem, or else nothing.
            if (newAttack > 0) {
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

        case 'coin':
          newScore += coinReward(state.level, perks.coinMultiplier * omenEffects(state.omen).gemMultiplier * (has('blood_pact') ? 1.5 : 1), has('lucky_coin'));
          newCoins -= 1;
          newTotalCoins += 1;
          newGems += gemYield(state, newTotalCoins);
          consumeEntity();
          break;

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
          newAttack += GAME_CONFIG.pickups.ammoAmount;
          newScore += GAME_CONFIG.scoring.pickup;
          newLastPickup = 'ammo';
          consumeEntity();
          break;
      }

      // Taking the last gem clears the floor before anything can strike, and a hit that was just soaked
      // by a shield (or feather) stuns the hunters for this action, so one move never costs two protections.
      const floorCleared = newCoins === 0 && !newIsGameOver && !hasBoss(world);
      // Wayfarer Boots: retracing explored ground (outside the lair) does not move the hunters' clocks at all.
      const retracing = has('iron_boots') && !isNewTile && !entityAtPoint && !hasBoss(world);
      const newTurn = retracing ? state.turn : state.turn + 1;
      if (!newIsGameOver && !floorCleared) {
        // Sleepers wake whenever the player ends an action near them, even when a shield just soaked a hit.
        world = wakeSleepers(world, nextIndex, cols);
      }
      if (!newIsGameOver && !floorCleared && !absorbedThisMove && !retracing) {
        const acted = huntersAct(world, nextIndex, rows, cols, newTurn, hunterSlowdown(state.relics), modifiersFor(state.ascension).hunterHaste);
        world = acted.world;
        for (const hitter of acted.hits) {
          if (!absorbHit()) {
            newIsGameOver = true;
            newDeathCause = hitter;
            break;
          }
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
        isGameOver: newIsGameOver,
        isLevelUp: newIsLevelUp,
        coins: newCoins,
        attack: newAttack,
        entities: world.entities,
        entityMap: world.entityMap,
        enemyCombo: 0,
        shield: newShield,
        relics: newRelics,
        totalCoins: newTotalCoins,
        gems: newGems,
        wasTeleported: newWasTeleported,
        vortexCost: newVortexCost,
        lastPickup: newLastPickup,
        turn: newTurn,
        abilityCd: Math.max(0, state.abilityCd - 1),
        // One step per floor can be taken back, never the one that ended the run or cleared the floor.
        undo: state.undoUsed || newIsGameOver || newIsLevelUp ? null : snapshotOf(state),
        lastBreath: newIsGameOver ? snapshotOf(state) : null,
        deathCause: newIsGameOver ? newDeathCause : null,
      };
    }

    case 'ATTACK': {
      if (state.isGameOver || state.isLevelUp || state.pendingDraft || state.attack <= 0) return state;

      const { rows, cols } = state;
      // An aimed shot turns the hero toward the target first; a plain shot keeps the current facing.
      const aim = action.direction ?? state.facingDir;

      // The arrow flies up to its reach and hits the first hostile tile.
      const { targetIndex } = arrowPath(state, aim);

      let world: World = { entities: state.entities, entityMap: state.entityMap };
      let newScore = state.score;
      let newEnemyCombo = state.enemyCombo;
      let newIsLevelUp = false;
      let newIsVictory = false;
      let newGems = state.gems;

      const target = targetIndex !== -1 ? state.entityMap[targetIndex] : undefined;

      if (target?.type === 'boss') {
        const hurt = hurtBoss(world, targetIndex, state);
        world = hurt.world;
        if (!hurt.killed) {
          newScore += GAME_CONFIG.boss.hitScore;
        } else {
          newScore += GAME_CONFIG.boss.killScore;
          if (state.coins === 0) {
            newScore += Math.round(levelClearBonus(state.level) * (1 + 0.5 * relicCount(state.relics, 'greed')));
            newIsLevelUp = true;
            // The endless descent has no final lair: slaying the Wumpus just opens the next floor.
            newIsVictory = state.mode !== 'endless';
          }
        }
        newEnemyCombo = 0;
      } else if (target && GUARDIAN_TYPES.includes(target.type)) {
        newEnemyCombo = Math.min(
          state.enemyCombo + 1,
          GAME_CONFIG.multipliers.maxCombo + relicCount(state.relics, 'hunter'),
        );
        newScore += killValue(newEnemyCombo);
        world = removeEntityAt(world, targetIndex);
        if (relicCount(state.relics, 'hunter') > 0) newGems += 1; // Hunter's Mark: every kill drops a shop gem
      } else {
        newScore += GAME_CONFIG.scoring.missPenalty;
        newEnemyCombo = 0;
      }

      // Shooting is a turn: the hunting Wumpus keeps closing in while you aim.
      let newShield = state.shield;
      let newRelics = state.relics;
      let newIsGameOver = false;
      let newDeathCause: GameState['deathCause'] = null;
      const newTurn = state.turn + 1;

      if (!newIsLevelUp) {
        world = wakeSleepers(world, state.playerIndex, cols);
        const acted = huntersAct(world, state.playerIndex, rows, cols, newTurn, hunterSlowdown(state.relics), modifiersFor(state.ascension).hunterHaste);
        world = acted.world;
        for (const hitter of acted.hits) {
          const absorbed = tryAbsorb(newShield, newRelics);
          if (absorbed.ok) {
            newShield = absorbed.shield;
            newRelics = absorbed.relics;
          } else {
            newIsGameOver = true;
            newDeathCause = hitter;
            break;
          }
        }
      }

      return {
        ...state,
        facingDir: aim,
        attack: state.attack - 1,
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
      const { rows, cols, entities, coins, attack, seed, omen } = action.payload;
      let arrows = attack + state.perks.bonusArrows + relicCount(state.relics, 'quiver');
      if (relicCount(state.relics, 'blood_pact') > 0) arrows = Math.max(1, arrows - 1);
      if (relicCount(state.relics, 'glass_bow') > 0) arrows = Math.max(1, Math.floor(arrows / 2));
      // Arrows are a resource: some of the unused ones come along to the next floor.
      arrows += Math.min(GAME_CONFIG.arrows.carryOverCap, Math.max(0, state.attack));
      const draft = nonEmpty(draftRelics(state.runSeed, state.level, state.relics, modifiersFor(state.ascension).draftSize + state.draftBonus, draftContext(state)));
      return {
        ...state,
        level: state.level + 1,
        rows,
        cols,
        entities,
        entityMap: createEntityMap(entities),
        coins,
        attack: arrows + state.pendingArrows,
        pendingArrows: 0,
        shield: state.shield || state.perks.startShield || relicCount(state.relics, 'bulwark') > 0,
        seed: seed || state.seed,
        playerIndex: 0,
        visited: startingVisited(cols, rows, relicCount(state.relics, 'lantern') > 0 || state.perks.startLit, entities),
        // With every relic maxed there is nothing to offer: no draft, rather than an empty one that blocks input.
        pendingDraft: draft,
        altarPending: draft ? state.altarPending : false,
        altarUsed: false,
        omen: omen ?? null,
        marked: [],
        abilityCd: 0,
        undo: null,
        undoUsed: false,
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

    case 'PICK_RELIC': {
      if (!state.pendingDraft || !state.pendingDraft.includes(action.id)) return state;

      const relics = [...state.relics, action.id];
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
        attack: action.id === 'quiver' ? state.attack + 2 : state.attack,
        shield: action.id === 'bulwark' ? true : state.shield,
        visited: action.id === 'lantern'
          ? Array.from(new Set([...state.visited, ...startingVisited(state.cols, state.rows, true, state.entities)]))
          : state.visited,
      };
    }

    case 'BUY': {
      if (!state.isLevelUp || state.isVictory || state.pendingDraft || state.isGameOver) return state;
      const price = SHOP_PRICES[action.item];
      if (state.gems < price) return state;
      switch (action.item) {
        case 'arrows':
          return { ...state, gems: state.gems - price, pendingArrows: state.pendingArrows + SHOP_ARROWS };
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

      // Bomb: destroys every guardian and vortex in the 3x3 around the player (not the Wumpus), then the hunters act.
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
            if (n !== -1 && !seen.has(n) && !(state.entityMap[n] && LETHAL_TYPES.includes(state.entityMap[n].type))) candidates.add(n);
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
          const e = state.entityMap[i];
          if (e && LETHAL_TYPES.includes(e.type)) continue;
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
        const reward = coinReward(state.level, state.perks.coinMultiplier * omenEffects(state.omen).gemMultiplier * (relicCount(state.relics, 'blood_pact') > 0 ? 1.5 : 1), relicCount(state.relics, 'lucky_coin'));
        return settle(state, world, {
          ...cooldown,
          coins: state.coins - 1,
          totalCoins: state.totalCoins + 1,
          gems: state.gems + gemYield(state, state.totalCoins + 1),
          score: state.score + reward,
          visited: state.visited.includes(nearest.index) ? state.visited : [...state.visited, nearest.index],
        });
      }

      // volley: along the facing line, up to two guardians within reach; a Wumpus in the line takes one heart and stops it.
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
          score += hurt.killed ? GAME_CONFIG.boss.killScore : GAME_CONFIG.boss.hitScore;
          break;
        }
        if (GUARDIAN_TYPES.includes(target.type)) {
          combo = Math.min(combo + 1, GAME_CONFIG.multipliers.maxCombo + relicCount(state.relics, 'hunter'));
          score += killValue(combo);
          world = removeEntityAt(world, cursor);
          if (relicCount(state.relics, 'hunter') > 0) bonusGems += 1;
          hits++;
        }
      }
      return settle(state, world, { ...cooldown, score, enemyCombo: combo, gems: state.gems + bonusGems });
    }

    case 'UNDO': {
      if (!state.undo || state.undoUsed || state.isGameOver || state.isLevelUp || state.pendingDraft) return state;
      return { ...state.undo, undo: null, undoUsed: true };
    }

    case 'REVIVE': {
      const before = state.lastBreath;
      if (!state.isGameOver || state.isVictory || !before) return state;
      // Back to just before the fatal action, with a shield and a few arrows; the tile that killed is flagged so it is not stepped on blind.
      const killer = state.playerIndex;
      const marked = killer !== before.playerIndex && !before.marked.includes(killer) ? [...before.marked, killer] : before.marked;
      return { ...before, undo: null, lastBreath: null, revives: (state.revives ?? 0) + 1, shield: true, attack: Math.max(before.attack, REVIVE_ARROWS), marked, isGameOver: false, deathCause: null };
    }

    case 'REFILL': {
      if (state.isGameOver || state.isVictory || state.isLevelUp || state.pendingDraft) return state;
      return { ...state, attack: state.attack + REFILL_ARROWS, refills: (state.refills ?? 0) + 1 };
    }

    case 'RESET': {
      const { character, rows, cols, entities, coins, attack, seed, mode, runSeed, perks, ascension, draftBonus, startShield, startRelics } = action;
      const heroPerks = perks ?? NO_PERKS;
      const startingRelics: RelicId[] = startRelics ? [...startRelics] : [];
      const withRelic = (id: RelicId) => relicCount(startingRelics, id) > 0;
      return {
        ...initialState,
        selectedCharacter: character,
        rows,
        cols,
        entities,
        entityMap: createEntityMap(entities),
        coins,
        // Relics the run begins with act at once, exactly as if they had just been picked: the Quiver adds its two
        // arrows, the Bulwark its shield and the Lantern lights the area around the start.
        attack: attack + heroPerks.bonusArrows + (withRelic('quiver') ? 2 : 0),
        shield: heroPerks.startShield || startShield === true || withRelic('bulwark'),
        perks: heroPerks,
        seed: seed || Date.now(),
        runSeed: runSeed ?? seed ?? 0,
        mode: mode ?? 'expedition',
        ascension: ascension ?? 0,
        draftBonus: draftBonus ?? 0,
        relics: startingRelics,
        visited: startingVisited(cols, rows, withRelic('lantern') || heroPerks.startLit, entities),
        items: { ...heroPerks.startItems },
        playerIndex: 0,
        totalCoins: 0,
      };
    }

    default:
      return state;
  }
}
