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
SFX = {
    'move': ('kenney-rpg/audio/OGG__footstep02.ogg', {}),
    'coin': ('rd-rpg/audio/item_gem_01.ogg', {}),
    'attack': ('ad-battle/audio/battle_sound_effects__Bow.wav', {}),
    'ember': ('kenney-rpg/audio/OGG__handleCoins.ogg', {}),
    'forge': ('rpg-sound-pack/audio/RPG Sound Pack__inventory__metal-ringing.wav', {}),
    'relic': ('rpg-sound-pack/audio/RPG Sound Pack__battle__magic1.wav', {}),
    'ui': ('kenney-ui/audio/click3.wav', {}),
    'roar': ('rd-rpg/audio/creature_roar_03.ogg', {}),
    'death': ('music/defeat.wav', {'cut': 4.6, 'fade': 1.6}),
    'monster': ('rd-100/audio/sfx100v2_loop_ambient_03.ogg', {'loop': True}),
    'vortex': ('rd-100/audio/sfx100v2_loop_ambient_01.ogg', {'loop': True}),
    'teleport': ('rd-100/audio/sfx100v2_air_02.ogg', {}),
    'kill_stone': ('rd-rpg/audio/stones_01.ogg', {}),
    'kill_shadow': ('rpg-sound-pack/audio/RPG Sound Pack__NPC__shade__shade4.wav', {}),
    'kill_beast': ('rd-rpg/audio/creature_die_01.ogg', {}),
    'kill_crystal': ('rd-100/audio/sfx100v2_glass_05.ogg', {}),
    'trap': ('kenney-rpg/audio/OGG__metalLatch.ogg', {}),
    'shield': ('rd-100/audio/sfx100v2_metal_hit_01.ogg', {}),
    'charge': ('rd-creature/audio/grunt_02.ogg', {}),
    'bosshit': ('rd-100/audio/sfx100v2_hit_01.ogg', {}),
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
        x, sr = read(os.path.join(src_root, src))
        if 'cut' in opt:
            x = cut(x, sr, opt['cut'], opt['fade'])
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
