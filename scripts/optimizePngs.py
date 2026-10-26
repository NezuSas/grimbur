"""
Shrinks PNG sprites by quantizing them to a 256-colour palette (what pngquant does, via PIL's fast octree).
The skins were exported this way already (~30 KB); the hero originals and the cover background were not
(130-164 KB and 1.6 MB). Run after adding new art:

  python scripts/optimizePngs.py --check   # writes a side-by-side composite per sample, changes nothing
  python scripts/optimizePngs.py           # rewrites the files in place (git is the undo)
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES = os.path.join(ROOT, 'src', 'assets', 'sprites')
TARGETS = [
    os.path.join(SPRITES, 'characters'),
    os.path.join(SPRITES, 'backgrounds'),
    os.path.join(SPRITES, 'enemies'),
    os.path.join(SPRITES, 'relics'),
    os.path.join(SPRITES, 'tools'),
    os.path.join(SPRITES, 'items'),
    os.path.join(SPRITES, 'tiles'),
]
# Below this size the palette rewrite is not worth a quality risk.
MIN_BYTES = 40 * 1024


def quantized(img: Image.Image) -> Image.Image:
    return img.convert('RGBA').quantize(colors=256, method=Image.Quantize.FASTOCTREE)


def files():
    for folder in TARGETS:
        for name in sorted(os.listdir(folder)):
            if name.endswith('.png'):
                yield os.path.join(folder, name)


def check():
    out_dir = os.path.join(ROOT, 'scripts', 'png_check')
    os.makedirs(out_dir, exist_ok=True)
    samples = [p for p in files() if os.path.getsize(p) >= MIN_BYTES][:3]
    for path in samples:
        img = Image.open(path).convert('RGBA')
        q = quantized(img).convert('RGBA')
        board = Image.new('RGB', (img.width * 2 + 12, img.height), (34, 24, 58))
        board.paste(img, (0, 0), img)
        board.paste(q, (img.width + 12, 0), q)
        out = os.path.join(out_dir, 'check_' + os.path.basename(path))
        board.save(out)
        print(out)


def main():
    total_before = total_after = 0
    for path in files():
        before = os.path.getsize(path)
        if before < MIN_BYTES:
            continue
        img = Image.open(path)
        if img.mode == 'P':
            continue  # already palettized
        quantized(img).save(path, optimize=True)
        after = os.path.getsize(path)
        if after >= before:  # the palette made it bigger (photographic art): keep the original
            img.convert('RGBA').save(path, optimize=True)
            after = os.path.getsize(path)
        total_before += before
        total_after += after
        print(f'{os.path.relpath(path, ROOT)}: {before // 1024} KB -> {after // 1024} KB')
    print(f'TOTAL: {total_before // 1024} KB -> {total_after // 1024} KB')


if __name__ == '__main__':
    check() if '--check' in sys.argv else main()
