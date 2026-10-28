"""
Cuts a creature sheet laid out as columns = creatures, rows = poses (on white) into animation frames.
Every pose of one creature shares one scale and a common bottom baseline, so swapping frames never makes it jump.

  python scripts/sliceCreatureGrid.py <sheet.png> <cols> <rows> <Creature1>,<Creature2>,... <suffix0>,<suffix1>,...
  e.g. ... sheet.png 3 2 Guardian_Enemy,Stalker_Enemy,Sleeper_Enemy ,_Breathe   ->  Guardian_Enemy.png, Guardian_Enemy_Breathe.png ...
  One creature name = every cell is a pose of it, named in reading order:
       ... boss.png 2 2 Grimbur_Boss ,_Breathe,_Attack,_Hurt
Writes into src/assets/sprites/enemies/ (512px each).
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sliceBossSheet import OUT, PADDING, SIZE, white_background_to_alpha  # noqa: E402


def runs(flags: np.ndarray, gap: int = 6) -> list[tuple[int, int]]:
    """Contiguous stretches of True, bridging holes shorter than `gap` (wisps of smoke, a gap under a raised paw)."""
    out: list[tuple[int, int]] = []
    start, last = None, -gap - 1
    for i, on in enumerate(flags):
        if not on:
            continue
        if start is None:
            start = i
        elif i - last > gap:
            out.append((start, last + 1))
            start = i
        last = i
    if start is not None:
        out.append((start, last + 1))
    return out


def drop_specks(im: Image.Image, share: float = 0.015) -> Image.Image:
    """Clears stray blobs far smaller than the creature (a neighbour's claw tip at a cell edge, compression dust)
    so they cannot widen a frame."""
    rgba = np.asarray(im).copy()
    mask = np.where(rgba[:, :, 3] > 24, 255, 0).astype(np.uint8)
    blobs = []
    for y, x in zip(*np.nonzero(mask == 255)):
        if mask[y, x] != 255:
            continue
        region = Image.fromarray(mask).copy()
        ImageDraw.floodfill(region, (int(x), int(y)), 100)
        blob = np.asarray(region) == 100
        mask[blob] = 50
        blobs.append(blob)
    largest = max((b.sum() for b in blobs), default=0)
    for blob in blobs:
        if blob.sum() < max(250, largest * share):
            rgba[blob, 3] = 0
    return Image.fromarray(rgba, 'RGBA')


def main(sheet_path: str, cols: int, rows: int, creatures: list[str], suffixes: list[str]) -> None:
    im = white_background_to_alpha(Image.open(sheet_path), hole_min_area=350)
    cw = im.width / cols
    # frames[c][r]: pose r of column c.
    frames: list[list[Image.Image]] = []
    for c in range(cols):
        column = drop_specks(im.crop((round(c * cw), 0, round((c + 1) * cw), im.height)))
        alpha = np.asarray(column.getchannel('A')) > 24
        # Poses are split at the empty bands between them, not at fixed cell lines: generators rarely keep a grid exact.
        bands = runs(alpha.sum(axis=1) > 2)
        bands = sorted(sorted(bands, key=lambda b: b[1] - b[0], reverse=True)[:rows])
        assert len(bands) == rows, f'column {c}: found {len(bands)} poses, expected {rows}'
        frames.append([])
        for top, bottom in bands:
            xs = np.nonzero(alpha[top:bottom].any(axis=0))[0]
            frames[c].append(column.crop((xs.min(), top, xs.max() + 1, bottom)))
    if len(creatures) == 1:
        # One creature in every cell (a boss sheet): all its poses, in reading order, share one scale.
        groups = [(creatures[0], [frames[c][r] for r in range(rows) for c in range(cols)])]
    else:
        groups = list(zip(creatures, frames))
    for creature, poses in groups:
        assert len(suffixes) <= len(poses), f'{creature}: {len(suffixes)} names for {len(poses)} poses'
        inner = SIZE * (1 - 2 * PADDING)
        scale = inner / max(max(f.width, f.height) for f in poses)
        for suffix, frame in zip(suffixes, poses):
            w, h = max(1, round(frame.width * scale)), max(1, round(frame.height * scale))
            sprite = frame.resize((w, h), Image.LANCZOS)
            canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
            canvas.paste(sprite, ((SIZE - w) // 2, round(SIZE * (1 - PADDING)) - h), sprite)
            path = os.path.join(OUT, f'{creature}{suffix}.png')
            canvas.save(path, optimize=True)
            print(f'{os.path.basename(path)}: {w}x{h}')

if __name__ == '__main__':
    main(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4].split(','), sys.argv[5].split(','))
