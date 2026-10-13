import { useReducer, useCallback, useRef, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { gameReducer, initialState } from './reducer';
import { Direction, GameEngineInterface, GameAction } from './types';
import { Character } from '../../data/characters';
import { generateBoard } from './generator';
import { emitGameEvent } from '../events/gameEvents';
import { logGameEvent } from '../telemetry/telemetry';
import { recordAction } from '../replay/replay';

/**
 * Wumpus Adventures — Game Engine Hook
 * Orchestrates level generation (Side Effects) and dispatches to the pure Reducer.
 * Handles side-effects (events, telemetry, haptics) after state changes.
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
      logGameEvent('GAME_OVER', { level: state.level, score: state.score });
      emitGameEvent('GAME_OVER');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      hapticTriggered = true;
    }

    // 2. IMPORTANT: Combat Result (Priority 2)
    if (!hapticTriggered && state.entities.length < prevState.entities.length) {
      const removedEntityPos = prevState.entities.find(e => !state.entities.find(se => se.index === e.index));
      if (removedEntityPos?.type === 'enemy' && state.playerIndex === prevState.playerIndex) {
        emitGameEvent('ENEMY_KILLED', { combo: state.enemyCombo });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        hapticTriggered = true;
      }
    }

    // 3. IMPORTANT: Coin collection (Priority 3)
    if (!hapticTriggered && state.totalCoins > prevState.totalCoins) {
      emitGameEvent('COIN_COLLECTED', { remaining: state.coins, total: state.totalCoins });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      hapticTriggered = true;
    }

    // 3b. Traps and power-ups
    if (state.lastPickup) {
      if (state.lastPickup === 'trap') {
        emitGameEvent('TRAP_TRIGGERED');
        if (!hapticTriggered) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        emitGameEvent('POWERUP_COLLECTED', { kind: state.lastPickup });
        if (!hapticTriggered) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      hapticTriggered = true;
    }

    // 4. MINOR: Move feedback & Haptics (Priority 4)
    if (state.playerIndex !== prevState.playerIndex) {
      emitGameEvent('PLAYER_MOVED', { from: prevState.playerIndex, to: state.playerIndex });
      
      if (!hapticTriggered) {
        const now = Date.now();
        if (now - lastHapticMoveRef.current > 100) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          lastHapticMoveRef.current = now;
        }
      }
    }

    // Secondary non-haptic effects
    if (state.attack < prevState.attack && state.entities.length === prevState.entities.length && state.playerIndex === prevState.playerIndex) {
      emitGameEvent('ATTACK_MISS');
    }

    if (state.isLevelUp && !prevState.isLevelUp) {
      logGameEvent('LEVEL_UP', { nextLevel: state.level + 1, score: state.score });
      emitGameEvent('LEVEL_UP');
    }

    prevStateRef.current = state;
  }, [state]);

  const move = useCallback((direction: Direction) => {
    pureDispatch({ type: 'MOVE', direction });
  }, [pureDispatch]);

  const attack = useCallback(() => {
    setIsAttacking(true);
    pureDispatch({ type: 'ATTACK' });
    setTimeout(() => setIsAttacking(false), 400);
  }, [pureDispatch]);

  const reset = useCallback((character: Character) => {
    const seed = Date.now();
    const board = generateBoard(1, seed);

    pureDispatch({
      type: 'RESET',
      character,
      rows: board.rows,
      cols: board.cols,
      entities: board.entities,
      coins: board.coins,
      attack: board.attack,
      seed,
    });
  }, [pureDispatch]);

  const levelUp = useCallback(() => {
    const nextLevel = stateRef.current.level + 1;
    const seed = Date.now();
    const board = generateBoard(nextLevel, seed);

    pureDispatch({
      type: 'LEVEL_UP',
      payload: {
        rows: board.rows,
        cols: board.cols,
        entities: board.entities,
        coins: board.coins,
        attack: board.attack,
        seed,
      },
    });
  }, [pureDispatch]);

  return {
    state,
    isAttacking,
    move,
    attack,
    reset,
    levelUp,
  };
}
