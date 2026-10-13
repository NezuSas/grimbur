"""Prepares AI-generated sprites for the game: removes stray near-transparent pixels, crops to the
subject, centres it on a square canvas with padding and downsizes to the size the game needs.

Usage: python scripts/processSprites.py            (processes the list below, in place)
Originals must be in git before running (this overwrites the files)."""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPR = os.path.join(ROOT, 'src', 'assets', 'sprites')

# path relative to src/assets/sprites -> output size in px (square)
JOBS = {
    'enemies/Wumpus_Boss.png': 512,
    'enemies/Guardian_Enemy.png': 384,
    'tiles/Danger_Vortex.png': 384,
    'tiles/Trap_Sprung.png': 384,
    'items/Icon_Gem.png': 256,
    'items/Icon_Shield.png': 256,
    'items/Icon_Arrows.png': 256,
}
# Square floor tiles: opaque, edge to edge, only resized (never cropped or padded).
TILES = {
    'tiles/Tile_Hidden.png': 256,
    'tiles/Tile_Revealed.png': 256,
}
PADDING = 0.06  # share of the canvas left empty around the subject


def process(rel: str, size: int) -> None:
    path = os.path.join(SPR, rel)
    im = Image.open(path).convert('RGBA')
    r, g, b, a = im.split()
    # Faint AI watermarks / halo specks: drop anything nearly invisible.
    a = a.point(lambda v: 0 if v < 12 else v)
    im = Image.merge('RGBA', (r, g, b, a))
    box = im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    if box is None:
        raise SystemExit(f'{rel}: empty image')
    im = im.crop(box)
    side = max(im.size)
    inner = int(size * (1 - 2 * PADDING))
    scale = inner / side
    im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.paste(im, ((size - im.width) // 2, (size - im.height) // 2), im)
    canvas.save(path, optimize=True)
    print(f'{rel}: {size}px, {os.path.getsize(path) // 1024} KB')


def process_tile(rel: str, size: int) -> None:
    path = os.path.join(SPR, rel)
    im = Image.open(path).convert('RGB').resize((size, size), Image.LANCZOS)
    im.save(path, optimize=True)
    print(f'{rel}: {size}px, {os.path.getsize(path) // 1024} KB')


if __name__ == '__main__':
    only_tiles = '--tiles' in sys.argv
    if not only_tiles:
        for rel, size in JOBS.items():
            process(rel, size)
    for rel, size in TILES.items():
        process_tile(rel, size)
