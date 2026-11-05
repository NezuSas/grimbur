"""
Puts the high-definition art of a hero into the game (2026-11-04 pipeline: one pose per picture, transparent background,
the original file downloaded from the generator, so the hero is drawn at ~1500 px and only ever scaled DOWN).

  python scripts/processHeroHD.py <hero dir with Hero.png Attack.png Icon.png Win.png Lose.png [Front.png Back.png]> <Colour> [Front,Back]

  - Hero / Icon: framed exactly as processHeroArt.py frames them (same height and feet line; the bust filling the portrait).
  - Attack / Win / Lose: each new pose is scaled to the same area as the CURRENT in-game pose and placed on its feet line and
    centre, so the hero never changes size or jumps between poses (each picture frames its figure differently, so one
    shared scale would not do).

Writes src/assets/sprites/characters/{Hero,Attack,Icon,Win,Lose}_<Colour>.webp. Poses missing from the dir are skipped.
Run scripts/generateSkins.py afterwards so the outfits follow the new art.
"""
import os
import shutil
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import processHeroArt as P  # noqa: E402

QUALITY = 92


def to_webp(png_path: str) -> None:
    Image.open(png_path).convert('RGBA').save(png_path[:-4] + '.webp', 'WEBP', quality=QUALITY, method=6)
    os.remove(png_path)


def matched_pose(src: str, current: str) -> Image.Image:
    new = P.clean_alpha(Image.open(src).convert('RGBA'))
    old = Image.open(current).convert('RGBA')
    nx0, ny0, nx1, ny1 = P.bbox(new)
    ox0, oy0, ox1, oy1 = P.bbox(old)
    # Same area as the current pose (the new picture may frame the figure tighter or looser in either direction).
    scale = (((oy1 - oy0) / (ny1 - ny0)) * ((ox1 - ox0) / (nx1 - nx0))) ** 0.5
    scale = min(scale, (oy1 - P.MARGIN) / (ny1 - ny0))
    # Never wider than the canvas allows.
    scale = min(scale, (P.CANVAS - 2 * P.MARGIN) / (nx1 - nx0))
    w, h = new.size
    scaled = new.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    canvas = Image.new('RGBA', (P.CANVAS, P.CANVAS), (0, 0, 0, 0))
    cx = (ox0 + ox1) / 2
    ox = round(cx - (nx0 + nx1) / 2 * scale)
    oy = round(oy1 - ny1 * scale)
    ox = max(P.MARGIN - round(nx0 * scale), min(ox, P.CANVAS - P.MARGIN - round(nx1 * scale)))
    canvas.paste(scaled, (ox, oy), scaled)
    return canvas


def hero_pose(src: str) -> Image.Image:
    im = P.clean_alpha(Image.open(src).convert('RGBA'))
    x0, y0, x1, y1 = P.bbox(im)
    scale = min(P.HERO_HEIGHT / (y1 - y0), P.HERO_MAX_WIDTH / (x1 - x0))
    return P.place(im, scale, (x0 + x1) / 2, y1)


def icon_pose(src: str) -> Image.Image:
    icon = P.clean_alpha(Image.open(src).convert('RGBA'))
    ix0, iy0, ix1, iy1 = P.bbox(icon)
    iscale = min(P.ICON_HEIGHT / (iy1 - iy0), P.ICON_MAX_WIDTH / (ix1 - ix0))
    cropped = icon.crop((ix0, iy0, ix1, iy1)).resize((round((ix1 - ix0) * iscale), round((iy1 - iy0) * iscale)), Image.LANCZOS)
    out = Image.new('RGBA', (P.ICON, P.ICON), (0, 0, 0, 0))
    out.paste(cropped, (round((P.ICON - cropped.width) / 2), P.ICON_BOTTOM - cropped.height), cropped)
    return out


def main(src_dir: str, colour: str, only: str = '', outfit: str = '') -> None:
    # A newer outfit (assets-src/art/outfits/<outfit>/<colour>) goes to src/assets/sprites/outfits/<outfit>, each pose
    # matched to the classic outfit's pose in the game so the hero keeps its size whatever it wears.
    classic = P.ROOT
    root = os.path.join(os.path.dirname(P.ROOT), 'outfits', outfit) if outfit else P.ROOT
    os.makedirs(root, exist_ok=True)
    for k in (only.split(',') if only else ('Hero', 'Icon', 'Attack', 'Win', 'Lose', 'Front', 'Back', 'Walk1', 'Walk2', 'AttackFront', 'AttackBack')):
        src = os.path.join(src_dir, f'{k}.png')
        if not os.path.exists(src):
            print(f'{k}: not found, skipped')
            continue
        if k in ('Front', 'Back', 'Walk1', 'Walk2'):
            # Facing the viewer / walking away (moving down / up) and the side view's two walking steps: framed like the
            # standing pose, same height and feet line.
            png = os.path.join(root, f'{k}_{colour}.png')
            hero_pose(src).save(png)
            to_webp(png)
            print(f'{k}_{colour}: done')
            continue
        if k in ('AttackFront', 'AttackBack'):
            # Attacking toward / away from the viewer: framed like the front / back view it replaces while the hero shoots up
            # or down, same height and feet line (an area match shrank the archers, whose stance and capes spread wide).
            png = os.path.join(root, f'{k}_{colour}.png')
            hero_pose(src).save(png)
            to_webp(png)
            print(f'{k}_{colour}: done')
            continue
        # The pose it replaces is kept beside the new art (first run only), so a re-run still matches the original's size.
        current = os.path.join(classic, f'{k}_{colour}.webp') if outfit else os.path.join(src_dir, '_old', f'{k}.webp')
        if not outfit and not os.path.exists(current):
            os.makedirs(os.path.dirname(current), exist_ok=True)
            shutil.copyfile(os.path.join(root, f'{k}_{colour}.webp'), current)
        # The standing pose and the portrait have fixed frames; the others match the current pose's size and place.
        out = hero_pose(src) if k == 'Hero' else icon_pose(src) if k == 'Icon' else matched_pose(src, current)
        png = os.path.join(root, f'{k}_{colour}.png')
        out.save(png)
        to_webp(png)
        print(f'{k}_{colour}: done')


if __name__ == '__main__':
    # Optional third argument: only these poses, comma separated (e.g. Front,Back, or '' for all); fourth: an outfit id.
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else '', sys.argv[4] if len(sys.argv) > 4 else '')
