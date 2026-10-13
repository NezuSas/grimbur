import { useReducer, useCallback, useRef, useEffect, useState } from 'react';
import { haptic, ImpactFeedbackStyle, NotificationFeedbackType } from '../../shared/haptics';
import { gameReducer, initialState } from './reducer';
import { Direction, GameEngineInterface, GameAction } from './types';
import { Character } from '../../data/characters';
import { generateBoard } from './generator';
import { GameMode, deriveLevelSeed } from './seed';
import { clampAscension, modifiersFor } from './ascension';
import { getHeroPerks } from './heroes';
import { RelicId } from './relics';
import { GAME_CONFIG } from '../../config/gameConfig';
import { emitGameEvent } from '../events/gameEvents';
import { analytics } from '../../services/analytics';
import { recordAction } from '../replay/replay';

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
    if (!hapticTriggered && state.entities.length < prevState.entities.length) {
      const removedEntityPos = prevState.entities.find(e => !state.entities.find(se => se.index === e.index));
      if (removedEntityPos?.type === 'enemy' && state.playerIndex === prevState.playerIndex) {
        emitGameEvent('ENEMY_KILLED', { combo: state.enemyCombo });
        haptic.impact(ImpactFeedbackStyle.Heavy);
        hapticTriggered = true;
      }
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
    if (state.attack < prevState.attack && state.entities.length === prevState.entities.length && state.playerIndex === prevState.playerIndex) {
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

  const attack = useCallback(() => {
    // A no-op attack (no arrows, run over, draft open) gives no animation or haptics.
    const s = stateRef.current;
    if (s.isGameOver || s.isLevelUp || s.pendingDraft || s.attack <= 0) return;

    setIsAttacking(true);
    pureDispatch({ type: 'ATTACK' });
    if (attackTimer.current) clearTimeout(attackTimer.current);
    attackTimer.current = setTimeout(() => setIsAttacking(false), 400);
  }, [pureDispatch]);

  /** The final floor of an expedition (and of a daily) is the Wumpus' lair. */
  const isBossFloor = (mode: GameMode, level: number) =>
    mode !== 'endless' && level === GAME_CONFIG.expedition.floors;

  const reset = useCallback((character: Character, options: { mode?: GameMode; runSeed?: number; heroIndex?: number; ascension?: number } = {}) => {
    const mode = options.mode ?? 'expedition';
    // The daily challenge is the same cave for everyone, so it never uses a harder depth.
    const ascension = mode === 'daily' ? 0 : clampAscension(options.ascension ?? 0);
    const runSeed = options.runSeed ?? Date.now();
    const seed = deriveLevelSeed(runSeed, 1);
    const board = generateBoard(1, seed, { boss: isBossFloor(mode, 1), ascension });

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
      perks: getHeroPerks(options.heroIndex ?? 0),
    });
  }, [pureDispatch]);

  const levelUp = useCallback(() => {
    const nextLevel = stateRef.current.level + 1;
    const seed = deriveLevelSeed(stateRef.current.runSeed, nextLevel);
    const ascension = stateRef.current.ascension;
    const board = generateBoard(nextLevel, seed, { boss: isBossFloor(stateRef.current.mode, nextLevel), ascension });

    pureDispatch({
      type: 'LEVEL_UP',
      payload: {
        rows: board.rows,
        cols: board.cols,
        entities: board.entities,
        coins: board.coins,
        attack: Math.max(1, board.attack - modifiersFor(ascension).arrowPenalty),
        seed,
      },
    });
  }, [pureDispatch]);

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
  };
}
