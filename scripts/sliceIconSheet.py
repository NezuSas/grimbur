"""
Cuts an icon sheet (icons on white in a cols x rows layout) into one 256 px PNG per icon. Pieces are assigned by blob:
each big blob goes to the cell its centre lies in and every small loose piece (a spark, a coin, a feather) to the
nearest big blob, so an icon that strays over its cell line is never cut or polluted. A name may be empty to skip a cell.

  python scripts/sliceIconSheet.py <sheet.png> <cols> <rows> <out1,out2,...> [holes=600]   # paths relative to src/assets
(holes=0 keeps enclosed white areas, e.g. the white-hot core of an explosion.)
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sliceBossSheet import white_background_to_alpha  # noqa: E402
from sliceHeroSheet import blobs  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'src', 'assets')
SIZE = 256
PADDING = 0.04
BIG_SHARE = 0.12


def main(sheet_path: str, cols: int, rows: int, names: list[str], holes: int = 600) -> None:
    im = white_background_to_alpha(Image.open(sheet_path), hole_min_area=holes)
    rgba = np.asarray(im)
    found = blobs(rgba[:, :, 3] > 24)
    cw, ch = im.width / cols, im.height / rows
    cell_of = lambda b: (min(cols - 1, int(np.nonzero(b)[1].mean() // cw)), min(rows - 1, int(np.nonzero(b)[0].mean() // ch)))
    # "Big" is judged per cell (the largest blob of each cell), so a small icon is not mistaken for a speck of a big one.
    biggest: dict[tuple[int, int], int] = {}
    for b in found:
        c = cell_of(b)
        biggest[c] = max(biggest.get(c, 0), int(b.sum()))
    groups: dict[tuple[int, int], np.ndarray] = {}
    small = []
    for b in found:
        c = cell_of(b)
        if b.sum() >= biggest[c] * BIG_SHARE:
            groups[c] = groups.get(c, np.zeros_like(b)) | b
        else:
            small.append(b)
    samples = [(np.stack(np.nonzero(g)[::-1], 1)[::40], c) for c, g in groups.items()]
    for b in small:
        ys, xs = np.nonzero(b)
        p = np.array([xs.mean(), ys.mean()])
        best = min(samples, key=lambda s: np.min(np.sum((s[0] - p) ** 2, axis=1)))
        groups[best[1]] |= b
    inner = int(SIZE * (1 - 2 * PADDING))
    for i, name in enumerate(names):
        if not name:
            continue
        cell = (i % cols, i // cols)
        assert cell in groups, f'empty cell for {name}'
        mask = groups[cell]
        part = rgba.copy()
        part[~mask, 3] = 0
        ys, xs = np.nonzero(mask)
        icon = Image.fromarray(part, 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        s = inner / max(icon.size)
        icon = icon.resize((max(1, round(icon.width * s)), max(1, round(icon.height * s))), Image.LANCZOS)
        canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        canvas.paste(icon, ((SIZE - icon.width) // 2, (SIZE - icon.height) // 2), icon)
        path = os.path.join(ASSETS, name)
        canvas.save(path, optimize=True)
        print(f'{name}: {icon.width}x{icon.height}')


if __name__ == '__main__':
    main(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4].split(','), int(sys.argv[5].split('=')[1]) if len(sys.argv) > 5 else 600)
