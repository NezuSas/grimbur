#!/usr/bin/env python3
"""
Dark, horror-leaning audio for Grimbur Adventures, synthesised from scratch (no samples, no third-party material).

Replaces the chiptune set made by scripts/generateAudio.js (kept for reference). Deterministic: same output every run.

    python scripts/generateHorrorAudio.py

Writes 16-bit mono 22.05 kHz WAV files over src/assets/sfx/*.wav and src/assets/music/*.wav (same names, so nothing
else changes). Each new file is scaled to the loudness (RMS) of the file it replaces, so the volume constants in
src/audio/soundManager.ts stay valid.

Palette: sub drones with a beating minor second, a slow heartbeat, dripping water, wind, distant whispers, bowed
creaks, glassy bells with long reverb, stone footsteps, a deep breathing growl for guardians.
"""
import os
import wave
import numpy as np

SR = 22050
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'assets')
TAU = 2 * np.pi


def rng(seed):
    return np.random.default_rng(seed)


def n_of(sec):
    return int(round(sec * SR))


def tt(sec):
    return np.arange(n_of(sec)) / SR


def fft_filter(x, lo=None, hi=None, slope=0.15):
    """Smooth band-pass / low-pass / high-pass in the frequency domain (lo/hi in Hz)."""
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    mask = np.ones_like(f)
    if lo is not None:
        mask *= 1 / (1 + np.exp(np.clip(-(f - lo) / max(1.0, lo * slope), -50, 50)))
    if hi is not None:
        mask *= 1 / (1 + np.exp(np.clip((f - hi) / max(1.0, hi * slope), -50, 50)))
    return np.fft.irfft(spec * mask, len(x))


def noise(sec, seed, lo=None, hi=None):
    return fft_filter(rng(seed).standard_normal(n_of(sec)), lo, hi)


def reverb(x, rt=2.0, wet=0.35, seed=7, damp=3500):
    """Synthetic hall: exponentially decaying filtered noise convolved with the signal (FFT)."""
    length = n_of(rt)
    ir = rng(seed).standard_normal(length) * np.exp(-np.arange(length) / SR * 6.9 / rt)
    ir = fft_filter(ir, 120, damp)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    size = len(x) + length
    out = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)
    dry = np.zeros(size)
    dry[: len(x)] = x
    return dry * (1 - wet) + out * wet


def place(buf, sig, at):
    start = n_of(at)
    end = min(len(buf), start + len(sig))
    if start < len(buf):
        buf[start:end] += sig[: end - start]


def decay(n, tau):
    return np.exp(-np.arange(n) / SR / tau)


def fade(n, a, b):
    """Linear attack of `a` seconds and release of `b` seconds over n samples."""
    e = np.ones(n)
    na, nb = min(n, n_of(a)), min(n, n_of(b))
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nb:
        e[n - nb:] *= np.linspace(1, 0, nb)
    return e


def sine(f, sec, phase=0.0):
    return np.sin(TAU * f * tt(sec) + phase)


def saw(f, sec):
    p = (f * tt(sec)) % 1.0
    return 2 * p - 1


def loop_fold(x, seconds, overlap=1.5):
    """Makes a seamless loop of `seconds` from a longer render by crossfading its tail into its head."""
    n, o = n_of(seconds), n_of(overlap)
    head = x[:n].copy()
    w = np.linspace(0, 1, o)
    head[:o] = head[:o] * np.sqrt(w) + x[n:n + o] * np.sqrt(1 - w)
    return head


def periodic(f, seconds):
    """Snap a frequency so a whole number of cycles fits `seconds` (a drone that loops with no jump)."""
    return round(f * seconds) / seconds


def rms(x):
    return float(np.sqrt(np.mean(x ** 2)) + 1e-12)


def audible_rms(x):
    """Loudness as a phone speaker plays it: nothing below ~130 Hz counts, so sub-bass cannot fake volume."""
    return rms(fft_filter(np.asarray(x, dtype=np.float64), 130, 9000))


def write(path, x, match_rms=None, peak=0.92):
    x = np.asarray(x, dtype=np.float64)
    x = x - np.mean(x)
    if match_rms:
        x = x * (match_rms / audible_rms(x))
    # Gentle limiter so a loud match can never clip.
    x = np.tanh(x / peak) * peak
    data = np.clip(np.round(x * 32767), -32768, 32767).astype('<i2')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print('  %s  %.1fs  rms %.3f' % (os.path.relpath(path), len(x) / SR, rms(x)))


# Audible loudness (RMS above 130 Hz) of the chiptune files these replace, measured once, so the volume constants
# in src/audio/soundManager.ts stay right.
TARGET_RMS = {'sfx/move.wav': 0.2652, 'sfx/coin.wav': 0.3793, 'sfx/attack.wav': 0.1538, 'sfx/death.wav': 0.2011, 'sfx/monster.wav': 0.1128, 'sfx/vortex.wav': 0.3196, 'sfx/relic.wav': 0.3176, 'sfx/roar.wav': 0.1372, 'music/gameplay.wav': 0.0851, 'music/cover.wav': 0.1322, 'music/selection.wav': 0.1182, 'music/victory.wav': 0.1482}


# ─── Ingredients ───────────────────────────────────────────────────────────

def heartbeat(sec, bpm, level=1.0, seed=3):
    """Lub-dub thumps: a low sine with a fast pitch drop, plus a dull click so phone speakers still carry it."""
    out = np.zeros(n_of(sec))
    beat = 60 / bpm
    k = 0
    while k * beat < sec:
        at = k * beat
        for delay, gain in ((0.0, 1.0), (0.26 * beat / 0.8, 0.7)):
            n = n_of(0.22)
            tm = np.arange(n) / SR
            f = 52 + 38 * np.exp(-tm / 0.05)
            thump = np.sin(TAU * np.cumsum(f) / SR) * decay(n, 0.07)
            click = fft_filter(rng(seed + k).standard_normal(n), 120, 420) * decay(n, 0.025) * 0.5
            place(out, (thump + click) * gain * level, at + delay)
        k += 1
    return out


def drip(seed, level=1.0):
    n = n_of(0.18)
    tm = np.arange(n) / SR
    f = 1100 + (900 + 300 * rng(seed).random()) * (1 - np.exp(-tm / 0.012))
    blip = np.sin(TAU * np.cumsum(f) / SR) * decay(n, 0.03) * fade(n, 0.001, 0.02)
    return blip * level


def whisper(sec, seed, level=1.0):
    """Syllable-like bursts of band-limited noise, as if said far away."""
    r = rng(seed)
    out = np.zeros(n_of(sec))
    at = 0.0
    while at < sec - 0.3:
        dur = 0.08 + 0.14 * r.random()
        n = n_of(dur)
        band = fft_filter(r.standard_normal(n), 1400 + 900 * r.random(), 3800)
        place(out, band * fade(n, dur * 0.4, dur * 0.5) * (0.5 + r.random() * 0.5), at)
        at += dur + 0.03 + 0.1 * r.random()
        if r.random() < 0.25:
            at += 0.25 + 0.3 * r.random()
    return out * level


def creak(sec, f0, level=1.0, seed=5):
    """A bowed, wobbling groan (detuned partials with a slow glide and jitter)."""
    n = n_of(sec)
    tm = np.arange(n) / SR
    glide = f0 * (1 + 0.08 * np.sin(TAU * tm / sec * 0.5) + 0.01 * np.sin(TAU * 6.3 * tm))
    ph = np.cumsum(glide) / SR * TAU
    sig = np.sin(ph) + 0.6 * np.sin(2.01 * ph) + 0.4 * np.sin(3.02 * ph) + 0.25 * np.sin(4.99 * ph)
    jitter = 0.75 + 0.25 * fft_filter(rng(seed).standard_normal(n), None, 18)
    return sig * jitter * fade(n, sec * 0.35, sec * 0.5) * level


def bell(f, sec, level=1.0):
    """Glassy inharmonic partials: a cold, struck-metal tone."""
    n = n_of(sec)
    sig = np.zeros(n)
    for ratio, gain, tau in ((1.0, 1.0, 0.9), (2.76, 0.6, 0.5), (5.4, 0.35, 0.3), (8.93, 0.18, 0.18)):
        sig += gain * sine(f * ratio, sec) * decay(n, tau * sec / 1.2)
    return sig * fade(n, 0.002, 0.05) * level


def ghost_pair(f, sec, level=1.0):
    """A faint tritone shimmer for a high, unwelcome edge."""
    n = n_of(sec)
    tm = np.arange(n) / SR
    trem = 0.6 + 0.4 * np.sin(TAU * 0.31 * tm)
    return (sine(f, sec) + 0.8 * sine(f * 1.4142, sec)) * trem * fade(n, sec * 0.4, sec * 0.5) * level


def drone(sec, base, level=1.0):
    """Sub drone plus a minor second above it, beating slowly; harmonics keep it audible on a phone speaker."""
    f1 = periodic(base, sec)
    f2 = periodic(base * 16 / 15, sec)
    tm = tt(sec)
    swell = 0.75 + 0.25 * np.sin(TAU * tm * (1 / sec) * 2)
    raw = (
        saw(f1, sec) * 0.35 + saw(f2, sec) * 0.3
        + saw(periodic(base * 2, sec), sec) * 0.35 + saw(periodic(base * 2 * 16 / 15, sec), sec) * 0.3
        + saw(periodic(base * 3, sec), sec) * 0.18 + sine(f1, sec) * 0.2
    )
    return fft_filter(raw, 50, 1400) * swell * level


# ─── Music ─────────────────────────────────────────────────────────────────

def gameplay():
    T = 32.0
    ext = T + 1.5
    out = np.zeros(n_of(ext))
    out += drone(ext, 73.42, 1.0)
    out += heartbeat(ext, 56, 0.9) * 0.9
    wind = noise(ext, 11, 80, 900) * (0.5 + 0.5 * np.sin(TAU * tt(ext) / T * 3 + 0.4)) * 0.8
    out += wind
    r = rng(21)
    ev = np.zeros(n_of(ext))
    for k in range(7):
        place(ev, drip(100 + k) * 0.5, 2.0 + k * 4.4 + r.random() * 2)
    place(ev, creak(4.5, 170, 0.35), 6.5)
    place(ev, creak(5.0, 128, 0.32, 9), 21.0)
    place(ev, whisper(2.4, 31, 0.55), 12.0)
    place(ev, whisper(2.0, 32, 0.5), 26.5)
    place(ev, ghost_pair(1568, 6.0, 0.14), 14.0)
    out += reverb(ev, 2.6, 0.5, 5)[: len(out)]
    return loop_fold(out, T)


def cover():
    T = 40.0
    ext = T + 1.5
    out = np.zeros(n_of(ext))
    out += drone(ext, 55.0, 0.8)
    out += noise(ext, 41, 60, 600) * (0.4 + 0.4 * np.sin(TAU * tt(ext) / T * 2)) * 0.9
    # A cold music-box figure (Phrygian, sparse), bells through a big reverb.
    scale = [0, 1, 3, 5, 7, 8, 10]
    phrase = [(0, 3), (2.5, 2), (5.5, 4), (9, 1), (12.5, 5), (17, 4), (21, 2), (24.5, 3), (28.5, 1), (33, 0)]
    ev = np.zeros(n_of(ext))
    base = 440 * 2 ** ((69 - 12 - 69) / 12)  # A3-ish: 220 Hz
    for at, deg in phrase:
        f = 220 * 2 ** (scale[deg % 7] / 12) * (2 if deg >= 4 else 1)
        place(ev, bell(f, 3.0, 0.5), at)
    place(ev, creak(6.0, 140, 0.3, 4), 7.0)
    place(ev, creak(6.0, 110, 0.28, 8), 27.0)
    place(ev, whisper(2.6, 51, 0.5), 18.0)
    place(ev, ghost_pair(1396.9, 7.0, 0.12), 22.0)
    out += reverb(ev, 3.4, 0.62, 9)[: len(out)]
    return loop_fold(out, T)


def selection():
    T = 36.0
    ext = T + 1.5
    out = np.zeros(n_of(ext))
    out += drone(ext, 65.41, 0.9)
    # A dull, steady war-drum pulse that makes the choice feel urgent.
    pulse = np.zeros(n_of(ext))
    beat = 60 / 72
    k = 0
    while k * beat < ext:
        n = n_of(0.35)
        tm = np.arange(n) / SR
        f = 70 + 60 * np.exp(-tm / 0.04)
        hit = np.sin(TAU * np.cumsum(f) / SR) * decay(n, 0.12)
        hit += fft_filter(rng(60 + k).standard_normal(n), 150, 700) * decay(n, 0.03) * 0.5
        place(pulse, hit * (1.0 if k % 4 == 0 else 0.6), k * beat)
        k += 1
    out += pulse * 0.9
    out += noise(ext, 71, 100, 1100) * (0.4 + 0.4 * np.sin(TAU * tt(ext) / T * 4)) * 0.6
    ev = np.zeros(n_of(ext))
    for k, at in enumerate([3.0, 10.5, 17.0, 24.5, 31.0]):
        place(ev, bell(293.66 * (1 if k % 2 == 0 else 311.13 / 293.66), 3.0, 0.45), at)
    place(ev, creak(5.5, 150, 0.3, 13), 13.0)
    place(ev, whisper(2.2, 81, 0.5), 27.0)
    out += reverb(ev, 2.8, 0.55, 14)[: len(out)]
    return loop_fold(out, T)


def victory():
    """Relief that stays cold: a rising open fifth with a bell, a long haunted tail."""
    sec = 5.0
    out = np.zeros(n_of(sec))
    for f, at, g in ((110, 0.0, 1.0), (164.8, 0.25, 0.8), (220, 0.5, 0.7), (329.6, 0.9, 0.5)):
        n = n_of(3.6)
        sig = (sine(f, 3.6) + 0.35 * sine(f * 2.0, 3.6) + 0.12 * sine(f * 3.0, 3.6)) * fade(n, 0.5, 2.2) * decay(n, 2.0)
        place(out, sig * g * 0.5, at)
    place(out, bell(659.3, 3.0, 0.6), 0.9)
    place(out, bell(987.8, 3.0, 0.4), 1.5)
    out = reverb(out, 2.6, 0.55, 17)[: n_of(sec)]
    out *= fade(len(out), 0.01, 0.8)
    return out


# ─── Effects ───────────────────────────────────────────────────────────────

def sfx_move():
    n = n_of(0.14)
    tm = np.arange(n) / SR
    thump = np.sin(TAU * np.cumsum(95 + 80 * np.exp(-tm / 0.02)) / SR) * decay(n, 0.04)
    scuff = fft_filter(rng(2).standard_normal(n), 400, 2200) * decay(n, 0.025) * 0.5
    return (thump + scuff) * fade(n, 0.001, 0.02)


def sfx_coin():
    out = np.zeros(n_of(1.0))
    place(out, bell(1318.5, 0.8, 0.5), 0.0)
    place(out, bell(1975.5, 0.7, 0.35), 0.07)
    return reverb(out, 0.9, 0.4, 3)[: n_of(0.9)] * fade(n_of(0.9), 0.0, 0.2)


def sfx_attack():
    n = n_of(0.3)
    tm = np.arange(n) / SR
    whoosh = fft_filter(rng(5).standard_normal(n), 700, 5200) * (np.exp(-tm / 0.07) * (1 - np.exp(-tm / 0.01)))
    snap = np.sin(TAU * np.cumsum(200 * np.exp(-tm / 0.05) + 60) / SR) * decay(n, 0.05) * 0.8
    return (whoosh * 0.9 + snap) * fade(n, 0.0, 0.03)


def sfx_death():
    n = n_of(1.8)
    tm = np.arange(n) / SR
    fall = np.sin(TAU * np.cumsum(330 * np.exp(-tm / 0.5) + 40) / SR) * 0.5
    fall += 0.4 * np.sin(TAU * np.cumsum(333 * 1.06 * np.exp(-tm / 0.5) + 42) / SR)
    shriek = fft_filter(rng(9).standard_normal(n), 900, 4200) * decay(n, 0.28) * 0.35
    out = (fall * decay(n, 0.6) + shriek) * fade(n, 0.002, 0.25)
    beat = heartbeat(1.8, 70, 0.8)[:n] * (np.linspace(1, 0, n) ** 1.5)
    out = out + beat
    return reverb(out, 1.6, 0.4, 11)[:n]


def sfx_monster():
    """Deep breathing growl, exactly 2 s long and seamless: every modulation fits whole cycles."""
    T = 2.0
    n = n_of(T)
    tm = np.arange(n) / SR
    breath = 0.5 + 0.5 * np.sin(TAU * 1.0 * tm - 0.6)  # one slow breath per 2 s? two: 1 Hz -> 2 breaths
    growl = (saw(periodic(48, T), T) * 0.55 + saw(periodic(72, T), T) * 0.25) * (0.6 + 0.4 * np.sin(TAU * 7 * tm))
    growl = fft_filter(growl, 60, 700)
    rasp = fft_filter(rng(15).standard_normal(n), 250, 1800) * breath ** 2 * 1.0
    rasp = np.roll(rasp, 0)
    heart = heartbeat(T, 60, 0.8)
    return growl * (0.5 + 0.7 * breath) + rasp + heart


def sfx_vortex():
    T = 2.0
    n = n_of(T)
    tm = np.arange(n) / SR
    sweep = np.zeros(n)
    base = rng(23).standard_normal(n)
    # Wind circling: a few fixed bands whose loudness rotates round (whole cycles per loop).
    for i, (lo, hi) in enumerate(((200, 600), (500, 1400), (1100, 2800))):
        band = fft_filter(base, lo, hi)
        sweep += band * (0.55 + 0.45 * np.sin(TAU * 1.0 * tm + i * 2.1))
    chorus = (sine(periodic(180, T), T) + sine(periodic(180 * 1.05946, T), T)) * (0.5 + 0.5 * np.sin(TAU * 2 * tm)) * 0.6
    tone = sine(periodic(520, T), T) * 0.25 * np.sin(TAU * 3 * tm) ** 2
    return sweep * 0.7 + chorus + tone


def sfx_relic():
    out = np.zeros(n_of(2.2))
    place(out, bell(523.25, 1.8, 0.7), 0.0)
    place(out, bell(783.99, 1.6, 0.5), 0.12)
    place(out, bell(1046.5, 1.4, 0.35), 0.24)
    place(out, ghost_pair(2093, 1.5, 0.05), 0.1)
    return reverb(out, 1.6, 0.5, 19)[: n_of(1.8)] * fade(n_of(1.8), 0.0, 0.5)


def sfx_roar():
    n = n_of(1.5)
    tm = np.arange(n) / SR
    f = 95 * np.exp(-tm / 0.9) + 38
    ph = np.cumsum(f * (1 + 0.04 * np.sin(TAU * 17 * tm))) / SR * TAU
    body = np.sin(ph) + 0.7 * np.sin(2 * ph) + 0.5 * np.sin(3 * ph)
    body = np.tanh(body * 2.2)
    rasp = fft_filter(rng(29).standard_normal(n), 200, 2400) * decay(n, 0.5) * 0.7
    out = (body * 0.7 + rasp) * (1 - np.exp(-tm / 0.03)) * decay(n, 0.8) * fade(n, 0.0, 0.3)
    return reverb(out, 1.4, 0.3, 21)[:n]


def main():
    print('Generating horror audio...')
    jobs = [
        ('sfx/move.wav', sfx_move), ('sfx/coin.wav', sfx_coin), ('sfx/attack.wav', sfx_attack),
        ('sfx/death.wav', sfx_death), ('sfx/monster.wav', sfx_monster), ('sfx/vortex.wav', sfx_vortex),
        ('sfx/relic.wav', sfx_relic), ('sfx/roar.wav', sfx_roar),
        ('music/gameplay.wav', gameplay), ('music/cover.wav', cover), ('music/selection.wav', selection),
        ('music/victory.wav', victory),
    ]
    for rel, make in jobs:
        path = os.path.join(ROOT, rel)
        target = TARGET_RMS[rel]
        write(path, make(), match_rms=target)
    print('Done.')


if __name__ == '__main__':
    main()
