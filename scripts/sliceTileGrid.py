"""
Cuts an AI-generated tile sheet (square tiles in a regular grid on white) into one square PNG per tile.
Each tile is cropped to its own bounding box and stretched to an exact square, so the board grid stays flush
even when the generator drew a tile a few pixels off-square.

  python scripts/sliceTileGrid.py <sheet.png> <cols> <rows> <out1,out2,...> [size]   # paths relative to src/assets
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sliceBossSheet import white_background_to_alpha  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'src', 'assets')


def longest_run(flags: np.ndarray) -> tuple[int, int] | None:
    best, start = None, None
    for i, on in enumerate(list(flags) + [False]):
        if on and start is None:
            start = i
        elif not on and start is not None:
            if best is None or i - start > best[1] - best[0]:
                best = (start, i)
            start = None
    return best


def tile_box(cell: Image.Image) -> tuple[int, int, int, int] | None:
    """The tile is the longest solid run of dark rows and columns: faint background haze and the sliver of a
    neighbouring tile that an uneven grid leaves at a cell's edge never count."""
    ink = np.asarray(cell.convert('L')) < 150
    rows = longest_run(ink.mean(axis=1) > 0.15)
    cols = longest_run(ink.mean(axis=0) > 0.15)
    if not rows or not cols:
        return None
    return cols[0], rows[0], cols[1], rows[1]


def main(sheet_path: str, cols: int, rows: int, names: list[str], size: int = 256) -> None:
    im = white_background_to_alpha(Image.open(sheet_path))
    cw, ch = im.width / cols, im.height / rows
    cells = [im.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch))) for r in range(rows) for c in range(cols)]
    assert len(names) <= len(cells), f'{len(names)} names for {len(cells)} cells'
    for name, cell in zip(names, cells):
        if not name:
            continue
        box = tile_box(cell)
        assert box, f'empty cell for {name}'
        tile = cell.crop(box).resize((size, size), Image.LANCZOS)
        path = os.path.join(ASSETS, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        tile.save(path, optimize=True)
        print(f'{name}: {box[2] - box[0]}x{box[3] - box[1]} -> {size}px, {os.path.getsize(path) // 1024} KB')


if __name__ == '__main__':
    main(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4].split(','), int(sys.argv[5]) if len(sys.argv) > 5 else 256)
