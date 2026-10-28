"""
Cuts a hero sheet (3 columns x 2 rows on white: idle, attack, victory / defeat, portrait, empty) into the five
sprites the game uses, framed like every hero: the four full-body poses share one scale with the feet on one line
(swapping poses never makes the hero jump), and the portrait fills the icon frame.

Pieces are assigned by blob, not by grid line: every big blob goes to the cell its centre lies in, and every small
loose piece (a thrown bomb, a spark, an arrow tip) goes to the nearest big blob, so a prop that crosses into the
neighbouring cell still stays with its owner.

  python scripts/sliceHeroSheet.py <sheet.png> <Colour>      # Colour = Cyan, Red, Green, Gold, Pink or Orange
Writes src/assets/sprites/characters/{Hero,Attack,Win,Lose,Icon}_<Colour>.png.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sliceBossSheet import white_background_to_alpha  # noqa: E402
from processHeroArt import CANVAS, FEET_Y, HERO_HEIGHT, HERO_MAX_WIDTH, ICON, ICON_BOTTOM, ICON_HEIGHT, ICON_MAX_WIDTH, ROOT  # noqa: E402

CELLS = {(0, 0): 'Hero', (1, 0): 'Attack', (2, 0): 'Win', (0, 1): 'Lose', (1, 1): 'Icon'}
SPECK = 120  # blobs smaller than this (pixels) are noise and dropped
BIG_SHARE = 0.08  # a blob at least this share of the largest one is a figure (or a big part of one)


def blobs(mask: np.ndarray) -> list[np.ndarray]:
    work = np.where(mask, 255, 0).astype(np.uint8)
    out = []
    for y, x in zip(*np.nonzero(work == 255)):
        if work[y, x] != 255:
            continue
        region = Image.fromarray(work).copy()
        ImageDraw.floodfill(region, (int(x), int(y)), 100)
        b = np.asarray(region) == 100
        work[b] = 50
        if b.sum() >= SPECK:
            out.append(b)
    return out


def poses(sheet: Image.Image) -> dict[str, Image.Image]:
    im = white_background_to_alpha(sheet, hole_min_area=350)
    rgba = np.asarray(im)
    found = blobs(rgba[:, :, 3] > 24)
    largest = max(b.sum() for b in found)
    big = [b for b in found if b.sum() >= largest * BIG_SHARE]
    small = [b for b in found if b.sum() < largest * BIG_SHARE]
    cw, ch = im.width / 3, im.height / 2
    owner: list[tuple[int, int]] = []
    for b in big:
        ys, xs = np.nonzero(b)
        owner.append((min(2, int(xs.mean() // cw)), min(1, int(ys.mean() // ch))))
    groups: dict[tuple[int, int], np.ndarray] = {}
    for b, cell in zip(big, owner):
        groups[cell] = groups.get(cell, np.zeros_like(b)) | b
    # Sampled pixels of every big blob, to find each loose piece's nearest owner quickly.
    samples = []
    for b, cell in zip(big, owner):
        ys, xs = np.nonzero(b)
        step = max(1, len(xs) // 4000)
        samples.append((np.stack([xs[::step], ys[::step]], 1), cell))
    for b in small:
        ys, xs = np.nonzero(b)
        c = np.array([xs.mean(), ys.mean()])
        best = min(samples, key=lambda s: np.min(np.sum((s[0] - c) ** 2, axis=1)))
        groups[best[1]] = groups[best[1]] | b
    out: dict[str, Image.Image] = {}
    for cell, name in CELLS.items():
        assert cell in groups, f'missing pose: {name}'
        mask = groups[cell]
        part = rgba.copy()
        part[~mask, 3] = 0
        ys, xs = np.nonzero(mask)
        out[name] = Image.fromarray(part, 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    return out


def main(sheet_path: str, colour: str) -> None:
    found = poses(Image.open(sheet_path))
    body = [found[n] for n in ('Hero', 'Attack', 'Win', 'Lose')]
    scale = min(HERO_HEIGHT / found['Hero'].height, HERO_MAX_WIDTH / max(p.width for p in body), (FEET_Y - 3) / max(p.height for p in body))
    for name in ('Hero', 'Attack', 'Win', 'Lose'):
        p = found[name]
        w, h = round(p.width * scale), round(p.height * scale)
        canvas = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
        canvas.paste(p.resize((w, h), Image.LANCZOS), ((CANVAS - w) // 2, FEET_Y - h))
        canvas.save(os.path.join(ROOT, f'{name}_{colour}.png'), optimize=True)
        print(f'{name}_{colour}.png: {w}x{h}')
    icon = found['Icon']
    s = min(ICON_HEIGHT / icon.height, ICON_MAX_WIDTH / icon.width)
    w, h = round(icon.width * s), round(icon.height * s)
    canvas = Image.new('RGBA', (ICON, ICON), (0, 0, 0, 0))
    canvas.paste(icon.resize((w, h), Image.LANCZOS), ((ICON - w) // 2, ICON_BOTTOM - h))
    canvas.save(os.path.join(ROOT, f'Icon_{colour}.png'), optimize=True)
    print(f'Icon_{colour}.png: {w}x{h}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
