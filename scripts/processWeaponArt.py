"""
Fits the weapon art (attack button medallions and ammo icons, downloaded originals with a transparent background) to the
game's frames: trimmed to the picture, scaled to fill the same box as the bow's art (Attack_Ready 256 px, Icon_Arrows
256 px), centred, saved as WebP.

  python scripts/processWeaponArt.py
"""
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets-src', 'art', 'weapons')
OUT = {
    'Attack_Ready_Orb': ('ui', 256, 232),
    'Attack_Ready_Bomb': ('ui', 256, 232),
    'Icon_Orb': ('items', 256, 228),
    'Icon_Bomb_Ammo': ('items', 256, 228),
}

for name, (folder, canvas, box) in OUT.items():
    src = os.path.join(SRC, f'{name}.png')
    if not os.path.exists(src):
        print(f'{name}: not found, skipped')
        continue
    im = Image.open(src).convert('RGBA')
    a = im.getchannel('A').point(lambda v: 255 if v > 12 else 0)
    im = im.crop(a.getbbox())
    k = box / max(im.size)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    out = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    out.paste(im, ((canvas - im.width) // 2, (canvas - im.height) // 2), im)
    path = os.path.join(ROOT, 'src', 'assets', 'sprites', folder, f'{name}.webp')
    out.save(path, 'WEBP', quality=92, method=6)
    print(f'{name}: {path}')
