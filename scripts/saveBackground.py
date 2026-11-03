"""
Saves a generated full-bleed background (a stitched 3:2 master) as the game uses it: 1536x1024 true-colour JPEG (never
palette-quantized: painted art bands and blurs in 256 colours).

  python scripts/saveBackground.py <master.png> <Name.jpg>   # written into src/assets/sprites/backgrounds/
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'assets', 'sprites', 'backgrounds')
SIZE = (1536, 1024)


def main(master: str, name: str) -> None:
    im = Image.open(master).convert('RGB')
    # Fill 3:2 exactly (crop the excess, never letterbox).
    target = SIZE[0] / SIZE[1]
    if im.width / im.height > target:
        w = round(im.height * target)
        im = im.crop(((im.width - w) // 2, 0, (im.width - w) // 2 + w, im.height))
    else:
        h = round(im.width / target)
        im = im.crop((0, (im.height - h) // 2, im.width, (im.height - h) // 2 + h))
    im = im.resize(SIZE, Image.LANCZOS)
    path = os.path.join(OUT, name)
    im.save(path, quality=88, optimize=True, progressive=True)
    print(f'{name}: {os.path.getsize(path) // 1024} KB')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
