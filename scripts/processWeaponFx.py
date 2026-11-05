"""
Cuts the painted weapon effects into frames and makes one recoloured set per embers-shop style.

  python scripts/processWeaponFx.py

Sources (assets-src/art/weapons): fx_flame.png (4 frames of a burning flame, Bram's bomb) and fx_arcane.png (4 frames of an
arcane burst, Mira's orb), each a horizontal strip on a transparent background. Every frame is trimmed and placed on a
256 px square standing on its base. Each style gets its own copy with the painting's hue turned to the style's colour
(saturation and light kept, so the painted shading and the white-hot core stay); the default set is the original.

Writes src/assets/sprites/fx/{Flame,Arcane}_<style>_<n>.webp and src/ui/weaponFxArt.ts.
"""
import colorsys
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets-src', 'art', 'weapons')
OUT = os.path.join(ROOT, 'src', 'assets', 'sprites', 'fx')
TS = os.path.join(ROOT, 'src', 'ui', 'weaponFxArt.ts')
SIZE = 256
FRAMES = 4

# Target colour per style (the look's blast / glow colour); None = the painting as it is.
FLAME_STYLES = {
    'default': None,
    'bomb_ember': '#FF7A1A',
    'bomb_frost': '#5FC8F0',
    'bomb_venom': '#4FA83A',
    'bomb_storm': '#8FB8E0',
    'bomb_void': '#5B3CC4',
    'bomb_royal': '#9A72AC',
}
ARCANE_STYLES = {
    'default': None,
    'orb_frost': '#7FDBFF',
    'orb_ember': '#FF8C2A',
    'orb_venom': '#3FAF4A',
    'orb_void': '#5B3CC4',
    'orb_stars': '#FFE38A',
    'orb_royal': '#9A72AC',
}


def frames_of(path):
    strip = Image.open(path).convert('RGBA')
    w = strip.width // FRAMES
    out = []
    for k in range(FRAMES):
        cell = strip.crop((k * w, 0, (k + 1) * w, strip.height))
        box = cell.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()
        out.append(cell.crop(box))
    # One scale for the whole strip (the frames keep their relative sizes), standing on the square's base.
    scale = min(SIZE * 0.96 / max(f.height for f in out), SIZE * 0.96 / max(f.width for f in out))
    squared = []
    for f in out:
        f = f.resize((max(1, round(f.width * scale)), max(1, round(f.height * scale))), Image.LANCZOS)
        sq = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        sq.paste(f, ((SIZE - f.width) // 2, SIZE - f.height - 4), f)
        squared.append(sq)
    return squared


def hue_of(hex_colour):
    r, g, b = (int(hex_colour[i:i + 2], 16) / 255 for i in (1, 3, 5))
    return colorsys.rgb_to_hsv(r, g, b)


def recolour(img, hex_colour, base_hue):
    a = np.asarray(img).astype(np.float32) / 255
    rgb, alpha = a[..., :3], a[..., 3:]
    mx, mn = rgb.max(-1), rgb.min(-1)
    v = mx
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    # Hue in turns.
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    d = np.maximum(mx - mn, 1e-6)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6
    th, ts, tv = hue_of(hex_colour)
    nh = (h - base_hue + th) % 1.0
    # A pale target (frost, storm, stars) gets a paler fire; a dark one (void) keeps its depth.
    ns = np.clip(s * (0.45 + 0.75 * ts), 0, 1)
    nv = np.clip(v * (0.75 + 0.3 * tv), 0, 1)
    i = np.floor(nh * 6).astype(int) % 6
    f = nh * 6 - np.floor(nh * 6)
    p, q, t = nv * (1 - ns), nv * (1 - f * ns), nv * (1 - (1 - f) * ns)
    choices = [np.stack(c, -1) for c in ((nv, t, p), (q, nv, p), (p, nv, t), (p, q, nv), (t, p, nv), (nv, p, q))]
    out = np.zeros_like(rgb)
    for k in range(6):
        out = np.where((i == k)[..., None], choices[k], out)
    return Image.fromarray((np.concatenate([out, alpha], -1) * 255).astype(np.uint8), 'RGBA')


def main():
    os.makedirs(OUT, exist_ok=True)
    lines = [
        "import type { ImageSourcePropType } from 'react-native';",
        "import type { CosmeticId } from '../core/cosmetics/cosmetics';",
        '',
        '/** The painted weapon effects, four frames each, one recoloured set per embers-shop style (scripts/processWeaponFx.py). */',
        'export type FxFrames = readonly [ImageSourcePropType, ImageSourcePropType, ImageSourcePropType, ImageSourcePropType];',
        '',
    ]
    for name, src, styles, base in (('Flame', 'fx_flame.png', FLAME_STYLES, 'FLAME'), ('Arcane', 'fx_arcane.png', ARCANE_STYLES, 'ARCANE')):
        frames = frames_of(os.path.join(SRC, src))
        # The painting's own hue: the most common hue among its strong, bright pixels.
        a = np.asarray(frames[1]).astype(np.float32) / 255
        mask = (a[..., 3] > 0.5) & (a[..., :3].max(-1) > 0.5) & ((a[..., :3].max(-1) - a[..., :3].min(-1)) > 0.25)
        px = a[..., :3][mask]
        hues = [colorsys.rgb_to_hsv(*c)[0] for c in px[:: max(1, len(px) // 4000)]]
        base_hue = float(np.median(hues))
        desc = "Bram's bomb: the flames left on the blast tiles" if name == 'Flame' else "Mira's orb: the arcane burst on the lit tiles"
        lines.append(f'/** {desc}. */')
        lines.append(f'export const {base}_FX: Record<string, FxFrames> = {{')
        for style, colour in styles.items():
            reqs = []
            for k, fr in enumerate(frames):
                img = fr if colour is None else recolour(fr, colour, base_hue)
                fname = f'{name}_{style}_{k}.webp'
                img.save(os.path.join(OUT, fname), 'WEBP', quality=88, method=6)
                reqs.append(f"require('../assets/sprites/fx/{fname}')")
            lines.append(f"  {style}: [{', '.join(reqs)}],")
        lines.append('};')
        lines.append('')
    lines.append('/** The flames of a bomb style (the default set when none is worn). */')
    lines.append('export const flameFx = (id: CosmeticId | null | undefined): FxFrames => (id && FLAME_FX[id]) || FLAME_FX.default;')
    lines.append('/** The arcane burst of an orb style (the default set when none is worn). */')
    lines.append('export const arcaneFx = (id: CosmeticId | null | undefined): FxFrames => (id && ARCANE_FX[id]) || ARCANE_FX.default;')
    lines.append('')
    open(TS, 'w', encoding='utf8', newline='\n').write('\n'.join(lines))
    print('written', len(FLAME_STYLES) * FRAMES + len(ARCANE_STYLES) * FRAMES, 'frames')


if __name__ == '__main__':
    main()
