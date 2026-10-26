"""
Synthesizes the small UI effects (ui tick, forge anvil, ember chime) as 16-bit mono WAVs in src/assets/sfx,
normalised exactly like every other effect: loudest-250ms RMS at -12 dBFS, peak under -1 dB, silent edges
(tests/engine/audioMix.test.ts checks all three).

  python scripts/makeSfx.py
"""
import os
import wave

import numpy as np

RATE = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'assets', 'sfx')
TARGET_DB = -12.0
PEAK = 0.88  # comfortably under the -0.9 dB ceiling


def t(seconds: float) -> np.ndarray:
    return np.arange(int(RATE * seconds)) / RATE


def tone(freq: float, seconds: float, tau: float, phase: float = 0.0) -> np.ndarray:
    x = t(seconds)
    return np.sin(2 * np.pi * freq * x + phase) * np.exp(-x / tau)


def sweep(f0: float, f1: float, seconds: float, tau: float) -> np.ndarray:
    x = t(seconds)
    freq = f0 + (f1 - f0) * (x / seconds)
    return np.sin(2 * np.pi * np.cumsum(freq) / RATE) * np.exp(-x / tau)


def noise(seconds: float, tau: float, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    x = t(seconds)
    return rng.standard_normal(len(x)) * np.exp(-x / tau)


def lowpass(x: np.ndarray, alpha: float) -> np.ndarray:
    out = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += alpha * (v - acc)
        out[i] = acc
    return out


def mix(parts: list[tuple[np.ndarray, float, float]], seconds: float) -> np.ndarray:
    """Sums (signal, gain, start-seconds) into one buffer of the given length."""
    out = np.zeros(int(RATE * seconds))
    for signal, gain, start in parts:
        i = int(RATE * start)
        n = min(len(signal), len(out) - i)
        out[i:i + n] += signal[:n] * gain
    return out


def loudest250_db(x: np.ndarray) -> float:
    win = RATE // 4
    if len(x) <= win:
        return 20 * np.log10(np.sqrt(np.mean(x * x)) + 1e-12)
    sq = x * x
    sums = np.convolve(sq, np.ones(win), mode='valid')
    return 20 * np.log10(np.sqrt(sums.max() / win) + 1e-12)


def finish(x: np.ndarray) -> np.ndarray:
    """Silent edges, then normalise to the standard loudness while keeping the peak under the ceiling."""
    fade = int(RATE * 0.003)
    x[:fade] *= np.linspace(0, 1, fade)
    x[-fade:] *= np.linspace(1, 0, fade)
    for _ in range(6):
        x = x * 10 ** ((TARGET_DB - loudest250_db(x)) / 20)
        peak = np.abs(x).max()
        if peak <= PEAK:
            break
        x = np.tanh(x / peak * 1.8) * (peak / np.tanh(1.8))  # tame only the spikes, then re-aim the loudness
        x = x * (PEAK / np.abs(x).max())
    return x


def save(name: str, x: np.ndarray) -> None:
    pcm = np.clip(x, -1, 1)
    data = (pcm * 32767).astype('<i2').tobytes()
    path = os.path.join(OUT, name)
    with wave.open(path, 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(data)
    print(name, len(pcm) / RATE, 's', os.path.getsize(path), 'bytes', f'{loudest250_db(pcm):.2f} dB')


def ui_tick() -> np.ndarray:
    # A soft wooden "thock": a falling blip with the faintest click at the front.
    return mix(
        [
            (sweep(980, 740, 0.07, 0.022), 1.0, 0.0),
            (lowpass(noise(0.015, 0.004, seed=3), 0.35), 0.5, 0.0),
        ],
        0.075,
    )


def forge_anvil() -> np.ndarray:
    # An anvil clink: a dull thump, a metallic set of inharmonic partials, a breath of sparks.
    partials = [(742, 0.09, 1.0), (1178, 0.13, 0.8), (1567, 0.07, 0.65), (2473, 0.11, 0.5), (3312, 0.05, 0.4)]
    ring = [(tone(f, 0.45, tau), g * 0.55, 0.004) for f, tau, g in partials]
    return mix(
        [
            (lowpass(noise(0.03, 0.008, seed=7), 0.18), 1.2, 0.0),
            (tone(172, 0.12, 0.035), 1.0, 0.0),
            *ring,
            (lowpass(noise(0.3, 0.1, seed=11), 0.75) * 0.08, 1.0, 0.02),
        ],
        0.48,
    )


def ember_gain() -> np.ndarray:
    # A warm two-note chime with a soft crackle underneath: embers landing in the purse.
    shimmer = lowpass(noise(0.55, 0.22, seed=13), 0.6)
    shimmer *= 0.5 + 0.5 * np.sin(2 * np.pi * 9 * t(0.55))  # slow flicker
    return mix(
        [
            (tone(523.25, 0.55, 0.17), 0.9, 0.0),
            (tone(1046.5, 0.5, 0.11), 0.25, 0.0),
            (tone(659.25, 0.48, 0.19), 0.85, 0.08),
            (tone(1318.5, 0.42, 0.1), 0.2, 0.08),
            (shimmer, 0.06, 0.0),
        ],
        0.62,
    )


if __name__ == '__main__':
    save('ui.wav', finish(ui_tick()))
    save('forge.wav', finish(forge_anvil()))
    save('ember.wav', finish(ember_gain()))
