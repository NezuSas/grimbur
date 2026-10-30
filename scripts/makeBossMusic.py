"""
Synthesizes the lair music (the Grimbur fight) as a seamless loop: war drums, a driving phrygian bass ostinato in D,
a dissonant low pad and brass-like stabs that come in on the second half. Written like the other masters (mono,
22050 Hz, -18 dB RMS) to assets-src/music/boss.wav; scripts/convertMusic.py turns it into src/assets/music/boss.ogg.

  python scripts/makeBossMusic.py && python scripts/convertMusic.py
"""
import os

import numpy as np
import soundfile as sf

RATE = 22050
BPM = 132
BEAT = 60 / BPM
BARS = 16
LOOP = int(round(BARS * 4 * BEAT * RATE))
TARGET_DB = -18.0
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets-src', 'music', 'boss.wav')

rng = np.random.default_rng(7)
mix = np.zeros(LOOP + RATE * 2)


def hz(note: int) -> float:
    return 440.0 * 2 ** ((note - 69) / 12)


def add(at: float, sound: np.ndarray) -> None:
    i = int(round(at * RATE))
    mix[i:i + len(sound)] += sound[: max(0, len(mix) - i)]


def env(n: int, attack: float, decay: float) -> np.ndarray:
    t = np.arange(n) / RATE
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)


def kick(gain=1.0):
    n = int(0.45 * RATE)
    t = np.arange(n) / RATE
    f = 45 + 110 * np.exp(-t * 28)
    return gain * np.sin(2 * np.pi * np.cumsum(f) / RATE) * env(n, 0.002, 0.16)


def tom(note: int, gain=0.6):
    n = int(0.35 * RATE)
    t = np.arange(n) / RATE
    f = hz(note) * (1 + 0.6 * np.exp(-t * 30))
    body = np.sin(2 * np.pi * np.cumsum(f) / RATE)
    noise = rng.standard_normal(n) * np.exp(-t * 60) * 0.25
    return gain * (body + noise) * env(n, 0.002, 0.12)


def snare(gain=0.35):
    n = int(0.25 * RATE)
    t = np.arange(n) / RATE
    noise = rng.standard_normal(n)
    noise = np.convolve(noise, np.ones(3) / 3, 'same')
    return gain * (noise * np.exp(-t * 22) + 0.4 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30))


def saw(freq: float, n: int, bright=8):
    t = np.arange(n) / RATE
    return sum(np.sin(2 * np.pi * freq * k * t) / k for k in range(1, bright + 1)) * 0.6


def bass(note: int, length: float, gain=0.5):
    n = int(length * RATE)
    tone = saw(hz(note), n, 6) + 0.5 * np.sin(2 * np.pi * hz(note - 12) * np.arange(n) / RATE)
    return gain * tone * env(n, 0.005, length * 0.9)


def stab(notes, length: float, gain=0.22):
    n = int(length * RATE)
    tone = sum(saw(hz(x), n, 10) for x in notes) / len(notes)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * np.arange(n) / RATE)
    return gain * tone * vib * env(n, 0.02, length * 0.6)


def pad(notes, length: float, gain=0.12):
    n = int(length * RATE)
    t = np.arange(n) / RATE
    tone = sum(np.sin(2 * np.pi * hz(x) * t + np.sin(2 * np.pi * 0.3 * t)) for x in notes) / len(notes)
    swell = np.sin(np.pi * np.arange(n) / n) ** 0.7
    trem = 0.8 + 0.2 * np.sin(2 * np.pi * (BPM / 60) * 2 * t)
    return gain * tone * swell * trem


D2 = 38
# Phrygian ostinato: D D F D Eb D C D (eighths), the Eb giving the menace.
OSTINATO = [0, 0, 3, 0, 1, 0, -2, 0]
for bar in range(BARS):
    start = bar * 4 * BEAT
    second_half = bar >= BARS // 2
    lift = 5 if bar % 4 == 3 else 0  # every fourth bar climbs a fourth for tension
    for i, step in enumerate(OSTINATO):
        add(start + i * BEAT / 2, bass(D2 + step + lift, BEAT / 2, 0.42))
    for beat in range(4):
        add(start + beat * BEAT, kick(1.0 if beat in (0, 2) else 0.7))
        if beat in (1, 3) and (second_half or bar % 2 == 1):
            add(start + beat * BEAT, snare())
    # War drums: a syncopated tom figure.
    for off, note in ((1.5, 45), (2.5, 41), (3.5, 45), (3.75, 41)):
        add(start + off * BEAT, tom(note))
    if bar % 4 == 0:
        add(start, pad([D2 + 12, D2 + 15, D2 + 19, D2 + 13], 16 * BEAT))
    if second_half:
        chord = [62, 65, 69] if bar % 2 == 0 else [63, 67, 70]
        for off in (0, 1.5, 3):
            add(start + off * BEAT, stab(chord, BEAT * 0.9))

# Wrap the tail into the start so the loop has no seam.
loop = mix[:LOOP].copy()
tail = mix[LOOP:]
loop[: len(tail)] += tail
rms = np.sqrt(np.mean(loop ** 2))
loop *= 10 ** (TARGET_DB / 20) / rms
peak = np.max(np.abs(loop))
if peak > 0.89:
    loop = np.tanh(loop / 0.89) * 0.89  # soft-clip the drum peaks rather than lowering the whole mix
    loop *= 10 ** (TARGET_DB / 20) / np.sqrt(np.mean(loop ** 2))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
sf.write(OUT, loop.astype(np.float32), RATE, subtype='PCM_16')
print(OUT, f'{len(loop) / RATE:.1f}s', f'rms {20 * np.log10(np.sqrt(np.mean(loop ** 2))):.1f} dB', f'peak {np.max(np.abs(loop)):.2f}')
