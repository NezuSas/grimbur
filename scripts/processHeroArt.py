"""
Prepares the art of a new hero so it matches the existing ones (Vael is the reference):

  python scripts/processHeroArt.py <source dir with Hero_X.png, Attack_X.png, Icon_X.png> Pink Orange

For each colour name X it writes src/assets/sprites/characters/{Hero,Attack,Icon}_X.png:
  - standing and shooting poses: 384x384, the hero as tall as Vael, feet on the same line, centred, and BOTH poses scaled and
    anchored the same way, so switching between them never makes the character jump or change size;
  - icon: 256x256, bust filling the frame like the others;
  - a soft fade where a glow (a beam of light) would otherwise be cut by the edge of the canvas.
"""
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'assets', 'sprites', 'characters')

CANVAS = 384
ICON = 256
# Vael (Hero_Cyan) measured: the subject is 336 px tall, its feet at y=359; its icon is 224 px tall with the bottom at y=239.
HERO_HEIGHT = 336
HERO_MAX_WIDTH = 330
FEET_Y = 359
MARGIN = 3
ICON_HEIGHT = 224
ICON_MAX_WIDTH = 212
ICON_BOTTOM = 239


def bbox(im, threshold=12):
    a = np.array(im.getchannel('A'))
    ys, xs = np.where(a > threshold)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def fade_edges(im, px=110):
    """Fades the last `px` columns on the right (and left) to transparent where the picture touches the canvas edge."""
    a = np.array(im)
    alpha = a[:, :, 3].astype(np.float64)
    h, w = alpha.shape
    for side in ('right', 'left'):
        cols = alpha[:, -6:] if side == 'right' else alpha[:, :6]
        if (cols > 40).sum() < 50:
            continue
        ramp = np.linspace(1.0, 0.0, px)
        if side == 'right':
            alpha[:, w - px:] *= ramp[None, :]
        else:
            alpha[:, :px] *= ramp[::-1][None, :]
    a[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)
    return Image.fromarray(a, 'RGBA')


def place(im, scale, anchor_x, anchor_y):
    """Scales `im` and places it on a CANVAS square so the point (anchor_x, anchor_y) of the original lands on
    (CANVAS/2, FEET_Y)."""
    w, h = im.size
    scaled = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    canvas = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
    ox = round(CANVAS / 2 - anchor_x * scale)
    oy = round(FEET_Y - anchor_y * scale)
    canvas.paste(scaled, (ox, oy), scaled)
    return canvas


def process_hero(src_dir, name):
    hero = Image.open(os.path.join(src_dir, f'Hero_{name}.png')).convert('RGBA')
    attack = fade_edges(Image.open(os.path.join(src_dir, f'Attack_{name}.png')).convert('RGBA'))
    hx0, hy0, hx1, hy1 = bbox(hero)
    ax0, ay0, ax1, ay1 = bbox(attack)
    anchor_x = (hx0 + hx1) / 2
    anchor_y = hy1  # the feet of the standing pose
    scale = min(HERO_HEIGHT / (hy1 - hy0), HERO_MAX_WIDTH / (hx1 - hx0))

    # Both poses share one scale and one anchor; shrink them together if the shooting pose would touch the canvas edge.
    for _ in range(80):
        left = CANVAS / 2 + (ax0 - anchor_x) * scale
        right = CANVAS / 2 + (ax1 - anchor_x) * scale
        top = FEET_Y + (ay0 - anchor_y) * scale
        if left >= MARGIN and right <= CANVAS - MARGIN and top >= MARGIN:
            break
        scale *= 0.99
    out_hero = place(hero, scale, anchor_x, anchor_y)
    out_attack = place(attack, scale, anchor_x, anchor_y)

    icon = Image.open(os.path.join(src_dir, f'Icon_{name}.png')).convert('RGBA')
    ix0, iy0, ix1, iy1 = bbox(icon)
    iscale = min(ICON_HEIGHT / (iy1 - iy0), ICON_MAX_WIDTH / (ix1 - ix0))
    cropped = icon.crop((ix0, iy0, ix1, iy1)).resize((round((ix1 - ix0) * iscale), round((iy1 - iy0) * iscale)), Image.LANCZOS)
    out_icon = Image.new('RGBA', (ICON, ICON), (0, 0, 0, 0))
    out_icon.paste(cropped, (round((ICON - cropped.width) / 2), ICON_BOTTOM - cropped.height), cropped)

    out_hero.save(os.path.join(ROOT, f'Hero_{name}.png'), optimize=True)
    out_attack.save(os.path.join(ROOT, f'Attack_{name}.png'), optimize=True)
    out_icon.save(os.path.join(ROOT, f'Icon_{name}.png'), optimize=True)
    print(f'{name}: scale {scale:.3f}, hero {os.path.getsize(os.path.join(ROOT, f"Hero_{name}.png")) // 1024} KB')


if __name__ == '__main__':
    src = sys.argv[1]
    for colour in sys.argv[2:]:
        process_hero(src, colour)
