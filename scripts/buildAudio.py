"""
Builds the game's sounds from the downloaded CC0 recordings (see docs/AUDIO_CREDITS.md for every source):
trims the silence, makes the hazard hums seamless loops, and masters each effect to the house standard (loudest 250 ms
at -12 dBFS, peak under -1 dB, silent edges) with a smooth look-ahead limiter rather than clipping. Music masters are
written to assets-src/music at -18 dBFS RMS (scripts/convertMusic.py then makes the OGG the app ships).

  python scripts/buildAudio.py <folder with the extracted packs>
"""
import os
import sys

import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX_OUT = os.path.join(ROOT, 'src', 'assets', 'sfx')
MUSIC_OUT = os.path.join(ROOT, 'assets-src', 'music')
SFX_DB = -12.0
MUSIC_DB = -18.0
CEILING = 10 ** (-1.2 / 20)

# Effect name -> (source file, options). `loop` makes a seamless loop of that many seconds; `cut` keeps only that many seconds
# (fading out the last `fade` seconds); `rate` resamples by playback speed (pitch with it).
# The effects are generated with ElevenLabs Sound Effects (one prompt per sound, see docs/AUDIO_CREDITS.md); the chosen take of
# each is kept losslessly in assets-src/sfx-ai. `cut` keeps the first seconds (fading out the last `fade`); `loop` makes a hum.
AI = os.path.join(ROOT, 'assets-src', 'sfx-ai')
SFX = {
    'move': ('@move.flac', {'phone': True, 'cut': 0.28, 'fade': 0.08}),
    'coin': ('@coin.flac', {}),
    'attack': ('@attack.flac', {}),
    'ember': ('@ember.flac', {}),
    'forge': ('@forge.flac', {'cut': 1.0, 'fade': 0.35}),
    'relic': ('@relic.flac', {'cut': 2.2, 'fade': 0.6}),
    'ui': ('@ui.flac', {}),
    'roar': ('@roar.flac', {'cut': 3.0, 'fade': 0.8}),
    'death': ('@death.flac', {'cut': 2.8, 'fade': 0.7}),
    'monster': ('@monster.flac', {'cut': 10.0, 'fade': 0.05, 'loop': True}),
    'vortex': ('@vortex.flac', {'cut': 10.0, 'fade': 0.05, 'loop': True}),
    'teleport': ('@teleport.flac', {'cut': 1.6, 'fade': 0.4}),
    'kill_stone': ('@kill_stone.flac', {'cut': 1.3, 'fade': 0.4}),
    'kill_shadow': ('@kill_shadow.flac', {'cut': 1.1, 'fade': 0.4}),
    'kill_beast': ('@kill_beast.flac', {'cut': 1.5, 'fade': 0.4}),
    'kill_crystal': ('@kill_crystal.flac', {'cut': 1.2, 'fade': 0.3}),
    'trap': ('@trap.flac', {}),
    'shield': ('@shield.flac', {'cut': 1.2, 'fade': 0.3}),
    'charge': ('@charge.flac', {'cut': 1.0, 'fade': 0.3}),
    'bosshit': ('@bosshit.flac', {'cut': 1.0, 'fade': 0.3}),
}
MUSIC = {
    'cover': ('music/mysterious.mp3', {}),
    'selection': ('music/town_theme.mp3', {}),
    'gameplay': ('music/crystal_cave.mp3', {}),
    'boss': ('music/boss.wav', {}),
    'victory': ('music/victory.wav', {'cut': 11.4, 'fade': 2.2}),
}


def read(path, mono=True):
    x, sr = sf.read(path, always_2d=True, dtype='float64')
    return (x.mean(axis=1) if mono else x), sr


def loudest250(x, sr):
    m = x if x.ndim == 1 else x.mean(axis=1)
    win = sr // 4
    sq = m * m
    if len(m) <= win:
        return 20 * np.log10(np.sqrt(sq.mean()) + 1e-12)
    c = np.concatenate([[0.0], np.cumsum(sq)])
    return 20 * np.log10(np.sqrt((c[win:] - c[:-win]).max() / win) + 1e-12)


def trim(x, sr):
    """Drops leading and trailing silence (keeps a few ms before the attack)."""
    a = np.abs(x)
    thr = a.max() * 10 ** (-42 / 20)
    nz = np.nonzero(a > thr)[0]
    if len(nz) == 0:
        return x
    start = max(0, nz[0] - int(0.004 * sr))
    end = min(len(x), nz[-1] + int(0.02 * sr))
    return x[start:end]


def highpass(x, sr, hz=180):
    """Removes what a phone speaker cannot play (under ~150 Hz), so the footstep's energy is where it can be heard."""
    rc = 1 / (2 * np.pi * hz)
    a = rc / (rc + 1 / sr)
    y = np.empty_like(x)
    px = py = 0.0
    for i, v in enumerate(x):
        py = a * (py + v - px)
        px = v
        y[i] = py
    return y


def fades(x, sr, fade_in=0.003, fade_out=0.012):
    i, o = int(sr * fade_in), int(sr * fade_out)
    x = x.copy()
    x[:i] *= np.linspace(0, 1, i)
    x[-o:] *= np.linspace(1, 0, o)
    return x


def limiter(x, sr, ceiling=CEILING, release=0.06, look=0.002):
    """A smooth look-ahead peak limiter: the gain dips just before a peak and recovers slowly, so nothing clips or crackles."""
    a = np.abs(x)
    need = np.minimum(1.0, ceiling / np.maximum(a, 1e-12))
    la = int(sr * look)
    # The lowest gain needed within the look-ahead window, reached a moment before the peak.
    padded = np.concatenate([need, np.ones(la)])
    g = np.minimum.reduce([padded[k:k + len(need)] for k in range(la + 1)])
    # Release: the gain climbs back towards 1 with a time constant; it falls instantly.
    coef = np.exp(-1.0 / (release * sr))
    out = np.empty_like(g)
    cur = 1.0
    for idx, target in enumerate(g):
        cur = target if target < cur else target + (cur - target) * coef
        out[idx] = cur
    return x * out


def master_sfx(x, sr):
    for _ in range(40):
        x = x * 10 ** ((SFX_DB - loudest250(x, sr)) / 20)
        x = limiter(x, sr)
        if abs(loudest250(x, sr) - SFX_DB) < 0.15:
            break
    return np.clip(x, -CEILING, CEILING)


def seamless_loop(x, sr, cross=0.35):
    """Overlaps the end onto the start (equal-power), then starts the loop at a zero crossing: no seam, no click."""
    n = int(sr * cross)
    body = x[n:-n] if len(x) > 4 * n else x
    head, tail = x[:n], x[-n:]
    t = np.linspace(0, np.pi / 2, n)
    joint = tail * np.cos(t) + head * np.sin(t)
    loop = np.concatenate([body, joint])
    zc = np.nonzero(np.diff(np.signbit(loop)))[0]
    if len(zc):
        loop = np.roll(loop, -(zc[0] + 1))
    return loop


def cut(x, sr, seconds, fade):
    x = x[: int(sr * seconds)].copy()
    f = int(sr * fade)
    x[-f:] *= np.linspace(1, 0, f) ** 2
    return x


def write_wav(path, x, sr):
    sf.write(path, x, sr, subtype='PCM_16')


def build(src_root):
    for name, (src, opt) in SFX.items():
        x, sr = read(os.path.join(AI, src[1:]) if src.startswith('@') else os.path.join(src_root, src))
        if 'cut' in opt and not opt.get('loop'):
            x = cut(trim(x, sr), sr, opt['cut'], opt['fade'])
        elif 'cut' in opt:
            x = x[: int(sr * opt['cut'])]  # a loop keeps a plain slice: its ends are cross-faded into each other below
        if opt.get('phone'):
            x = highpass(highpass(x, sr, 220), sr, 220)  # twice: a steeper cut of what a phone cannot play
        if opt.get('loop'):
            x = seamless_loop(x, sr)
            x = master_sfx(x, sr)
            # Hums are steady, so the limiter barely acts; the loop must still begin and end at silence-level samples.
            zc = np.nonzero(np.diff(np.signbit(x)))[0]
            x = x[zc[0] + 1: zc[-1] + 1]
            x = fades(x, sr, 0.003, 0.003)  # a noisy hum has no quiet zero crossing: 3 ms edges keep it click-free
        else:
            x = fades(trim(x, sr), sr)
            x = master_sfx(x, sr)
            x = fades(x, sr, 0.002, 0.008)
        write_wav(os.path.join(SFX_OUT, f'{name}.wav'), x, sr)
        print(f'sfx {name:13} {len(x) / sr:5.2f}s {sr}Hz loud {loudest250(x, sr):6.2f} peak {20 * np.log10(np.abs(x).max()):6.2f}')
    for name, (src, opt) in MUSIC.items():
        x, sr = read(os.path.join(src_root, src), mono=False)
        if 'cut' in opt:
            x = np.stack([cut(x[:, c], sr, opt['cut'], opt['fade']) for c in range(x.shape[1])], axis=1)
        rms = 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-12)
        x = x * 10 ** ((MUSIC_DB - rms) / 20)
        peak = np.abs(x).max()
        if peak > CEILING:
            x = np.stack([limiter(x[:, c], sr) for c in range(x.shape[1])], axis=1)
            x = x * 10 ** ((MUSIC_DB - 20 * np.log10(np.sqrt((x ** 2).mean()))) / 20)
            x = np.clip(x, -CEILING, CEILING)
        write_wav(os.path.join(MUSIC_OUT, f'{name}.wav'), x, sr)
        print(f'music {name:11} {len(x) / sr:6.1f}s {sr}Hz {x.shape[1]}ch rms {20 * np.log10(np.sqrt((x ** 2).mean())):6.2f}')


if __name__ == '__main__':
    build(sys.argv[1])
