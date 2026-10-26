"""Builds the store/app icons from assets/emblem.png (transparent Grimbur-head emblem).

  assets/icon.png           1024 square, opaque: indigo radial gradient + emblem
  assets/adaptive-icon.png  1024, transparent, emblem inside the central 62% (Android crops the rest)
  assets/splash.png         1024, transparent, emblem (splash background colour comes from app.json)
  assets/favicon.png        256, same as icon
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'assets')
INNER = (0x1E, 0x17, 0x3F)
OUTER = (0x0E, 0x0B, 0x1F)


def emblem_tight():
    im = Image.open(os.path.join(A, 'emblem.png')).convert('RGBA')
    a = im.getchannel('A').point(lambda v: 0 if v < 12 else v)
    im.putalpha(a)
    return im.crop(a.point(lambda v: 255 if v > 40 else 0).getbbox())


def fit(em, size, share):
    side = int(size * share)
    scale = side / max(em.size)
    return em.resize((round(em.width * scale), round(em.height * scale)), Image.LANCZOS)


def place(canvas, em):
    canvas.alpha_composite(em, ((canvas.width - em.width) // 2, (canvas.height - em.height) // 2))
    return canvas


def gradient(size):
    g = Image.new('RGB', (size, size))
    px = g.load()
    c = (size - 1) / 2
    for y in range(size):
        for x in range(size):
            t = min(1.0, (((x - c) ** 2 + (y - c) ** 2) ** 0.5) / (c * 1.25))
            px[x, y] = tuple(round(INNER[i] + (OUTER[i] - INNER[i]) * t) for i in range(3))
    return g.convert('RGBA')


em = emblem_tight()
icon = place(gradient(1024), fit(em, 1024, 0.86)).convert('RGB')
icon.save(os.path.join(A, 'icon.png'), optimize=True)
place(Image.new('RGBA', (1024, 1024), (0, 0, 0, 0)), fit(em, 1024, 0.60)).save(os.path.join(A, 'adaptive-icon.png'), optimize=True)
place(Image.new('RGBA', (1024, 1024), (0, 0, 0, 0)), fit(em, 1024, 0.90)).save(os.path.join(A, 'splash.png'), optimize=True)
icon.resize((256, 256), Image.LANCZOS).save(os.path.join(A, 'favicon.png'), optimize=True)
for f in ('icon', 'adaptive-icon', 'splash', 'favicon'):
    print(f, os.path.getsize(os.path.join(A, f + '.png')) // 1024, 'KB')
