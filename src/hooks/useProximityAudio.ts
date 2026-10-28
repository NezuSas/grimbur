import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { emitSound } from '../audio/audioEventBus';
import { getNearbyHazards } from '../core/engine/proximity';
import { GameState } from '../core/engine/types';

/**
 * Starts/stops the "guardian near" and "vortex near" audio loops as the player
 * walks next to hazards, and silences them when the round ends. `active` is false
 * while the game is paused or another screen is in front: the hums stop, and come
 * back from the current situation when play resumes.
 */
export function useProximityAudio(
  state: Pick<GameState, 'playerIndex' | 'rows' | 'cols' | 'entityMap' | 'isGameOver' | 'isLevelUp'>,
  active = true,
) {
  const guardianNear = useRef(false);
  const vortexNear = useRef(false);
  const activeRef = useRef(active);
  activeRef.current = active;

  const { playerIndex, rows, cols, entityMap, isGameOver, isLevelUp } = state;

  useEffect(() => {
    let enemy = false;
    let pit = false;

    if (active && !isGameOver && !isLevelUp) {
      ({ enemy, pit } = getNearbyHazards(playerIndex, rows, cols, entityMap));
    }

    if (enemy && !guardianNear.current) emitSound('GUARDIAN_NEAR');
    if (!enemy && guardianNear.current) emitSound('STOP_GUARDIAN_NEAR');
    if (pit && !vortexNear.current) emitSound('VORTEX_NEAR');
    if (!pit && vortexNear.current) emitSound('STOP_VORTEX_NEAR');

    guardianNear.current = enemy;
    vortexNear.current = pit;
  }, [playerIndex, rows, cols, entityMap, isGameOver, isLevelUp, active]);

  // Leaving the screen (or the run) must silence the hazard hums at once.
  useEffect(
    () => () => {
      emitSound('STOP_GUARDIAN_NEAR');
      emitSound('STOP_VORTEX_NEAR');
    },
    [],
  );

  // Going to the background pauses every player, so the loops are silent when the player comes back even though
  // the hazard is still next to them: start them again from the current situation (not while the game is paused:
  // they come back with play).
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active' || !activeRef.current) return;
      if (guardianNear.current) emitSound('GUARDIAN_NEAR');
      if (vortexNear.current) emitSound('VORTEX_NEAR');
    });
    return () => sub.remove();
  }, []);
}
