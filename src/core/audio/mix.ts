/**
 * The mix: one table that says how loud every sound of the game should be.
 *
 * The audio files themselves are normalised (scripts/normalizeAudio.py): every effect has the same loudness
 * (SFX_ASSET_DB) and every music track too (MUSIC_ASSET_DB). So the loudness the player hears is decided here, per event,
 * in decibels, instead of by whatever level each recording happened to have. The playback volume of an event is derived
 * from its target, and tests/engine/audioMix.test.ts reads the real files to make sure the two stay in agreement.
 *
 * Levels: `sfx` targets are measured like the files (RMS of the loudest 250 ms, dBFS); `music` targets are whole-track RMS.
 * The player's music / effects volume setting scales everything on top of this (see volume.ts).
 */

/** Loudness of every file in src/assets/sfx after normalisation (loudest-250ms RMS, dBFS). */
export const SFX_ASSET_DB = -12;
/** Loudness of every file in src/assets/music after normalisation (whole-track RMS, dBFS). */
export const MUSIC_ASSET_DB = -18;

export type MixKind = 'sfx' | 'music';

export interface MixEntry {
  kind: MixKind;
  /** Level the player hears, in dBFS, before the player's own volume setting. */
  db: number;
}

/**
 * Hierarchy (loud to soft): the big moments (boss, death, relic) > feedback you want to feel (hits, kills, gems) >
 * constant background feedback (steps, misses, warnings) > the hums of nearby danger > music.
 */
export const MIX = {
  // Big moments
  roar: { kind: 'sfx', db: -13 },
  bossHit: { kind: 'sfx', db: -13 },
  death: { kind: 'sfx', db: -14 },
  relic: { kind: 'sfx', db: -14 },
  teleport: { kind: 'sfx', db: -15 },
  shieldCrack: { kind: 'sfx', db: -15 },
  // Feedback for what the player just did
  kill: { kind: 'sfx', db: -16 },
  coin: { kind: 'sfx', db: -16 },
  powerup: { kind: 'sfx', db: -16 },
  forgeHammer: { kind: 'sfx', db: -16 },
  emberGain: { kind: 'sfx', db: -15 },
  trap: { kind: 'sfx', db: -18 },
  // Constant, light feedback
  charge: { kind: 'sfx', db: -19 },
  step: { kind: 'sfx', db: -20 },
  uiTap: { kind: 'sfx', db: -21 },
  killTail: { kind: 'sfx', db: -22 },
  miss: { kind: 'sfx', db: -22 },
  shieldThud: { kind: 'sfx', db: -20 },
  bossEcho: { kind: 'sfx', db: -15 },
  // Ambient danger (the loops that play while a guardian or a vortex is next to the hero)
  hazard: { kind: 'sfx', db: -28 },
  // Music (whole-track RMS) and the victory fanfare, which is a music file played once
  music: { kind: 'music', db: -34 },
  fanfare: { kind: 'music', db: -26 },
} as const satisfies Record<string, MixEntry>;

export type MixKey = keyof typeof MIX;

/** Loudness of the files an entry plays, in dBFS. */
export const assetDbOf = (kind: MixKind): number => (kind === 'sfx' ? SFX_ASSET_DB : MUSIC_ASSET_DB);

/** Player volume (0..1) that takes a file at `assetDb` to the loudness `targetDb`. It can only turn a sound down. */
export const gainFor = (targetDb: number, assetDb: number): number => Math.min(1, Math.pow(10, (targetDb - assetDb) / 20));

/** Playback volume of a mix entry. */
export const mixVolume = (key: MixKey): number => {
  const entry: MixEntry = MIX[key];
  return gainFor(entry.db, assetDbOf(entry.kind));
};

/** The loudness a volume really produces for a kind of file (the inverse of gainFor, for tests and tooling). */
export const effectiveDb = (volume: number, kind: MixKind): number => assetDbOf(kind) + 20 * Math.log10(volume);

/** Every key of the mix, for tests and tooling. */
export const MIX_KEYS = Object.keys(MIX) as MixKey[];
