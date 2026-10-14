/** API compatible con tu código existente */
export interface LegacySoundHandle {
  isPlaying: () => Promise<boolean>;
  play: () => Promise<void>;
  stop: () => Promise<void>;
  setNumberOfLoops: (loops: number) => Promise<void>; // -1 => loop infinito, 0 => no loop
  setVolume: (vol: number) => Promise<void>;          // 0..1
  unload: () => Promise<void>;
  /**
   * Fire-and-forget effect: plays on the next free voice at `volume`, synchronously (no awaits), so quick
   * successive effects never wait on each other or cut each other off.
   */
  playOneShot: (volume: number, rate?: number) => void;
}

export interface SoundState {
  cover:      LegacySoundHandle | null;
  selection:  LegacySoundHandle | null;
  gameplay:   LegacySoundHandle | null;
  death:      LegacySoundHandle | null;
  coin:       LegacySoundHandle | null;
  victory:    LegacySoundHandle | null;
  move:       LegacySoundHandle | null;
  attack:     LegacySoundHandle | null;
  monster:    LegacySoundHandle | null;
  vortex:     LegacySoundHandle | null;
  relic:      LegacySoundHandle | null;
  roar:       LegacySoundHandle | null;
}

export interface SoundStore {
  sounds: SoundState;
  /** Carga/recarga todos los sonidos (idempotente) */
  init: () => Promise<void>;
  /** Ajuste masivo de volumen */
  setVolumeAll: (vol: number) => Promise<void>;
  /** Re-creates any player that is missing or stopped being loaded (Android can drop them in the background). */
  revive: () => Promise<void>;
}
