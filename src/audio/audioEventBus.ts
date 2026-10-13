/**
 * @file audioEventBus.ts
 *
 * Lightweight pub/sub Audio Event Bus.
 *
 * Components emit sound events via `emitSound()`.
 * The SoundManager subscribes and translates events to actual audio.
 *
 * This decouples UI components from audio implementation details —
 * replacing `soundState?.movimiento?.play()` with `emitSound('MOVE')`.
 *
 * No external dependencies. Can be tested independently of audio APIs.
 */

import { SoundEvent } from './soundEvents';

type SoundListener = (event: SoundEvent) => void;

const listeners: Set<SoundListener> = new Set();

/**
 * Emit an audio event. All subscribed listeners will be notified.
 * Call this from UI components or game state effects instead of
 * calling sound APIs directly.
 *
 * @example
 * emitSound('MOVE');
 * emitSound('COIN_COLLECTED');
 * emitSound('GAME_OVER');
 */
export function emitSound(event: SoundEvent): void {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (e) {
      console.warn('[AudioEventBus] Listener error:', e);
    }
  });
}

/**
 * Subscribe to all sound events. Returns an unsubscribe function.
 * The SoundManager calls this once on initialization.
 *
 * @param listener - Callback that receives each emitted SoundEvent.
 * @returns Unsubscribe function — call to remove the listener.
 *
 * @example
 * const unsub = onSound((event) => console.log(event));
 * // later:
 * unsub();
 */
export function onSound(listener: SoundListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
