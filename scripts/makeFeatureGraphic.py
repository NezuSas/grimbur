"""
Builds the Google Play feature graphic (1024x500) from the raw banner art plus the game title in the game's own typeface (Fredoka).

  python scripts/makeFeatureGraphic.py          # docs/release/store/Banner_Raw.png -> docs/release/store/feature-graphic.png

The title is drawn here, not by the image generator, so the letters are always exact. Change TITLE/TAGLINE to rename the game.
"""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORE = os.path.join(ROOT, 'docs', 'release', 'store')
FONTS = os.path.join(ROOT, 'node_modules', '@expo-google-fonts', 'fredoka')

W, H = 1024, 500
TITLE = 'WUMPUS'
SUBTITLE = 'ADVENTURES'
TAGLINE = 'Descend. Deduce. Slay the Wumpus.'
GOLD = (255, 213, 79)
OUTLINE = (20, 12, 40)


def font(weight_dir, file, size):
    return ImageFont.truetype(os.path.join(FONTS, weight_dir, file), size)


def draw_outlined(canvas, xy, text, fnt, fill, outline=OUTLINE, stroke=7, spacing=0, glow=None):
    """Text with a thick dark outline (and an optional soft glow behind it), letter-spaced."""
    x, y = xy
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx = x
    for ch in text:
        d.text((cx, y), ch, font=fnt, fill=fill, stroke_width=stroke, stroke_fill=outline)
        cx += d.textlength(ch, font=fnt) + spacing
    if glow:
        halo = layer.filter(ImageFilter.GaussianBlur(14))
        tint = Image.new('RGBA', canvas.size, glow + (0,))
        tint.putalpha(halo.getchannel('A').point(lambda v: int(v * 0.8)))
        canvas.alpha_composite(tint)
    canvas.alpha_composite(layer)
    return cx - spacing


def main():
    art = Image.open(os.path.join(STORE, 'Banner_Raw.png')).convert('RGB')
    art = art.resize((W, H), Image.LANCZOS).convert('RGBA')

    # A soft dark gradient on the left keeps the title readable over any part of the cave.
    shade = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = shade.load()
    for x in range(W):
        a = max(0, int(150 * (1 - x / (W * 0.55)))) if x < W * 0.55 else 0
        for y in range(H):
            px[x, y] = (8, 5, 20, a)
    art.alpha_composite(shade)

    left = 46
    big = font('700Bold', 'Fredoka_700Bold.ttf', 96)
    mid = font('700Bold', 'Fredoka_700Bold.ttf', 47)
    small = font('600SemiBold', 'Fredoka_600SemiBold.ttf', 22)

    draw_outlined(art, (left, 92), TITLE, big, GOLD, stroke=7, spacing=3, glow=(255, 170, 40))
    draw_outlined(art, (left + 5, 196), SUBTITLE, mid, (255, 255, 255), stroke=5, spacing=7)
    draw_outlined(art, (left + 6, 262), TAGLINE, small, (232, 226, 255), stroke=4, spacing=0)

    out = os.path.join(STORE, 'feature-graphic.png')
    art.convert('RGB').save(out, optimize=True)
    print(out, os.path.getsize(out) // 1024, 'KB')


if __name__ == '__main__':
    main()
