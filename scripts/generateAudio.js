#!/usr/bin/env node
/**
 * Procedural chiptune audio for Grimbur Adventures.
 *
 * Every sound effect and music loop is synthesised from scratch by this script
 * (no samples, no third-party material), so the audio is original and carries
 * no licensing obligations. Output is deterministic: running it twice yields
 * byte-identical files.
 *
 *   node scripts/generateAudio.js
 *
 * Writes 16-bit mono WAV files to src/assets/sfx and src/assets/music.
 */
const fs = require('fs');
const path = require('path');

const SR = 22050;
const OUT_SFX = path.join(__dirname, '..', 'src', 'assets', 'sfx');
const OUT_MUSIC = path.join(__dirname, '..', 'src', 'assets', 'music');

// ─── Basics ────────────────────────────────────────────────────────────────
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function makeRng(seed) {
  let v = seed >>> 0 || 1;
  return () => {
    v = (Math.imul(v, 1664525) + 1013904223) >>> 0;
    return v / 4294967296;
  };
}

const TAU = Math.PI * 2;
const OSC = {
  sine: p => Math.sin(TAU * p),
  tri: p => 4 * Math.abs(p - Math.floor(p + 0.5)) - 1,
  saw: p => 2 * (p - Math.floor(p + 0.5)),
  sq: p => (p - Math.floor(p) < 0.5 ? 1 : -1),
  sq25: p => (p - Math.floor(p) < 0.25 ? 1 : -1),
  sq12: p => (p - Math.floor(p) < 0.125 ? 1 : -1),
};

function newBuffer(seconds) {
  return new Float32Array(Math.ceil(seconds * SR));
}

/**
 * Adds one note to `buf`.
 * opts: { wave, freq, endFreq, vol, attack, decay (time constant), release, vibrato:[hz,depthSemis] }
 */
function addNote(buf, start, dur, opts) {
  const { wave = 'sq', freq, endFreq = freq, vol = 0.3, attack = 0.005, decay = Infinity, release = 0.02, vibrato } = opts;
  const first = Math.floor(start * SR);
  const n = Math.floor(dur * SR);
  let phase = 0;
  for (let i = 0; i < n && first + i < buf.length; i++) {
    const t = i / SR;
    const k = n > 1 ? i / (n - 1) : 0;
    let f = freq * Math.pow(endFreq / freq, k);
    if (vibrato) f *= Math.pow(2, (Math.sin(TAU * vibrato[0] * t) * vibrato[1]) / 12);
    phase += f / SR;
    const env =
      Math.min(1, t / attack) *
      (decay === Infinity ? 1 : Math.exp(-t / decay)) *
      Math.min(1, (dur - t) / release);
    buf[first + i] += OSC[wave](phase) * vol * env;
  }
}

/** White noise burst with an optional one-pole high-pass, for hats / whooshes. */
function addNoise(buf, start, dur, { vol = 0.3, decay = 0.05, highpass = false, seed = 1 } = {}) {
  const rng = makeRng(seed);
  const first = Math.floor(start * SR);
  const n = Math.floor(dur * SR);
  let prev = 0;
  for (let i = 0; i < n && first + i < buf.length; i++) {
    const t = i / SR;
    let x = rng() * 2 - 1;
    if (highpass) {
      const y = x - prev;
      prev = x;
      x = y;
    }
    buf[first + i] += x * vol * Math.exp(-t / decay) * Math.min(1, (dur - t) / 0.005);
  }
}

function normalise(buf, peak = 0.89) {
  let max = 0;
  for (const s of buf) max = Math.max(max, Math.abs(s));
  if (max === 0) return;
  const gain = peak / max;
  for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i] * gain * 1.1) / Math.tanh(1.1);
}

function fadeEdges(buf, ms) {
  const n = Math.floor((ms / 1000) * SR);
  for (let i = 0; i < n && i < buf.length; i++) {
    const g = i / n;
    buf[i] *= g;
    buf[buf.length - 1 - i] *= g;
  }
}

function writeWav(file, buf) {
  const data = Buffer.alloc(44 + buf.length * 2);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + buf.length * 2, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); // PCM
  data.writeUInt16LE(1, 22); // mono
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(buf.length * 2, 40);
  for (let i = 0; i < buf.length; i++) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(buf[i] * 32767))), 44 + i * 2);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  console.log(`  ${path.relative(process.cwd(), file)}  ${(data.length / 1024).toFixed(0)} KB  ${(buf.length / SR).toFixed(1)}s`);
}

// ─── Sound effects ─────────────────────────────────────────────────────────
const SFX = {
  // A soft footstep tick.
  move() {
    const b = newBuffer(0.09);
    addNote(b, 0, 0.09, { wave: 'tri', freq: 300, endFreq: 190, vol: 0.5, decay: 0.03, release: 0.02 });
    addNoise(b, 0, 0.03, { vol: 0.08, decay: 0.01, highpass: true, seed: 3 });
    return b;
  },

  // Bright two-note pickup.
  coin() {
    const b = newBuffer(0.3);
    addNote(b, 0, 0.07, { wave: 'sq', freq: mtof(83), vol: 0.3, decay: 0.05 });
    addNote(b, 0.06, 0.24, { wave: 'sq', freq: mtof(88), vol: 0.3, decay: 0.09, release: 0.08 });
    addNote(b, 0.06, 0.24, { wave: 'tri', freq: mtof(100), vol: 0.1, decay: 0.07 });
    return b;
  },

  // Arrow release: a fast downward whoosh with a snap.
  attack() {
    const b = newBuffer(0.22);
    addNoise(b, 0, 0.2, { vol: 0.35, decay: 0.07, highpass: true, seed: 5 });
    addNote(b, 0, 0.18, { wave: 'saw', freq: 900, endFreq: 140, vol: 0.28, decay: 0.07, release: 0.04 });
    return b;
  },

  // Falling, wobbling defeat sting.
  death() {
    const b = newBuffer(1.0);
    addNote(b, 0, 0.9, { wave: 'saw', freq: 392, endFreq: 55, vol: 0.4, decay: 0.45, release: 0.2, vibrato: [7, 0.6] });
    addNote(b, 0, 0.9, { wave: 'sq', freq: 196, endFreq: 40, vol: 0.2, decay: 0.4, release: 0.2 });
    addNoise(b, 0.02, 0.5, { vol: 0.18, decay: 0.2, seed: 9 });
    return b;
  },

  // Looping growl for "a guardian is next to you". 2 s, seamless (integer cycles).
  monster() {
    const dur = 2;
    const b = newBuffer(dur);
    for (let i = 0; i < b.length; i++) {
      const t = i / SR;
      const lfo = 0.55 + 0.45 * Math.sin(TAU * 4 * t); // 4 Hz throb = 8 cycles
      const lfo2 = Math.sin(TAU * 1.5 * t); // 1.5 Hz drift = 3 cycles
      const a = OSC.saw(55 * t * (1 + 0.012 * lfo2));
      const c = OSC.sq(82.5 * t);
      b[i] = (a * 0.5 + c * 0.22) * lfo + Math.sin(TAU * 110 * t) * 0.18;
    }
    return b;
  },

  // Looping swirl for "a vortex is next to you" (also used for the teleport). 2 s, seamless.
  vortex() {
    const dur = 2;
    const b = newBuffer(dur);
    for (let i = 0; i < b.length; i++) {
      const t = i / SR;
      const fm = Math.sin(TAU * 220 * t + 3.2 * Math.sin(TAU * 2 * t));
      const shimmer = Math.sin(TAU * 660 * t + 1.5 * Math.sin(TAU * 3 * t)) * 0.35;
      const swell = 0.65 + 0.35 * Math.sin(TAU * 1 * t);
      b[i] = (fm * 0.6 + shimmer) * swell;
    }
    return b;
  },

  // Relic pickup / draft confirm: rising sparkle.
  relic() {
    const b = newBuffer(0.55);
    [76, 80, 83, 88].forEach((m, i) =>
      addNote(b, i * 0.07, 0.3, { wave: 'sq25', freq: mtof(m), vol: 0.22, decay: 0.12, release: 0.08 }),
    );
    addNote(b, 0.28, 0.27, { wave: 'tri', freq: mtof(100), vol: 0.15, decay: 0.1 });
    return b;
  },

  // The Grimbur roars when it appears / closes in.
  roar() {
    const b = newBuffer(0.9);
    addNote(b, 0, 0.85, { wave: 'saw', freq: 90, endFreq: 48, vol: 0.45, decay: 0.5, release: 0.2, vibrato: [14, 0.8] });
    addNote(b, 0, 0.85, { wave: 'sq', freq: 134, endFreq: 70, vol: 0.2, decay: 0.45, release: 0.2, vibrato: [11, 0.5] });
    addNoise(b, 0, 0.6, { vol: 0.25, decay: 0.25, seed: 13 });
    return b;
  },
};

// ─── Music ─────────────────────────────────────────────────────────────────
const MAJOR = [0, 4, 7];
const MINOR = [0, 3, 7];

/**
 * Renders a looping track.
 * spec: { bpm, bars, progression: [[rootMidi, 'M'|'m'] x bars], lead: [[bar, beat, midi, beats]...],
 *         arp: 'none'|'eighths'|'sixteenths', drums: 'none'|'light'|'drive', bassStyle: 'whole'|'pulse'|'walk',
 *         leadWave, arpWave, vol }
 */
function renderTrack(spec) {
  const beat = 60 / spec.bpm;
  const bar = beat * 4;
  const total = bar * spec.bars;
  const b = newBuffer(total);
  const arpWave = spec.arpWave || 'sq12';
  const leadWave = spec.leadWave || 'sq25';

  for (let barIdx = 0; barIdx < spec.bars; barIdx++) {
    const [root, quality] = spec.progression[barIdx % spec.progression.length];
    const triad = (quality === 'm' ? MINOR : MAJOR).map(s => root + s);
    const t0 = barIdx * bar;

    // Bass
    const bassRoot = root - 24;
    if (spec.bassStyle === 'whole') {
      addNote(b, t0, bar * 0.98, { wave: 'tri', freq: mtof(bassRoot), vol: 0.5, decay: 1.2, release: 0.05 });
    } else if (spec.bassStyle === 'pulse') {
      for (let i = 0; i < 8; i++) {
        const note = i % 4 === 3 ? bassRoot + 7 : bassRoot;
        addNote(b, t0 + i * beat * 0.5, beat * 0.45, { wave: 'tri', freq: mtof(note), vol: 0.5, decay: 0.2, release: 0.03 });
      }
    } else {
      const steps = [0, 0, 7, 0, 5, 0, 7, 12];
      steps.forEach((s, i) =>
        addNote(b, t0 + i * beat * 0.5, beat * 0.45, { wave: 'tri', freq: mtof(bassRoot + s), vol: 0.48, decay: 0.22, release: 0.03 }),
      );
    }

    // Arpeggio
    if (spec.arp !== 'none') {
      const notesPerBeat = spec.arp === 'sixteenths' ? 4 : 2;
      const pattern = [triad[0] + 12, triad[1] + 12, triad[2] + 12, triad[1] + 24];
      for (let i = 0; i < notesPerBeat * 4; i++) {
        const m = pattern[i % pattern.length];
        addNote(b, t0 + (i * beat) / notesPerBeat, (beat / notesPerBeat) * 0.9, {
          wave: arpWave,
          freq: mtof(m),
          vol: 0.1,
          decay: 0.08,
          release: 0.01,
        });
      }
    }

    // Drums
    if (spec.drums !== 'none') {
      for (let i = 0; i < 4; i++) {
        const tb = t0 + i * beat;
        if (i % 2 === 0 || spec.drums === 'drive') {
          addNote(b, tb, 0.12, { wave: 'sine', freq: 150, endFreq: 45, vol: 0.55, decay: 0.05, release: 0.03 });
        }
        if (spec.drums === 'drive' && i % 2 === 1) {
          addNoise(b, tb, 0.1, { vol: 0.2, decay: 0.04, seed: 21 + barIdx });
          addNote(b, tb, 0.08, { wave: 'tri', freq: 190, endFreq: 120, vol: 0.2, decay: 0.03 });
        }
        addNoise(b, tb + beat * 0.5, 0.04, { vol: 0.12, decay: 0.015, highpass: true, seed: 40 + i });
      }
    }
  }

  // Lead melody
  for (const [barIdx, beatPos, midi, beats] of spec.lead) {
    if (barIdx >= spec.bars) continue;
    addNote(b, barIdx * bar + beatPos * beat, beats * beat * 0.95, {
      wave: leadWave,
      freq: mtof(midi),
      vol: spec.leadVol ?? 0.2,
      attack: 0.01,
      decay: beats * beat * 1.2,
      release: 0.04,
      vibrato: spec.vibrato === false ? undefined : [5.5, 0.12],
    });
  }

  // Short fades prevent a click at the loop point.
  fadeEdges(b, 8);
  return b;
}

// Note-name shorthands for writing melodies.
const N = {};
['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'].forEach((name, i) => {
  for (let oct = 2; oct <= 7; oct++) N[`${name}${oct}`] = 12 * (oct + 1) + i;
});

const TRACKS = {
  // Title screen: mysterious A minor, slow and sparse.
  cover: {
    bpm: 84,
    bars: 16,
    progression: [
      [N.A3, 'm'], [N.F3, 'M'], [N.C4, 'M'], [N.G3, 'M'],
      [N.A3, 'm'], [N.F3, 'M'], [N.E3, 'M'], [N.E3, 'M'],
    ],
    bassStyle: 'whole',
    arp: 'eighths',
    drums: 'none',
    arpWave: 'tri',
    leadWave: 'tri',
    leadVol: 0.28,
    lead: [
      [4, 0, N.E5, 2], [4, 2, N.C5, 1], [4, 3, N.D5, 1],
      [5, 0, N.C5, 3], [5, 3, N.A4, 1],
      [6, 0, N.E5, 2], [6, 2, N.G5, 2],
      [7, 0, N.D5, 4],
      [8, 0, N.E5, 1.5], [8, 1.5, N.D5, 0.5], [8, 2, N.C5, 2],
      [9, 0, N.A4, 2], [9, 2, N.C5, 2],
      [10, 0, N.E5, 3], [10, 3, N.D5, 1],
      [11, 0, N.B4, 4],
      [12, 0, N.A5, 2], [12, 2, N.G5, 1], [12, 3, N.E5, 1],
      [13, 0, N.F5, 2], [13, 2, N.E5, 2],
      [14, 0, N.D5, 2], [14, 2, N.E5, 2],
      [15, 0, N.E5, 4],
    ],
  },

  // Hero selection: heroic C major, mid-tempo with light drums.
  selection: {
    bpm: 104,
    bars: 16,
    progression: [
      [N.C4, 'M'], [N.G3, 'M'], [N.A3, 'm'], [N.F3, 'M'],
      [N.C4, 'M'], [N.G3, 'M'], [N.F3, 'M'], [N.G3, 'M'],
    ],
    bassStyle: 'pulse',
    arp: 'eighths',
    drums: 'light',
    leadWave: 'sq25',
    leadVol: 0.2,
    lead: [
      [0, 0, N.E5, 1], [0, 1, N.G5, 1], [0, 2, N.C6, 2],
      [1, 0, N.B5, 1], [1, 1, N.G5, 1], [1, 2, N.D5, 2],
      [2, 0, N.C5, 1], [2, 1, N.E5, 1], [2, 2, N.A5, 2],
      [3, 0, N.G5, 2], [3, 2, N.F5, 2],
      [4, 0, N.E5, 1], [4, 1, N.G5, 1], [4, 2, N.C6, 2],
      [5, 0, N.D6, 2], [5, 2, N.B5, 2],
      [6, 0, N.A5, 2], [6, 2, N.C6, 2],
      [7, 0, N.G5, 4],
      [8, 0, N.C6, 2], [8, 2, N.B5, 1], [8, 3, N.A5, 1],
      [9, 0, N.G5, 2], [9, 2, N.E5, 2],
      [10, 0, N.A5, 2], [10, 2, N.C6, 2],
      [11, 0, N.A5, 1], [11, 1, N.G5, 1], [11, 2, N.F5, 2],
      [12, 0, N.E5, 1], [12, 1, N.G5, 1], [12, 2, N.C6, 2],
      [13, 0, N.D6, 1], [13, 1, N.C6, 1], [13, 2, N.B5, 2],
      [14, 0, N.A5, 2], [14, 2, N.F5, 2],
      [15, 0, N.G5, 4],
    ],
  },

  // In game: tense D minor driving loop.
  gameplay: {
    bpm: 118,
    bars: 16,
    progression: [
      [N.D4, 'm'], [N.As3, 'M'], [N.G3, 'm'], [N.A3, 'M'],
      [N.D4, 'm'], [N.As3, 'M'], [N.F3, 'M'], [N.A3, 'M'],
    ],
    bassStyle: 'walk',
    arp: 'sixteenths',
    drums: 'drive',
    arpWave: 'sq12',
    leadWave: 'sq25',
    leadVol: 0.17,
    lead: [
      [4, 0, N.A5, 1], [4, 1, N.F5, 1], [4, 2, N.D5, 2],
      [5, 0, N.D5, 1], [5, 1, N.F5, 1], [5, 2, N.As5, 2],
      [6, 0, N.A5, 1], [6, 1, N.G5, 1], [6, 2, N.D5, 2],
      [7, 0, N.Cs5, 2], [7, 2, N.E5, 2],
      [12, 0, N.D6, 1], [12, 1, N.A5, 1], [12, 2, N.F5, 2],
      [13, 0, N.F5, 1], [13, 1, N.D5, 1], [13, 2, N.As5, 2],
      [14, 0, N.A5, 2], [14, 2, N.F5, 2],
      [15, 0, N.E5, 4],
    ],
  },
};

// A short, non-looping fanfare for clearing a floor / winning.
function victory() {
  const b = newBuffer(4.2);
  const beat = 0.22;
  const notes = [
    [N.C5, 0, 1], [N.E5, 1, 1], [N.G5, 2, 1], [N.C6, 3, 2.5],
    [N.G5, 6, 0.5], [N.C6, 6.5, 0.5], [N.E6, 7, 3],
  ];
  for (const [m, at, len] of notes) {
    addNote(b, at * beat, len * beat, { wave: 'sq25', freq: mtof(m), vol: 0.26, decay: len * beat, release: 0.05, vibrato: [6, 0.1] });
    addNote(b, at * beat, len * beat, { wave: 'tri', freq: mtof(m - 12), vol: 0.3, decay: len * beat * 1.5, release: 0.05 });
  }
  [[N.C4, N.E4, N.G4], [N.C4, N.E4, N.G4]].forEach((chord, i) =>
    chord.forEach(m => addNote(b, (7 + i * 0.01) * beat, 2.8, { wave: 'sq12', freq: mtof(m), vol: 0.1, decay: 1.5, release: 0.4 })),
  );
  return b;
}

// ─── Run ───────────────────────────────────────────────────────────────────
console.log('Generating audio...');
for (const [name, make] of Object.entries(SFX)) {
  const buf = make();
  const loops = name === 'monster' || name === 'vortex';
  if (!loops) fadeEdges(buf, 3);
  normalise(buf, loops ? 0.7 : 0.89);
  writeWav(path.join(OUT_SFX, `${name}.wav`), buf);
}
for (const [name, spec] of Object.entries(TRACKS)) {
  const buf = renderTrack(spec);
  normalise(buf, 0.85);
  writeWav(path.join(OUT_MUSIC, `${name}.wav`), buf);
}
{
  const buf = victory();
  fadeEdges(buf, 5);
  normalise(buf, 0.9);
  writeWav(path.join(OUT_MUSIC, 'victory.wav'), buf);
}
console.log('Done.');
