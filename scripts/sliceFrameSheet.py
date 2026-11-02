"""
Cuts an AI-generated sheet of portrait frames (rings or arches on white, in a regular grid) into the frame images the game draws
over a portrait: the white around each frame and the big white hole in its middle both become transparent, the art keeps its
small highlights, and every frame is scaled to fill the same box as the existing ones.

  python scripts/sliceFrameSheet.py <sheet.png> <cols> <rows> <W>x<H> <out1,out2,...> [fill]   # paths relative to src/assets
  `fill` stretches each frame to the whole box (the tall arches, which the game lays a figure into edge to edge).
"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sliceBossSheet import white_background_to_alpha  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'src', 'assets')
MARGIN = 0.02


def main(sheet: str, cols: int, rows: int, size: str, names: list[str], fill: bool = False) -> None:
    w, h = (int(v) for v in size.split('x'))
    im = Image.open(sheet).convert('RGB')
    cw, ch = im.width / cols, im.height / rows
    for k, name in enumerate(names):
        r, c = divmod(k, cols)
        cell = im.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
        cut = white_background_to_alpha(cell, hole_min_area=int(cell.width * cell.height * 0.02))
        box = cut.getchannel('A').getbbox()
        assert box, f'empty cell for {name}'
        art = cut.crop(box)
        if fill:
            art = art.resize((w, h), Image.LANCZOS)
        else:
            inner_w, inner_h = int(w * (1 - 2 * MARGIN)), int(h * (1 - 2 * MARGIN))
            scale = min(inner_w / art.width, inner_h / art.height)
            art = art.resize((max(1, round(art.width * scale)), max(1, round(art.height * scale))), Image.LANCZOS)
        out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        out.paste(art, ((w - art.width) // 2, (h - art.height) // 2), art)
        path = os.path.join(ASSETS, name)
        out.save(path, optimize=True)
        print(f'{name}: {os.path.getsize(path) // 1024} KB')


if __name__ == '__main__':
    main(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5].split(','), len(sys.argv) > 6 and sys.argv[6] == 'fill')
