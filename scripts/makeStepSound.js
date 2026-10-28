#!/usr/bin/env node
/**
 * Synthesises the footstep (src/assets/sfx/move.wav). Supersedes scripts/makeStepSound.py (same tap, now with a tail).
 *
 *   node scripts/makeStepSound.js
 *
 * Why it lasts ~0.42 s: the 0.14 s tap alone was inaudible as a single step on some Android phones (heard only when steps
 * came quickly one after another), while longer effects like the gem always played. Ruled out on the phone, one by one:
 * volume (+8 dB changed nothing), the number of voices, bass content (79 % of the energy is above 1 kHz), the output
 * sleeping (a looped silent track did not help) and when the sound starts (after the board is drawn did not help).
 * So the step keeps its crisp tap and the little heel scuff, and gains a gravelly rustle and a short cave tail: even if
 * a phone swallows the first instant, the rest of the step is heard. Everything stays between ~500 Hz and ~5 kHz (what a
 * phone speaker reproduces), with a touch of body at 220 Hz.
 *
 * The result is normalised like every effect (scripts/normalizeAudio.py: loudest-250 ms RMS of -12 dBFS, peaks rounded
 * under -1 dBFS, 3 ms fades). Deterministic: the same seed always writes the same file.
 */
const fs = require('fs');
const path = require('path');

const SR = 22050;
const DURATION = 0.42;
const SEED = 7;
const TARGET_DB = -12;
const CEILING_DB = -1;
const FADE_MS = 3;
const OUT = path.join(__dirname, '..', 'src', 'assets', 'sfx', 'move.wav');

const db = x => 20 * Math.log10(Math.max(x, 1e-12));

function makeRng(seed) {
  let v = seed >>> 0 || 1;
  return () => {
    v = (Math.imul(v, 1664525) + 1013904223) >>> 0;
    return v / 4294967296;
  };
}

/** White noise with a normal distribution (Box-Muller). */
function noise(rng, n) {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i += 2) {
    const r = Math.sqrt(-2 * Math.log(Math.max(rng(), 1e-12)));
    const a = 2 * Math.PI * rng();
    out[i] = r * Math.cos(a);
    if (i + 1 < n) out[i + 1] = r * Math.sin(a);
  }
  return out;
}

/** An RBJ biquad (low- or high-pass), run twice for a steeper slope. */
function biquad(x, type, freq, q = Math.SQRT1_2) {
  const w = (2 * Math.PI * freq) / SR;
  const alpha = Math.sin(w) / (2 * q);
  const cos = Math.cos(w);
  const [b0, b1, b2] = type === 'low' ? [(1 - cos) / 2, 1 - cos, (1 - cos) / 2] : [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  let out = x;
  for (let pass = 0; pass < 2; pass++) {
    const y = new Float64Array(out.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < out.length; i++) {
      const x0 = out[i];
      const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = x0; y2 = y1; y1 = y0;
      y[i] = y0;
    }
    out = y;
  }
  return out;
}
const bandpass = (x, lo, hi) => biquad(biquad(x, 'high', lo), 'low', hi);

/** Rises over `attack`, then decays exponentially with time constant `decay` (seconds), starting at `start`. */
const envelope = (t, start, attack, decay) => (t < start ? 0 : Math.min((t - start) / attack, 1) * Math.exp(-(t - start) / decay));

const peakOf = a => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const scaled = (a, k) => a.map(v => v * k);

/** Loudest 250 ms window RMS, in dBFS (as normalizeAudio.py measures effects). */
function loud250(a) {
  const win = Math.floor(SR * 0.25);
  if (a.length <= win) return db(Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length));
  let sum = 0;
  for (let i = 0; i < win; i++) sum += a[i] * a[i];
  let best = sum;
  for (let i = win; i < a.length; i++) {
    sum += a[i] * a[i] - a[i - win] * a[i - win];
    best = Math.max(best, sum);
  }
  return db(Math.sqrt(best / win));
}

/** Leaves everything under 70 % of the ceiling untouched and rounds the peaks above it (normalizeAudio.soft_limit). */
function softLimit(a, ceiling) {
  const knee = 0.7 * ceiling;
  return a.map(v => (Math.abs(v) <= knee ? v : Math.sign(v) * (knee + (ceiling - knee) * Math.tanh((Math.abs(v) - knee) / (ceiling - knee)))));
}

function normalise(a) {
  const ceiling = 10 ** (CEILING_DB / 20);
  let gain = 10 ** ((TARGET_DB - loud250(a)) / 20);
  let out = a;
  for (let i = 0; i < 12; i++) {
    out = softLimit(scaled(a, gain), ceiling);
    const error = TARGET_DB - loud250(out);
    if (Math.abs(error) < 0.05) break;
    gain *= 10 ** (error / 20);
  }
  return out;
}

function fade(a) {
  const n = Math.max(1, Math.floor((SR * FADE_MS) / 1000));
  const out = Float64Array.from(a);
  for (let i = 0; i < n; i++) {
    const g = i / (n - 1);
    out[i] *= g;
    out[out.length - 1 - i] *= g;
  }
  return out;
}

function writeWav(file, a) {
  const data = Buffer.alloc(a.length * 2);
  a.forEach((v, i) => data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

function main() {
  const rng = makeRng(SEED);
  const n = Math.floor(SR * DURATION);
  const t = Array.from({ length: n }, (_, i) => i / SR);
  const shaped = (x, env) => x.map((v, i) => v * env(t[i]));
  const unit = a => scaled(a, 1 / Math.max(peakOf(a), 1e-9));

  // The tap: broadband noise, crisp attack, short decay (as before).
  const tap = unit(shaped(bandpass(noise(rng, n), 600, 4500), s => envelope(s, 0, 0.0015, 0.03)));
  // A softer scuff right behind it (the heel settling).
  const scuff = unit(shaped(bandpass(noise(rng, n), 900, 3200), s => envelope(s, 0.045, 0.004, 0.025)));
  // Gravel shifting under the boot: what carries the step when its first instant is lost.
  const grit = unit(shaped(bandpass(noise(rng, n), 1200, 5000), s => envelope(s, 0.05, 0.02, 0.09)));
  // The cave answering: a short, darker tail.
  const tail = unit(shaped(bandpass(noise(rng, n), 500, 3000), s => envelope(s, 0.02, 0.03, 0.12)));
  // A little body so it is not just a click: a damped tone around 220 Hz.
  const body = t.map(s => Math.sin(2 * Math.PI * 220 * s) * envelope(s, 0, 0.002, 0.05));

  const mix = t.map((_, i) => tap[i] + scuff[i] * 0.45 + grit[i] * 0.55 + tail[i] * 0.4 + body[i] * 0.35);
  const out = fade(normalise(unit(mix)));
  writeWav(OUT, out);
  console.log(`move.wav: ${(out.length / SR).toFixed(3)}s  loudness ${loud250(out).toFixed(1)} dB  peak ${db(peakOf(out)).toFixed(1)} dB`);
}

main();
