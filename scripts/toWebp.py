"""
Converts painted sprites to WebP (true colour with alpha, ~5-10x lighter than PNG for detailed painted art, which bands
when squeezed into a 256-colour PNG palette) and removes the PNG. The game's `require`s point at the .webp files.

  python scripts/toWebp.py src/assets/sprites/characters/*.png src/assets/sprites/enemies/*.png

Run it after any slicer that writes PNGs into characters/ or enemies/ (sliceHeroSheet, sliceCreatureGrid, sliceBossSheet).
"""
import os
import sys

from PIL import Image

QUALITY = 90


def main(paths: list[str]) -> None:
    before = after = 0
    for p in paths:
        if not p.lower().endswith('.png'):
            continue
        out = p[:-4] + '.webp'
        Image.open(p).convert('RGBA').save(out, 'WEBP', quality=QUALITY, method=6)
        before += os.path.getsize(p)
        after += os.path.getsize(out)
        os.remove(p)
    print(f'{len(paths)} files: {before / 1e6:.2f} MB -> {after / 1e6:.2f} MB')


if __name__ == '__main__':
    main(sys.argv[1:])
