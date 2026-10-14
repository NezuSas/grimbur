"""
Normalises the game's audio so every sound sits at a known level (see src/core/audio/mix.ts).

  python scripts/normalizeAudio.py            # rewrite the files in src/assets/sfx and src/assets/music
  python scripts/normalizeAudio.py --check    # only print the measurements

Loudness is measured the same way the unit test (tests/engine/audioMix.test.ts) measures it:
  - effects: RMS of the loudest 250 ms window (what the ear hears of a short sound), in dBFS
  - music:   RMS of the whole track, in dBFS
Targets live here and in src/core/audio/mix.ts (keep them equal). Peaks are kept under the ceiling with a soft limiter.
"""
import os
import sys
import wave

import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'assets')

SFX_TARGET_DB = -12.0     # loudest-250ms RMS of every effect
MUSIC_TARGET_DB = -18.0   # whole-track RMS of every music file
PEAK_CEILING_DB = -1.0
FADE_MS = 3.0             # tiny fades on effects so no file starts or ends with a click

SFX = ['attack', 'coin', 'death', 'monster', 'move', 'relic', 'roar', 'vortex']
MUSIC = ['cover', 'gameplay', 'selection', 'victory']


def read(path):
    w = wave.open(path)
    n, sr, ch, sw = w.getnframes(), w.getframerate(), w.getnchannels(), w.getsampwidth()
    raw = w.readframes(n)
    w.close()
    assert sw == 2 and ch == 1, f'{path}: expected 16-bit mono'
    return np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768.0, sr


def write(path, a, sr):
    data = np.clip(np.round(a * 32767.0), -32768, 32767).astype(np.int16)
    w = wave.open(path, 'wb')
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(sr)
    w.writeframes(data.tobytes())
    w.close()


def db(x):
    return 20 * np.log10(x) if x > 0 else -120.0


def loud250(a, sr):
    win = int(sr * 0.25)
    if len(a) <= win:
        return db(float(np.sqrt(np.mean(a ** 2))))
    csum = np.cumsum(np.insert(a ** 2, 0, 0))
    means = (csum[win:] - csum[:-win]) / win
    return db(float(np.sqrt(means.max())))


def rms(a, sr):
    return db(float(np.sqrt(np.mean(a ** 2))))


def soft_limit(a, ceiling):
    """Leaves everything under 70% of the ceiling untouched and rounds the peaks above it."""
    knee = 0.7 * ceiling
    out = a.copy()
    over = np.abs(a) > knee
    x = np.abs(a[over])
    out[over] = np.sign(a[over]) * (knee + (ceiling - knee) * np.tanh((x - knee) / (ceiling - knee)))
    return out


def normalise(a, sr, measure, target):
    ceiling = 10 ** (PEAK_CEILING_DB / 20)
    gain = 10 ** ((target - measure(a, sr)) / 20)
    out = a
    for _ in range(12):
        out = soft_limit(a * gain, ceiling)
        error = target - measure(out, sr)
        if abs(error) < 0.05:
            break
        gain *= 10 ** (error / 20)
    return out


def fade(a, sr):
    n = max(1, int(sr * FADE_MS / 1000))
    out = a.copy()
    ramp = np.linspace(0.0, 1.0, n)
    out[:n] *= ramp
    out[-n:] *= ramp[::-1]
    return out


def main():
    check = '--check' in sys.argv
    jobs = [('sfx', n, loud250, SFX_TARGET_DB, True) for n in SFX] + [('music', n, rms, MUSIC_TARGET_DB, False) for n in MUSIC]
    for folder, name, measure, target, fades in jobs:
        path = os.path.join(ROOT, folder, name + '.wav')
        a, sr = read(path)
        before = measure(a, sr)
        peak_before = db(float(np.max(np.abs(a))))
        if check:
            print(f'{folder}/{name:10} loudness {before:6.1f} dB  peak {peak_before:5.1f} dB  (target {target})')
            continue
        out = normalise(a, sr, measure, target)
        if fades:
            out = fade(out, sr)
        write(path, out, sr)
        after = measure(read(path)[0], sr)
        peak_after = db(float(np.max(np.abs(read(path)[0]))))
        print(f'{folder}/{name:10} {before:6.1f} -> {after:6.1f} dB   peak {peak_before:5.1f} -> {peak_after:5.1f} dB')


if __name__ == '__main__':
    main()
