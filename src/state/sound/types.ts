/** API compatible con tu código existente */
export interface LegacySoundHandle {
  isPlaying: () => Promise<boolean>;
  play: () => Promise<void>;
  stop: () => Promise<void>;
  setNumberOfLoops: (loops: number) => Promise<void>; // -1 => loop infinito, 0 => no loop
  setVolume: (vol: number) => Promise<void>;          // 0..1
  unload: () => Promise<void>;
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
}

export interface SoundStore {
  sounds: SoundState;
  /** Carga/recarga todos los sonidos (idempotente) */
  init: () => Promise<void>;
  /** Ajuste masivo de volumen */
  setVolumeAll: (vol: number) => Promise<void>;
}
