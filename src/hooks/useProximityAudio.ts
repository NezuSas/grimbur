import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { emitSound } from '../audio/audioEventBus';
import { getNearbyHazards } from '../core/engine/proximity';
import { GameState } from '../core/engine/types';

/**
 * Starts/stops the "guardian near" and "vortex near" audio loops as the player
 * walks next to hazards, and silences them when the round ends.
 */
export function useProximityAudio(
  state: Pick<GameState, 'playerIndex' | 'rows' | 'cols' | 'entityMap' | 'isGameOver' | 'isLevelUp'>,
) {
  const guardianNear = useRef(false);
  const vortexNear = useRef(false);

  const { playerIndex, rows, cols, entityMap, isGameOver, isLevelUp } = state;

  useEffect(() => {
    let enemy = false;
    let pit = false;

    if (!isGameOver && !isLevelUp) {
      ({ enemy, pit } = getNearbyHazards(playerIndex, rows, cols, entityMap));
    }

    if (enemy && !guardianNear.current) emitSound('GUARDIAN_NEAR');
    if (!enemy && guardianNear.current) emitSound('STOP_GUARDIAN_NEAR');
    if (pit && !vortexNear.current) emitSound('VORTEX_NEAR');
    if (!pit && vortexNear.current) emitSound('STOP_VORTEX_NEAR');

    guardianNear.current = enemy;
    vortexNear.current = pit;
  }, [playerIndex, rows, cols, entityMap, isGameOver, isLevelUp]);

  // Leaving the screen (or the run) must silence the hazard hums at once.
  useEffect(
    () => () => {
      emitSound('STOP_GUARDIAN_NEAR');
      emitSound('STOP_VORTEX_NEAR');
    },
    [],
  );

  // Going to the background pauses every player, so the loops are silent when the player comes back even though
  // the hazard is still next to them: start them again from the current situation.
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active') return;
      if (guardianNear.current) emitSound('GUARDIAN_NEAR');
      if (vortexNear.current) emitSound('VORTEX_NEAR');
    });
    return () => sub.remove();
  }, []);
}
