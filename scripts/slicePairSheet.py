"""
Cuts an AI-generated sheet of two-frame animations (each creature twice side by side, in a regular grid on white) into frame
pairs that share ONE scale and baseline, so swapping the two frames never makes the creature jump or change size.

  python scripts/slicePairSheet.py <sheet.png> <cols> <rows> <size> <Name1,Name2,...>
Writes src/assets/sprites/cosmetics/<Name>_A.png and <Name>_B.png (cells read left to right, top to bottom, two per name).
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sliceBossSheet import white_background_to_alpha  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'assets', 'sprites', 'cosmetics')
PADDING = 0.05


def figures(cut: Image.Image, count: int, rows: int) -> list[Image.Image]:
    """The `count` biggest separate figures of a cut-out sheet, read row by row, left to right. A wing that spills over a grid line
    stays with its own creature (a grid cut would clip it and leave its tip in the next cell)."""
    small = cut.getchannel('A').resize((cut.width // 4, cut.height // 4))
    mask = (np.asarray(small) > 40).astype(np.uint8)
    labels = np.zeros(mask.shape, dtype=np.int32)
    found = []
    for y, x in zip(*np.nonzero(mask)):
        if labels[y, x]:
            continue
        n = len(found) + 1
        stack = [(y, x)]
        labels[y, x] = n
        ys, xs = [], []
        while stack:
            cy, cx = stack.pop()
            ys.append(cy)
            xs.append(cx)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1] and mask[ny, nx] and not labels[ny, nx]:
                        labels[ny, nx] = n
                        stack.append((ny, nx))
        found.append((len(ys), min(xs), min(ys), max(xs), max(ys), n))
    biggest = sorted(found, reverse=True)[:count]
    row_h = cut.height / rows
    biggest.sort(key=lambda f: (int(((f[2] + f[4]) / 2 * 4) // row_h), f[1]))
    out = []
    big_labels = np.kron(labels, np.ones((4, 4), dtype=np.int32))[: cut.height, : cut.width]
    for _, x0, y0, x1, y1, n in biggest:
        box = (x0 * 4, y0 * 4, min(cut.width, (x1 + 1) * 4), min(cut.height, (y1 + 1) * 4))
        piece = np.asarray(cut).copy()
        sel = np.zeros(piece.shape[:2], dtype=bool)
        sel[: big_labels.shape[0], : big_labels.shape[1]] = big_labels == n
        piece[~sel, 3] = 0
        out.append(Image.fromarray(piece, 'RGBA').crop(box))
    return out


def main(sheet: str, cols: int, rows: int, size: int, names: list[str]) -> None:
    im = Image.open(sheet).convert('RGB')
    # Only the white around the creatures goes: white inside them (a muzzle, a cheek) is part of the art.
    cut = white_background_to_alpha(im)
    cells = figures(cut, cols * rows, rows)
    for k, name in enumerate(names):
        pair = cells[2 * k: 2 * k + 2]
        boxes = [p.getchannel('A').getbbox() for p in pair]
        assert all(boxes), f'empty cell for {name}'
        arts = [p.crop(b) for p, b in zip(pair, boxes)]
        inner = int(size * (1 - 2 * PADDING))
        scale = min(inner / max(a.width for a in arts), inner / max(a.height for a in arts))
        for art, tag in zip(arts, 'AB'):
            art = art.resize((max(1, round(art.width * scale)), max(1, round(art.height * scale))), Image.LANCZOS)
            out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
            # Centred across, sitting on one shared baseline.
            out.paste(art, ((size - art.width) // 2, size - int(size * PADDING) - art.height), art)
            path = os.path.join(OUT, f'{name}_{tag}.png')
            out.save(path, optimize=True)
            print(f'{name}_{tag}.png: {os.path.getsize(path) // 1024} KB')


if __name__ == '__main__':
    main(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5].split(','))
