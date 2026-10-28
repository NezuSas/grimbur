"""
SUPERSEDED by scripts/makeStepSound.js, which writes the current, longer footstep. Running this one would bring back the
0.14 s step that a single step on some Android phones never sounded. Kept for the history of the design below.

Synthesises the footstep (src/assets/sfx/move.wav).

  python scripts/makeStepSound.py

Why it is synthesised: the first recording kept 98.5 % of its energy under 150 Hz (peak at 100 Hz). Phone speakers cannot
reproduce those frequencies, so on a phone a single step was inaudible (only the clicks of several quick steps stacked up),
while a tablet or headphones played it fine. A step has to live where a phone speaker works: this one is a short stone tap,
filtered noise between ~600 and ~4500 Hz with a little body around 220 Hz, and nothing below 120 Hz.

The file is then normalised exactly like the others (scripts/normalizeAudio.py: loudest-250 ms RMS of -12 dBFS).
"""
import os

import numpy as np

import normalizeAudio as na

SR = 22050
DURATION = 0.14
SEED = 7


def bandpass(x, lo, hi):
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    gain = np.zeros_like(f)
    # smooth edges (raised cosine over one octave-ish) so the filter does not ring
    gain[(f >= lo) & (f <= hi)] = 1.0
    for edge, direction in ((lo, 1), (hi, -1)):
        width = edge * 0.35
        zone = (f > edge - width) & (f < edge + width) if direction == 1 else (f > edge - width) & (f < edge + width)
        t = np.clip((f[zone] - (edge - width)) / (2 * width), 0, 1)
        ramp = 0.5 - 0.5 * np.cos(np.pi * t)
        gain[zone] = ramp if direction == 1 else 1 - ramp
    return np.fft.irfft(spec * gain, n=len(x))


def envelope(t, attack, decay):
    return np.minimum(t / attack, 1.0) * np.exp(-t / decay)


def main():
    rng = np.random.default_rng(SEED)
    n = int(SR * DURATION)
    t = np.arange(n) / SR

    # The tap: broadband noise, crisp attack, short decay.
    tap = bandpass(rng.standard_normal(n), 600, 4500) * envelope(t, 0.0015, 0.030)
    # A softer scuff right behind it (the heel settling).
    scuff_t = np.clip(t - 0.045, 0, None)
    scuff = bandpass(rng.standard_normal(n), 900, 3200) * envelope(scuff_t, 0.004, 0.025) * (t >= 0.045) * 0.45
    # A little body so it is not just a click: a damped tone around 220 Hz (well inside what a phone speaker reproduces).
    body = np.sin(2 * np.pi * 220 * t) * envelope(t, 0.002, 0.035) * 0.35

    a = tap / np.max(np.abs(tap)) + scuff / max(np.max(np.abs(scuff)), 1e-9) * 0.45 + body
    out = na.normalise(a / np.max(np.abs(a)), SR, na.loud250, na.SFX_TARGET_DB)
    out = na.fade(out, SR)
    path = os.path.join(na.ROOT, 'sfx', 'move.wav')
    na.write(path, out, SR)

    check, _ = na.read(path)
    spec = np.abs(np.fft.rfft(check * np.hanning(len(check)))) ** 2
    f = np.fft.rfftfreq(len(check), 1 / SR)
    share = lambda lo, hi: 100 * spec[(f >= lo) & (f < hi)].sum() / spec.sum()
    print(f'move.wav: {len(check) / SR:.3f}s  loudness {na.loud250(check, SR):.1f} dB  peak {na.db(float(np.max(np.abs(check)))):.1f} dB')
    print(f'  energy <150 Hz {share(0, 150):.1f}%  150-400 {share(150, 400):.1f}%  400-2k {share(400, 2000):.1f}%  >2k {share(2000, 1e9):.1f}%')


if __name__ == '__main__':
    main()
