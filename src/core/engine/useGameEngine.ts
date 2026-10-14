import { useReducer, useCallback, useRef, useEffect, useState } from 'react';
import { haptic, ImpactFeedbackStyle, NotificationFeedbackType } from '../../shared/haptics';
import { gameReducer, initialState } from './reducer';
import { Direction, GameEngineInterface, GameAction } from './types';
import { Character } from '../../data/characters';
import { generateBoard } from './generator';
import { GameMode, deriveLevelSeed } from './seed';
import { clampAscension, modifiersFor } from './ascension';
import { omenFor, OmenId } from './omens';
import { biomeFor } from './biomes';
import { ShopItem } from './shop';
import { isLairFloor, lairHeartBonus } from './lair';
import { getHeroPerks } from './heroes';
import { NO_META, MetaEffects, applyMeta } from '../stats/forge';
import { RelicId, relicCount } from './relics';
import { GAME_CONFIG } from '../../config/gameConfig';
import { emitGameEvent } from '../events/gameEvents';
import { analytics } from '../../services/analytics';
import { recordAction } from '../replay/replay';
import { bossHearts, countGuardians } from './entityCounts';

/**
 * Wumpus Adventures — Game Engine Hook
 * Orchestrates level generation (Side Effects) and dispatches to the pure Reducer.
 * Handles side-effects (events, analytics, haptics) after state changes.
 */
export function useGameEngine(): GameEngineInterface {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [isAttacking, setIsAttacking] = useState(false);
  
  // Tracking for side-effects
  const prevStateRef = useRef(state);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Haptic debouncing
  const lastHapticMoveRef = useRef(0);

  // Custom dispatch wrapper to handle action recording
  const pureDispatch = useCallback((action: GameAction) => {
    recordAction(action);
    dispatch(action);
  }, []);

  // Effect-based Side Effects (triggered after state update)
  useEffect(() => {
    const prevState = prevStateRef.current;
    if (prevState === state) return;

    let hapticTriggered = false;

    // 1. CRITICAL: Game Over (Priority 1)
    if (state.isGameOver && !prevState.isGameOver) {
      emitGameEvent('GAME_OVER');
      haptic.impact(ImpactFeedbackStyle.Heavy);
      hapticTriggered = true;
    }

    // 2. IMPORTANT: Combat Result (Priority 2)
    // Counted by type: a roaming guardian changes tile as it moves, so comparing positions would misread it.
    const guardiansBefore = countGuardians(prevState);
    const guardiansNow = countGuardians(state);
    if (!hapticTriggered && guardiansNow < guardiansBefore && state.playerIndex === prevState.playerIndex) {
      emitGameEvent('ENEMY_KILLED', { combo: state.enemyCombo });
      haptic.impact(ImpactFeedbackStyle.Heavy);
      hapticTriggered = true;
    }

    // 3. IMPORTANT: Coin collection (Priority 3)
    if (!hapticTriggered && state.totalCoins > prevState.totalCoins) {
      emitGameEvent('COIN_COLLECTED', { remaining: state.coins, total: state.totalCoins });
      haptic.notify(NotificationFeedbackType.Success);
      hapticTriggered = true;
    }

    // 3b. Traps and power-ups
    if (state.lastPickup) {
      if (state.lastPickup === 'trap') {
        emitGameEvent('TRAP_TRIGGERED');
        analytics.track('trap_triggered', { level: state.level });
        if (!hapticTriggered) haptic.notify(NotificationFeedbackType.Warning);
      } else {
        emitGameEvent('POWERUP_COLLECTED', { kind: state.lastPickup });
        analytics.track('powerup_collected', { kind: state.lastPickup });
        if (!hapticTriggered) haptic.notify(NotificationFeedbackType.Success);
      }
      hapticTriggered = true;
    }

    // 4. MINOR: Move feedback & Haptics (Priority 4)
    if (state.playerIndex !== prevState.playerIndex) {
      emitGameEvent('PLAYER_MOVED', { from: prevState.playerIndex, to: state.playerIndex });
      
      if (!hapticTriggered) {
        const now = Date.now();
        if (now - lastHapticMoveRef.current > 100) {
          haptic.impact(ImpactFeedbackStyle.Light);
          lastHapticMoveRef.current = now;
        }
      }
    }

    // Secondary non-haptic effects
    // An arrow that hurt the Wumpus (hearts went down) is a hit, not a miss.
    const hitTheWumpus = bossHearts(state) < bossHearts(prevState);
    if (
      state.attack < prevState.attack &&
      guardiansNow === guardiansBefore &&
      !hitTheWumpus &&
      state.entities.length === prevState.entities.length &&
      state.playerIndex === prevState.playerIndex
    ) {
      emitGameEvent('ATTACK_MISS');
    }

    if (state.isLevelUp && !prevState.isLevelUp) {
      emitGameEvent('LEVEL_UP');
    }

    prevStateRef.current = state;
  }, [state]);

  const move = useCallback((direction: Direction) => {
    pureDispatch({ type: 'MOVE', direction });
  }, [pureDispatch]);

  const attackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (attackTimer.current) clearTimeout(attackTimer.current);
  }, []);

  const attack = useCallback((direction?: Direction) => {
    // A no-op attack (no arrows, run over, draft open) gives no animation or haptics.
    const s = stateRef.current;
    if (s.isGameOver || s.isLevelUp || s.pendingDraft || s.attack <= 0) return;

    setIsAttacking(true);
    pureDispatch({ type: 'ATTACK', direction });
    if (attackTimer.current) clearTimeout(attackTimer.current);
    attackTimer.current = setTimeout(() => setIsAttacking(false), 400);
  }, [pureDispatch]);

  /** The final floor of an expedition (and of a daily) is the Wumpus' lair. */
  const isBossFloor = isLairFloor;

  const reset = useCallback((character: Character, options: { mode?: GameMode; runSeed?: number; heroIndex?: number; ascension?: number; meta?: MetaEffects } = {}) => {
    const mode = options.mode ?? 'expedition';
    // The daily challenge is the same cave for everyone, so it never uses a harder depth.
    const ascension = mode === 'daily' ? 0 : clampAscension(options.ascension ?? 0);
    // Forge upgrades never apply to the daily challenge: it must be the same cave and the same tools for everyone.
    const meta = mode === 'daily' ? NO_META : options.meta ?? NO_META;
    const perks = applyMeta(getHeroPerks(options.heroIndex ?? 0), meta);
    const runSeed = options.runSeed ?? Date.now();
    const seed = deriveLevelSeed(runSeed, 1);
    const board = generateBoard(1, seed, { boss: isBossFloor(mode, 1), ascension, omen: omenFor(runSeed, 1, mode), endless: mode === 'endless', biome: biomeFor(1, mode) });

    pureDispatch({
      type: 'RESET',
      character,
      rows: board.rows,
      cols: board.cols,
      entities: board.entities,
      coins: board.coins,
      attack: Math.max(1, board.attack - modifiersFor(ascension).arrowPenalty),
      seed,
      mode,
      runSeed,
      ascension,
      perks,
      draftBonus: meta.draftBonus,
      startShield: meta.shield,
      startRelics: meta.startRelics,
    });
  }, [pureDispatch]);

  const levelUp = useCallback((chosenOmen?: OmenId | null) => {
    const nextLevel = stateRef.current.level + 1;
    // The omen is the one picked at the fork; without a choice (daily, first fork-less floors) the seeded one applies.
    const omen = chosenOmen !== undefined ? chosenOmen : omenFor(stateRef.current.runSeed, nextLevel, stateRef.current.mode);
    const seed = deriveLevelSeed(stateRef.current.runSeed, nextLevel);
    const ascension = stateRef.current.ascension;
    const board = generateBoard(nextLevel, seed, {
      boss: isBossFloor(stateRef.current.mode, nextLevel),
      ascension,
      omen,
      biome: biomeFor(nextLevel, stateRef.current.mode),
      extraPits: relicCount(stateRef.current.relics, 'greedy_idol') > 0 ? 2 : 0,
      bossHeartBonus: lairHeartBonus(stateRef.current.mode, nextLevel),
      endless: stateRef.current.mode === 'endless',
    });

    pureDispatch({
      type: 'LEVEL_UP',
      payload: {
        rows: board.rows,
        cols: board.cols,
        entities: board.entities,
        coins: board.coins,
        attack: Math.max(1, board.attack - modifiersFor(ascension).arrowPenalty),
        seed,
        omen,
      },
    });
  }, [pureDispatch]);

  const buy = useCallback((item: ShopItem) => pureDispatch({ type: 'BUY', item }), [pureDispatch]);
  const useAltar = useCallback(() => pureDispatch({ type: 'ALTAR' }), [pureDispatch]);
  const useItem = useCallback((item: 'detector' | 'bomb') => pureDispatch({ type: 'USE_ITEM', item }), [pureDispatch]);
  const useAbility = useCallback(() => pureDispatch({ type: 'USE_ABILITY' }), [pureDispatch]);
  const undo = useCallback(() => pureDispatch({ type: 'UNDO' }), [pureDispatch]);

  const pickRelic = useCallback((id: RelicId) => {
    pureDispatch({ type: 'PICK_RELIC', id });
  }, [pureDispatch]);

  return {
    state,
    isAttacking,
    move,
    attack,
    reset,
    levelUp,
    pickRelic,
    buy,
    useAltar,
    useItem,
    useAbility,
    undo,
  };
}
