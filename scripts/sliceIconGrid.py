"""
Cuts an AI-generated icon sheet laid out as a regular grid (icons on white) into one PNG per icon.
Reuses the border-connected white removal from sliceBossSheet so pale highlights inside icons survive.

  python scripts/sliceIconGrid.py <sheet.png> <cols> <rows> <out1,out2,...>   # paths relative to src/assets
"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sliceBossSheet import white_background_to_alpha  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'src', 'assets')
SIZE = 256
PADDING = 0.04


def main(sheet_path: str, cols: int, rows: int, names: list[str]) -> None:
    im = white_background_to_alpha(Image.open(sheet_path))
    cw, ch = im.width / cols, im.height / rows
    cells = [im.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch))) for r in range(rows) for c in range(cols)]
    assert len(names) <= len(cells), f'{len(names)} names for {len(cells)} cells'
    inner = int(SIZE * (1 - 2 * PADDING))
    for name, cell in zip(names, cells):
        box = cell.getchannel('A').getbbox()
        assert box, f'empty cell for {name}'
        icon = cell.crop(box)
        scale = inner / max(icon.size)
        icon = icon.resize((max(1, round(icon.width * scale)), max(1, round(icon.height * scale))), Image.LANCZOS)
        canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        canvas.paste(icon, ((SIZE - icon.width) // 2, (SIZE - icon.height) // 2), icon)
        path = os.path.join(ASSETS, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        canvas.save(path, optimize=True)
        print(f'{name}: {os.path.getsize(path) // 1024} KB')


if __name__ == '__main__':
    main(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4].split(','))
