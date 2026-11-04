"""
Puts the high-definition art of a creature into the game (same pipeline as processHeroHD.py: one picture per pose,
transparent background, the original file downloaded, so the creature is only ever scaled DOWN).

  python scripts/processFoeHD.py <dir with <Name>.png files> [Name ...]

<Name> is the sprite's file name without extension (Guardian_Enemy, Grimbur_Boss, Grimbur_Boss_Attack, ...). Each new picture
is scaled to the same area as the CURRENT in-game sprite and placed on its feet line and centre (the old sprite is kept in
<dir>/_old the first time). For a creature's resting pose its breathing frame (<Name>_Breathe) is derived from the new
picture itself: the body swells a little upward from the feet, so the two frames can never jump against each other.
"""
import glob
import os
import shutil
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import processHeroArt as P  # noqa: E402
from processHeroHD import matched_pose, to_webp  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'assets', 'sprites', 'enemies')
BREATH = 0.03  # how much taller the breathing frame stands (3%)


def breathe(img: Image.Image) -> Image.Image:
    x0, y0, x1, y1 = P.bbox(img)
    body = img.crop((0, 0, img.width, y1))
    tall = body.resize((img.width, round(y1 * (1 + BREATH))), Image.LANCZOS)
    # Keep the width (a hair narrower, volume holds) and the feet: the swell rises from the feet line.
    narrow = tall.resize((round(img.width * (1 - BREATH / 3)), tall.height), Image.LANCZOS)
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.paste(narrow, (round((img.width - narrow.width) / 2), y1 - narrow.height), narrow)
    return out


def main(src_dir: str, names: list[str]) -> None:
    if not names:
        names = [os.path.basename(p)[:-4] for p in glob.glob(os.path.join(src_dir, '*.png'))]
    for name in names:
        src = os.path.join(src_dir, f'{name}.png')
        if not os.path.exists(src):
            print(f'{name}: not found, skipped')
            continue
        old = os.path.join(src_dir, '_old', f'{name}.webp')
        if not os.path.exists(old):
            os.makedirs(os.path.dirname(old), exist_ok=True)
            shutil.copyfile(os.path.join(ROOT, f'{name}.webp'), old)
        out = matched_pose(src, old)
        png = os.path.join(ROOT, f'{name}.png')
        out.save(png)
        to_webp(png)
        breathe_path = os.path.join(ROOT, f'{name}_Breathe.webp')
        if os.path.exists(breathe_path) or os.path.exists(os.path.join(src_dir, '_old', f'{name}_Breathe.webp')):
            old_b = os.path.join(src_dir, '_old', f'{name}_Breathe.webp')
            if not os.path.exists(old_b):
                shutil.copyfile(breathe_path, old_b)
            bpng = os.path.join(ROOT, f'{name}_Breathe.png')
            breathe(out).save(bpng)
            to_webp(bpng)
            print(f'{name}: done (+ breathing frame)')
        else:
            print(f'{name}: done')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2:])
