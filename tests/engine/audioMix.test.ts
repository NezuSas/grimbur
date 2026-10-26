import * as fs from 'fs';
import * as path from 'path';
import { MIX, MIX_KEYS, MUSIC_ASSET_DB, SFX_ASSET_DB, effectiveDb, gainFor, mixVolume } from '../../src/core/audio/mix';

const ASSETS = path.join(__dirname, '..', '..', 'src', 'assets');
const MASTERS = path.join(__dirname, '..', '..', 'assets-src');

/** Reads a 16-bit mono PCM WAV into floats in -1..1. */
function readWav(file: string): { samples: Float64Array; rate: number } {
  const buf = fs.readFileSync(file);
  let offset = 12;
  let rate = 0;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === 'fmt ') rate = buf.readUInt32LE(offset + 12);
    if (id === 'data') {
      const count = Math.floor(size / 2);
      const samples = new Float64Array(count);
      for (let i = 0; i < count; i++) samples[i] = buf.readInt16LE(offset + 8 + i * 2) / 32768;
      return { samples, rate };
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error(`no data chunk in ${file}`);
}

const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -120);

/** RMS of the loudest 250 ms window: what is heard of a short effect (same as scripts/normalizeAudio.py). */
function loudest250(samples: Float64Array, rate: number): number {
  const win = Math.floor(rate * 0.25);
  if (samples.length <= win) return db(Math.sqrt(samples.reduce((n, s) => n + s * s, 0) / samples.length));
  let sum = 0;
  for (let i = 0; i < win; i++) sum += samples[i] * samples[i];
  let best = sum;
  for (let i = win; i < samples.length; i++) {
    sum += samples[i] * samples[i] - samples[i - win] * samples[i - win];
    if (sum > best) best = sum;
  }
  return db(Math.sqrt(best / win));
}

const wholeRms = (samples: Float64Array): number => db(Math.sqrt(samples.reduce((n, s) => n + s * s, 0) / samples.length));

const SFX_FILES = ['attack', 'coin', 'death', 'monster', 'move', 'relic', 'roar', 'vortex'];
const MUSIC_FILES = ['cover', 'gameplay', 'selection', 'victory'];

describe('audio files are normalised', () => {
  it.each(SFX_FILES)('effect %s sits at the standard effect loudness', name => {
    const { samples, rate } = readWav(path.join(ASSETS, 'sfx', `${name}.wav`));
    expect(Math.abs(loudest250(samples, rate) - SFX_ASSET_DB)).toBeLessThan(0.6);
    expect(db(Math.max(...Array.from(samples, Math.abs)))).toBeLessThanOrEqual(-0.9); // never clips
  });

  // The app ships OGG (see scripts/convertMusic.py); loudness is checked on the WAV masters they come from.
  it.each(MUSIC_FILES)('music track %s sits at the standard music loudness', name => {
    const { samples } = readWav(path.join(MASTERS, 'music', `${name}.wav`));
    expect(Math.abs(wholeRms(samples) - MUSIC_ASSET_DB)).toBeLessThan(0.6);
  });

  it.each(MUSIC_FILES)('music track %s ships as OGG next to its master', name => {
    expect(fs.existsSync(path.join(ASSETS, 'music', `${name}.ogg`))).toBe(true);
  });

  it('effects start and end at silence, so none clicks', () => {
    for (const name of SFX_FILES) {
      const { samples } = readWav(path.join(ASSETS, 'sfx', `${name}.wav`));
      expect(Math.abs(samples[0])).toBeLessThan(0.01);
      expect(Math.abs(samples[samples.length - 1])).toBeLessThan(0.01);
    }
  });
});

describe('the mix table', () => {
  it('turns every sound to the level it declares, and never asks for more than full volume', () => {
    for (const key of MIX_KEYS) {
      const entry = MIX[key];
      const volume = mixVolume(key);
      expect(volume).toBeGreaterThan(0);
      expect(volume).toBeLessThanOrEqual(1);
      expect(effectiveDb(volume, entry.kind)).toBeCloseTo(entry.db, 6);
    }
  });

  it('keeps the hierarchy: big moments > feedback > constant feedback > danger hums > music', () => {
    const level = (key: keyof typeof MIX) => MIX[key].db;
    for (const big of ['roar', 'bossHit', 'death', 'relic'] as const) {
      for (const light of ['step', 'miss', 'charge'] as const) expect(level(big)).toBeGreaterThan(level(light));
    }
    for (const feedback of ['kill', 'coin', 'powerup'] as const) {
      expect(level(feedback)).toBeGreaterThan(level('step'));
      expect(level(feedback)).toBeLessThan(level('roar'));
    }
    expect(level('hazard')).toBeLessThan(level('step'));
    expect(level('music')).toBeLessThan(level('hazard'));
  });

  it('keeps the loud and the soft effects within a comfortable range (no sound 10 dB above another one)', () => {
    const effects = MIX_KEYS.filter(k => MIX[k].kind === 'sfx' && k !== 'hazard');
    const levels = effects.map(k => MIX[k].db);
    expect(Math.max(...levels) - Math.min(...levels)).toBeLessThanOrEqual(10);
  });

  it('gainFor can only turn a sound down', () => {
    expect(gainFor(-6, -12)).toBe(1);
    expect(gainFor(-18, -12)).toBeCloseTo(0.501, 2);
  });
});

describe('the footstep is audible on a phone speaker', () => {
  // A phone speaker cannot reproduce anything much below ~150 Hz. The first recording of the step kept 98.5 % of its
  // energy there, so on a phone a single step was silent (only the stacked clicks of fast steps were heard).
  it('keeps most of its energy above 150 Hz', () => {
    const { samples, rate } = readWav(path.join(ASSETS, 'sfx', 'move.wav'));
    const n = samples.length;
    const hann = (i: number) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    const x = samples.map((s, i) => s * hann(i));
    const energyAt = (k: number) => {
      let re = 0;
      let im = 0;
      for (let i = 0; i < n; i++) {
        re += x[i] * Math.cos((2 * Math.PI * k * i) / n);
        im -= x[i] * Math.sin((2 * Math.PI * k * i) / n);
      }
      return re * re + im * im;
    };
    const lastLowBin = Math.floor((150 * n) / rate);
    let low = 0;
    let total = 0;
    for (let k = 1; k <= n / 2; k++) {
      const e = energyAt(k);
      total += e;
      if (k <= lastLowBin) low += e;
    }
    expect(low / total).toBeLessThan(0.15);
  });
});
