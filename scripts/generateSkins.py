"""
Generates the hero skins (recoloured outfits) and src/data/skinArt.ts.

    python scripts/generateSkins.py [--contact <dir>] [--no-quantize]

Every skin is the original sprite with its signature cloth colour selected by a soft HSV mask and re-mapped.
Skin tone, hair, outline, leather, metal and eyes fall outside the mask and are untouched. Alpha is never modified.
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, 'src', 'assets', 'sprites', 'characters')
OUT_DIR = os.path.join(ROOT, 'src', 'assets', 'sprites', 'skins')
TS_OUT = os.path.join(ROOT, 'src', 'data', 'skinArt.ts')

# ---------------------------------------------------------------- constants
HERO_FILES = ['Cyan', 'Red', 'Green', 'Gold']  # index = data/characters.ts order (Vael, Sera, Borin, Auric)
HERO_NAMES = ['Vael', 'Sera', 'Borin', 'Auric']

# Per-hero mask band. hue_lo/hue_hi in degrees (the band may wrap through 0), hue_soft = feather width in degrees,
# sat_min / val_min = thresholds, *_soft = feather width of the ramp above the threshold.
# hue_center is the hero's signature hue: hue offsets from it are kept (scaled) so shading stays rich.
HERO_MASKS = {
    0: dict(hue_lo=170, hue_hi=262, hue_soft=14, sat_min=0.22, sat_soft=0.14, val_min=0.16, val_soft=0.10, hue_center=205),
    1: dict(hue_lo=336, hue_hi=3, hue_soft=6, sat_min=0.62, sat_soft=0.14, val_min=0.16, val_soft=0.10, hue_center=352),
    2: dict(stone=True, hue_lo=68, hue_hi=160, hue_soft=14, sat_min=0.34, sat_soft=0.14, val_min=0.20, val_soft=0.10, hue_center=100),
    3: dict(hue_lo=22, hue_hi=60, hue_soft=4, sat_min=0.86, sat_soft=0.08, val_min=0.5, val_soft=0.12, hue_center=42, min_density=0.42),
}

# Themes in display order. Hue themes: target hue (deg), saturation multiplier, value multiplier, whitening amount.
HUE_SKINS = {
    'ember': dict(hue=8, sat=1.0, val=1.0, white=0.0),
    'verdant': dict(hue=125, sat=0.95, val=0.98, white=0.0),
    'frost': dict(hue=195, sat=0.62, val=1.10, white=0.14),
    'royal': dict(hue=275, sat=0.9, val=1.0, white=0.0),
}
HUE_SPREAD = 0.55  # how much of the original hue variation inside the cloth is kept

# Legendary full colour grades (ramps are RGB stops by cloth brightness 0..1).
SHADOW_RAMP = [(0.0, (10, 7, 18)), (0.45, (38, 30, 58)), (0.8, (82, 68, 118)), (1.0, (132, 112, 178))]
SHADOW_RIM = (150, 105, 235)    # faint violet rim glow on the brightest cloth edges
SHADOW_GLOBAL_DESAT = 0.18
SHADOW_LUM_SCALE = 0.85  # keeps even the brightest cloth (Auric's yellow) properly dark
GILDED_RAMP = [(0.0, (96, 58, 8)), (0.4, (188, 130, 28)), (0.75, (236, 184, 62)), (1.0, (255, 236, 170))]
GILDED_WARM = (255, 214, 120)   # warm highlight added on the brightest cloth

LEGENDARY = ('shadow', 'gilded')
STONE_SAT_MAX = 0.30  # Borin: pixels less saturated than this count as stone in legendary grades

SKIN_ORDER = ['classic', 'ember', 'verdant', 'frost', 'royal', 'shadow', 'gilded']
# Hero index -> the theme that already matches its classic colour (not offered).
REDUNDANT = {0: 'frost', 1: 'ember', 2: 'verdant', 3: 'gilded'}

SKIN_ACCENT = {
    'classic': '#E8BA52', 'ember': '#FF7043', 'verdant': '#8BC34A', 'frost': '#4FC3F7',
    'royal': '#B388FF', 'shadow': '#9575CD', 'gilded': '#FFD54F',
}

KINDS = [('hero', 'Hero'), ('attack', 'Attack'), ('icon', 'Icon')]
QUANTIZE = True


# ---------------------------------------------------------------- colour helpers
def rgb_to_hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    nz = d > 1e-6
    rc = nz & (mx == r)
    gc = nz & (mx == g) & ~rc
    bc = nz & ~rc & ~gc
    h[rc] = ((g - b)[rc] / d[rc]) % 6
    h[gc] = (b - r)[gc] / d[gc] + 2
    h[bc] = (r - g)[bc] / d[bc] + 4
    h = h * 60.0
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx


def hsv_to_rgb(h, s, v):
    h = (h % 360) / 60.0
    c = v * s
    x = c * (1 - np.abs(h % 2 - 1))
    m = v - c
    z = np.zeros_like(h)
    conds = [h < 1, h < 2, h < 3, h < 4, h < 5, h >= 5]
    rs = [c, x, z, z, x, c]
    gs = [x, c, c, x, z, z]
    bs = [z, z, x, c, c, x]
    r = np.select(conds, rs) + m
    g = np.select(conds, gs) + m
    b = np.select(conds, bs) + m
    return np.stack([r, g, b], -1)


def ramp(x, lo, soft):
    return np.clip((x - lo) / max(soft, 1e-6), 0, 1)


def hue_diff(h, c):
    return (h - c + 180) % 360 - 180


def band_weight(h, lo, hi, soft):
    """1 inside [lo, hi] (may wrap through 0), falling to 0 over `soft` degrees outside."""
    width = (hi - lo) % 360
    mid = (lo + width / 2) % 360
    dist = np.abs(hue_diff(h, mid)) - width / 2
    return np.clip(1 - dist / soft, 0, 1)


def cloth_mask(h, s, v, m, alpha):
    w = band_weight(h, m['hue_lo'], m['hue_hi'], m['hue_soft'])
    w = w * ramp(s, m['sat_min'] - m['sat_soft'] * 0.5, m['sat_soft'])
    w = w * ramp(v, m['val_min'] - m['val_soft'] * 0.5, m['val_soft'])
    w = w * (alpha > 0.02)
    if m.get('min_density'):
        # drop thin rim-light slivers on leather: the real cloth forms big solid regions, slivers have low local density
        d = Image.fromarray((w * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(5))
        d = np.asarray(d, dtype=np.float32) / 255.0
        w = w * ramp(d, m['min_density'] - 0.1, 0.2)
    # light feathering so the recolour never ends in a hard seam
    img = Image.fromarray((w * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    w2 = np.asarray(img, dtype=np.float32) / 255.0
    return np.maximum(w2 * 0.85, w * 0.9) * (alpha > 0.02)


def sample_ramp(stops, t):
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,), dtype=np.float32)
    xs = [p for p, _ in stops]
    for ch in range(3):
        out[..., ch] = np.interp(t, xs, [c[ch] for _, c in stops])
    return out / 255.0


# ---------------------------------------------------------------- recolouring
def recolor(img, hero, skin):
    a = np.asarray(img.convert('RGBA'), dtype=np.float32) / 255.0
    rgb, alpha = a[..., :3], a[..., 3]
    h, s, v = rgb_to_hsv(rgb)
    m = HERO_MASKS[hero]
    w = cloth_mask(h, s, v, m, alpha)
    if m.get('stone') and skin in LEGENDARY:
        # Borin's armour is grey stone: legendary grades also re-map the (near-neutral) stone, not just the moss
        stone = (1 - ramp(s, STONE_SAT_MAX - 0.08, 0.08)) * ramp(v, 0.18, 0.1) * (alpha > 0.02)
        w = np.maximum(w, stone)
    w = w[..., None]

    if skin in HUE_SKINS:
        t = HUE_SKINS[skin]
        nh = t['hue'] + hue_diff(h, m['hue_center']) * HUE_SPREAD
        ns = np.clip(s * t['sat'], 0, 1)
        nv = np.clip(v * t['val'], 0, 1)
        new = hsv_to_rgb(nh, ns, nv)
        new = new + (1 - new) * (t['white'] * (v[..., None] ** 1.5))
        out = rgb * (1 - w) + new * w
    else:
        # brightness of the cloth, normalised so ramps use their full range
        lum = np.clip((v - 0.12) / 0.88, 0, 1)
        # keep some of the original facet shading contrast
        t = np.clip(lum ** 0.9, 0, 1)
        if skin == 'shadow':
            t = t * SHADOW_LUM_SCALE
        if skin == 'shadow':
            new = sample_ramp(SHADOW_RAMP, t)
            rim = (np.clip((t - 0.7) / 0.3, 0, 1) ** 1.5)[..., None]
            new = new + (np.array(SHADOW_RIM, np.float32) / 255.0 - new) * rim * 0.45
        else:
            new = sample_ramp(GILDED_RAMP, t)
            hi = (np.clip((t - 0.78) / 0.22, 0, 1) ** 1.3)[..., None]
            new = new + (np.array(GILDED_WARM, np.float32) / 255.0 - new) * hi * 0.35
        out = rgb * (1 - w) + new * w
        if skin == 'shadow':  # mild global grade: slightly desaturated everywhere
            g = out.mean(-1, keepdims=True)
            out = out + (g - out) * SHADOW_GLOBAL_DESAT
            out = out * 0.97
        else:  # faint warm lift
            out = np.clip(out * np.array([1.02, 1.0, 0.97], np.float32), 0, 1)

    res = np.concatenate([np.clip(out, 0, 1), alpha[..., None]], -1)
    return Image.fromarray((res * 255 + 0.5).astype(np.uint8), 'RGBA')


def quantize(img):
    """8-bit palette PNG with alpha. Quantising premultiplied-free RGBA with fast octree keeps edges clean."""
    q = img.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    return q


def skins_for(hero):
    return [s for s in SKIN_ORDER if s != REDUNDANT.get(hero)]


# ---------------------------------------------------------------- TS output
def write_ts():
    L = []
    L.append("// GENERATED by scripts/generateSkins.py - do not edit by hand.")
    L.append("import { ImageSourcePropType } from 'react-native';")
    L.append("import characters from './characters';")
    L.append("")
    L.append("export type SkinId = " + ' | '.join("'%s'" % s for s in SKIN_ORDER) + ";")
    L.append("")
    L.append("export interface SkinArt {")
    for k in ['playerImage', 'attackImage', 'scoreImage', 'winImage', 'loseImage']:
        L.append("  %s: ImageSourcePropType;" % k)
    L.append("}")
    L.append("")
    L.append("export const SKIN_IDS: readonly SkinId[] = [" + ', '.join("'%s'" % s for s in SKIN_ORDER) + "];")
    L.append("")
    L.append("/** Representative accent colour per skin (classic is chosen by the UI per hero; this is a neutral fallback). */")
    L.append("export const SKIN_ACCENT: Record<SkinId, string> = {")
    for s in SKIN_ORDER:
        L.append("  %s: '%s'," % (s, SKIN_ACCENT[s]))
    L.append("};")
    L.append("")
    L.append("/** Skins that exist for each hero index, classic first (a theme equal to the hero's own colour is skipped). */")
    L.append("const HERO_SKINS: SkinId[][] = [")
    for hero in range(4):
        L.append("  [" + ', '.join("'%s'" % s for s in skins_for(hero)) + "],  // " + HERO_NAMES[hero])
    L.append("];")
    L.append("")
    L.append("const GENERATED: Partial<Record<SkinId, Record<number, SkinArt>>> = {")
    for skin in SKIN_ORDER[1:]:
        L.append("  %s: {" % skin)
        for hero in range(4):
            if skin == REDUNDANT.get(hero):
                continue
            base = "../assets/sprites/skins/%s/%d_" % (skin, hero)
            L.append("    %d: {" % hero)
            L.append("      playerImage: require('%shero.png')," % base)
            L.append("      attackImage: require('%sattack.png')," % base)
            L.append("      scoreImage: require('%sicon.png')," % base)
            L.append("      winImage: require('%shero.png')," % base)
            L.append("      loseImage: require('%shero.png')," % base)
            L.append("    },")
        L.append("  },")
    L.append("};")
    L.append("")
    L.append("export const skinsForHero = (heroIndex: number): SkinId[] => (HERO_SKINS[heroIndex] ?? ['classic']).slice();")
    L.append("")
    L.append("export const skinArt = (heroIndex: number, skin: SkinId): SkinArt => {")
    L.append("  const generated = skin === 'classic' ? undefined : GENERATED[skin]?.[heroIndex];")
    L.append("  if (generated) return generated;")
    L.append("  const c = characters[heroIndex] ?? characters[0];")
    L.append("  return {")
    L.append("    playerImage: c.playerImage,")
    L.append("    attackImage: c.attackImage,")
    L.append("    scoreImage: c.scoreImage,")
    L.append("    winImage: c.winImage,")
    L.append("    loseImage: c.loseImage,")
    L.append("  };")
    L.append("};")
    with open(TS_OUT, 'w', newline='\n') as f:
        f.write('\n'.join(L) + '\n')


# ---------------------------------------------------------------- contact sheets
def contact_sheets(outdir, results):
    os.makedirs(outdir, exist_ok=True)
    for hero in range(4):
        skins = skins_for(hero)
        W = 300
        sheet = Image.new('RGBA', (W * len(skins), W * 2 + 150), (34, 28, 42, 255))
        for i, skin in enumerate(skins):
            for j, kind in enumerate(['hero', 'attack', 'icon']):
                im = results[(hero, skin, kind)]
                size = W if kind != 'icon' else 150
                im = im.resize((size, size), Image.LANCZOS)
                y = j * W if j < 2 else 2 * W
                sheet.alpha_composite(im, (i * W, y))
        sheet.convert('RGB').save(os.path.join(outdir, 'contact_%d_%s.png' % (hero, HERO_NAMES[hero])))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--contact', default=None)
    ap.add_argument('--no-quantize', action='store_true')
    args = ap.parse_args()
    results = {}
    for hero in range(4):
        for kind, prefix in KINDS:
            src = Image.open(os.path.join(SRC_DIR, '%s_%s.png' % (prefix, HERO_FILES[hero]))).convert('RGBA')
            results[(hero, 'classic', kind)] = src
            for skin in skins_for(hero)[1:]:
                out = recolor(src, hero, skin)
                results[(hero, skin, kind)] = out
                d = os.path.join(OUT_DIR, skin)
                os.makedirs(d, exist_ok=True)
                path = os.path.join(d, '%d_%s.png' % (hero, kind))
                if args.no_quantize or not QUANTIZE:
                    out.save(path, optimize=True)
                else:
                    q = quantize(out)
                    q.save(path, optimize=True)
                    results[(hero, skin, kind)] = q.convert('RGBA')
    write_ts()
    total = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(OUT_DIR) for f in fs)
    print('skins written, total %.2f MB' % (total / 1e6))
    if args.contact:
        contact_sheets(args.contact, results)


if __name__ == '__main__':
    sys.exit(main())
