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
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, 'src', 'assets', 'sprites', 'characters')
OUT_DIR = os.path.join(ROOT, 'src', 'assets', 'sprites', 'skins')
TS_OUT = os.path.join(ROOT, 'src', 'data', 'skinArt.ts')

# ---------------------------------------------------------------- constants
HERO_FILES = ['Cyan', 'Red', 'Green', 'Gold', 'Pink', 'Orange']  # index = data/characters.ts order
HERO_NAMES = ['Vael', 'Sera', 'Borin', 'Auric', 'Mira', 'Bram']
HERO_COUNT = len(HERO_FILES)

BRAM_REGIONS = {
    # 2026-11-03 art (hero_orange_v2): the apron is the burnt-orange cloth below the beard (same hue as the beard, so it is boxed by pose).
    'hero': dict(
        include=[[(178, 150), (200, 150), (206, 140), (244, 126), (250, 175), (262, 200), (262, 292), (158, 292), (160, 205), (176, 180)]],
        exclude=[],
        seed=(0.45, 0.68, 9),
        shirt=[(60, 120), (330, 120), (330, 330), (60, 330)],
        shirt_exclude=[(60, 0), (330, 0), (330, 110), (60, 110)],
    ),
    'attack': dict(
        include=[[(150, 168), (200, 160), (210, 195), (235, 205), (240, 240), (225, 300), (130, 300), (55, 235), (40, 222), (80, 205), (140, 195)]],
        exclude=[],
        seed=(0.55, 0.8, 7),
        shirt=[(0, 120), (384, 120), (384, 330), (0, 330)],
        shirt_exclude=[(0, 0), (384, 0), (384, 110), (0, 110)],
    ),
    'win': dict(
        include=[[(158, 165), (190, 160), (200, 177), (220, 165), (240, 165), (238, 200), (245, 225), (250, 320), (150, 320), (155, 225), (160, 200)]],
        exclude=[],
        seed=(0.45, 0.68, 9),
        shirt=[(60, 130), (384, 130), (384, 330), (60, 330)],
        shirt_exclude=[(60, 0), (384, 0), (384, 120), (60, 120)],
    ),
    'lose': dict(
        include=[[(30, 250), (150, 250), (165, 246), (225, 244), (250, 230), (300, 240), (355, 280), (355, 330), (30, 330)]],
        exclude=[],
        seed=(0.58, 0.82, 5),
        shirt=[(60, 170), (384, 170), (384, 300), (60, 300)],
        shirt_exclude=[(60, 0), (384, 0), (384, 160), (60, 160)],
    ),
    'icon': dict(
        include=[[(130, 146), (240, 146), (240, 256), (60, 256), (60, 226), (96, 214), (126, 206), (134, 180)]],
        exclude=[],
        seed=(0.45, 0.68, 7),
        shirt=[(0, 130), (256, 130), (256, 256), (0, 256)],
        shirt_exclude=[(0, 0), (256, 0), (256, 120), (0, 120)],
    ),
}

# Per-hero mask band. hue_lo/hue_hi in degrees (the band may wrap through 0), hue_soft = feather width in degrees,
# sat_min / val_min = thresholds, *_soft = feather width of the ramp above the threshold.
# hue_center is the hero's signature hue: hue offsets from it are kept (scaled) so shading stays rich.
HERO_MASKS = {
    0: dict(hue_lo=170, hue_hi=262, hue_soft=14, sat_min=0.22, sat_soft=0.14, val_min=0.16, val_soft=0.10, hue_center=205),
    1: dict(hue_lo=336, hue_hi=3, hue_soft=6, sat_min=0.62, sat_soft=0.14, val_min=0.16, val_soft=0.10, hue_center=352),
    # Borin (2026-11-03 art): an olive moss green, hue ~52-90.
    2: dict(stone=True, hue_lo=50, hue_hi=150, hue_soft=6, sat_min=0.30, sat_soft=0.12, val_min=0.10, val_soft=0.08, hue_center=68),
    3: dict(hue_lo=24, hue_hi=60, hue_soft=4, sat_min=0.72, sat_soft=0.08, val_min=0.55, val_soft=0.12, hue_center=40, min_density=0.42),
    # Mira: crimson/magenta hood and cape (the wand gem is hue ~300-315, outside the band; cream and brass stay natural).
    4: dict(hue_lo=322, hue_hi=358, hue_soft=8, sat_min=0.45, sat_soft=0.14, val_min=0.16, val_soft=0.10, hue_center=342),
    # Bram: the beard/hair share the apron's hue, so the apron is selected by POSITION (include/exclude polygons per sprite
    # kind, pixel coordinates of the 384px poses / 256px icon) on top of a hue band. 'shirt' = the grey-blue cloth that gets a
    # mild grade in the legendary themes (never the goggle lenses: 'shirt_exclude').
    5: dict(hue_lo=6, hue_hi=25, hue_soft=3, sat_min=0.55, sat_soft=0.12, val_min=0.12, val_soft=0.10, hue_center=16,
            regions=BRAM_REGIONS),
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
SHIRT_STRENGTH = 0.55  # Bram: how far the grey shirt follows the legendary grade
STONE_SAT_MAX = 0.30  # Borin: pixels less saturated than this count as stone in legendary grades

SKIN_ORDER = ['classic', 'ember', 'verdant', 'frost', 'royal', 'shadow', 'gilded']
# Hero index -> the theme that already matches its classic colour (not offered).
REDUNDANT = {0: 'frost', 1: 'ember', 2: 'verdant', 3: 'gilded', 5: 'ember'}  # Mira (4) has all six themes

SKIN_ACCENT = {
    'classic': '#E8BA52', 'ember': '#FF7043', 'verdant': '#8BC34A', 'frost': '#4FC3F7',
    'royal': '#B388FF', 'shadow': '#9575CD', 'gilded': '#FFD54F',
}

KINDS = [('hero', 'Hero'), ('attack', 'Attack'), ('icon', 'Icon'), ('win', 'Win'), ('lose', 'Lose'), ('front', 'Front'), ('back', 'Back')]
# The front / back views (moving down / up) are optional; a hero whose cloth is boxed by pose (Bram) keeps the side view in an
# outfit for them, since its boxes only fit the side poses.
FACING_KINDS = ('front', 'back')
def has_facing(hero, kind, outfit='classic'):
    if not os.path.exists(os.path.join(outfit_dir(outfit), '%s_%s.webp' % (kind.capitalize(), HERO_FILES[hero]))):
        return False
    return outfit != 'classic' or not HERO_MASKS[hero].get('regions')
CONTACT_KINDS = ['hero', 'attack', 'icon', 'win', 'lose']
# Newer outfits (new clothes, their own art): src/assets/sprites/outfits/<outfit>/<Pose>_<Colour>.webp, made by
# scripts/processHeroHD.py --outfit. Each is worn in its own colour (`<outfit>`) and recoloured into the same chromas as
# the classic outfit (`<outfit>_<chroma>`). Their cloth keeps the hero's signature colour, so the hero's colour mask fits;
# the pose boxes (Bram's apron) only fit the classic art, so they are left out.
OUTFIT_ROOT = os.path.join(ROOT, 'src', 'assets', 'sprites', 'outfits')
NEW_OUTFITS = ['gala', 'winter']
# A newer outfit's own colour mask when the hero's classic one does not fit its cloth (Borin's gala velvet is a deep emerald,
# not his classic olive moss).
OUTFIT_MASKS = {
    ('gala', 2): dict(stone=False, hue_lo=60, hue_hi=175, hue_soft=8, sat_min=0.28, sat_soft=0.12, val_min=0.07, val_soft=0.06, hue_center=145),
    ('winter', 2): dict(stone=False, hue_lo=60, hue_hi=175, hue_soft=8, sat_min=0.28, sat_soft=0.12, val_min=0.07, val_soft=0.06, hue_center=145),
    # Auric's winter coat is a pale amber, far less saturated than his classic gold.
    ('winter', 3): dict(hue_lo=22, hue_hi=56, hue_soft=6, sat_min=0.32, sat_soft=0.12, val_min=0.40, val_soft=0.12, hue_center=40, min_density=0.35),
    # Bram's winter coat is a dark steel blue (so it stays apart from his red beard and can take chromas).
    ('winter', 5): dict(hue_lo=195, hue_hi=250, hue_soft=10, sat_min=0.18, sat_soft=0.10, val_min=0.10, val_soft=0.08, hue_center=218),
}
# Outfits offered without chromas for a hero (Bram's gala: beard, skin and coat share one hue, a recolour can't tell them
# apart). Keep in sync with OUTFIT_WITHOUT_CHROMAS in src/core/skins/skins.ts.
NO_CHROMAS = {('gala', 5)}


def outfit_dir(outfit):
    return SRC_DIR if outfit == 'classic' else os.path.join(OUTFIT_ROOT, outfit)


def outfit_ready(outfit, hero):
    """Every pose of the outfit exists for the hero (front/back optional for the classic one)."""
    if outfit == 'classic':
        return True
    return all(os.path.exists(os.path.join(outfit_dir(outfit), '%s_%s.webp' % (p, HERO_FILES[hero]))) for _, p in KINDS)


def look_id(outfit, chroma):
    return chroma if outfit == 'classic' else (outfit if chroma == 'classic' else '%s_%s' % (outfit, chroma))


# Outfits are written as WebP (true colour, ~10x lighter than PNG for painted art); the PNG path is kept for --png.
EXT = 'webp'
QUANTIZE = False  # 2026-11-03: true colour, the painted art banded in a 256-colour palette


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


def poly_mask(size, polys):
    im = Image.new('L', size, 0)
    d = ImageDraw.Draw(im)
    for p in polys:
        d.polygon(p, fill=255)
    im = im.filter(ImageFilter.GaussianBlur(1.2))
    return np.asarray(im, dtype=np.float32) / 255.0


def scaled_regions(reg, k):
    """Region polygons are written in the 384 px pose / 256 px portrait coordinates: scaled to the sprite's real size."""
    if k == 1:
        return reg
    sp = lambda poly: [(x * k, y * k) for x, y in poly]
    out = dict(reg)
    out['include'] = [sp(p) for p in reg['include']]
    out['exclude'] = [sp(p) for p in reg['exclude']]
    for key in ('shirt', 'shirt_exclude'):
        if key in reg:
            out[key] = sp(reg[key])
    return out


def cloth_mask(h, s, v, m, alpha, kind='hero'):
    w = band_weight(h, m['hue_lo'], m['hue_hi'], m['hue_soft'])
    w = w * ramp(s, m['sat_min'] - m['sat_soft'] * 0.5, m['sat_soft'])
    w = w * ramp(v, m['val_min'] - m['val_soft'] * 0.5, m['val_soft'])
    w = w * (alpha > 0.02)
    reg = m.get('regions', {}).get(kind)
    if reg:
        size = (alpha.shape[1], alpha.shape[0])
        reg = scaled_regions(reg, size[0] / (256 if kind == 'icon' else 384))
        w = w * poly_mask(size, reg['include'])
        if reg['exclude']:
            w = w * (1 - poly_mask(size, reg['exclude']))
        if reg.get('seed'):
            # win/lose: belt, pouches and bomb straps share the apron's hue but are darker. Keep only what lies within a few
            # pixels of the bright, saturated apron core (stains inside the apron are small, so they are kept).
            vmin, smin, grow = reg['seed']
            core = ((v > vmin) & (s > smin) & (w > 0.5)).astype(np.uint8) * 255
            core = Image.fromarray(core).filter(ImageFilter.MaxFilter(grow)).filter(ImageFilter.GaussianBlur(1.0))
            w = w * (np.asarray(core, dtype=np.float32) / 255.0)
    keep = m.get('keep', {}).get(kind)
    if keep:  # regions that always stay natural (held gem, sparkles, goggle rims...)
        w = w * (1 - poly_mask((alpha.shape[1], alpha.shape[0]), keep))
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
def recolor(img, hero, skin, kind='hero', outfit='classic'):
    a = np.asarray(img.convert('RGBA'), dtype=np.float32) / 255.0
    rgb, alpha = a[..., :3], a[..., 3]
    h, s, v = rgb_to_hsv(rgb)
    m = HERO_MASKS[hero]
    if outfit != 'classic':
        m = OUTFIT_MASKS.get((outfit, hero)) or {k: val for k, val in m.items() if k not in ('regions', 'keep')}
    w = cloth_mask(h, s, v, m, alpha, kind)
    if m.get('stone') and skin in LEGENDARY:
        # Borin's armour is grey stone: legendary grades also re-map the (near-neutral) stone, not just the moss
        stone = (1 - ramp(s, STONE_SAT_MAX - 0.08, 0.08)) * ramp(v, 0.18, 0.1) * (alpha > 0.02)
        w = np.maximum(w, stone)
    shirt = None
    reg = m.get('regions', {}).get(kind)
    if reg and skin in LEGENDARY:
        size = (alpha.shape[1], alpha.shape[0])
        reg = scaled_regions(reg, size[0] / (256 if kind == 'icon' else 384))
        shirt = band_weight(h, 195, 285, 15) * ramp(s, 0.10, 0.08) * ramp(v, 0.12, 0.08) * (alpha > 0.02)
        shirt = shirt * poly_mask(size, [reg['shirt']]) * (1 - poly_mask(size, [reg['shirt_exclude']]))
        shirt = shirt * SHIRT_STRENGTH
        w = np.maximum(w, shirt)
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
    L.append("import { CHROMA_IDS, chromaOf, type ChromaId, type SkinId } from '../core/skins/skins';")
    L.append("")
    L.append("export type { SkinId };")
    L.append("")
    L.append("export interface SkinArt {")
    for k in ['playerImage', 'attackImage', 'scoreImage', 'winImage', 'loseImage']:
        L.append("  %s: ImageSourcePropType;" % k)
    L.append("  /** Facing the viewer / walking away; missing = the side view is used when moving down / up. */")
    L.append("  frontImage?: ImageSourcePropType;")
    L.append("  backImage?: ImageSourcePropType;")
    L.append("}")
    L.append("")
    L.append("export const SKIN_IDS: readonly ChromaId[] = CHROMA_IDS;")
    L.append("")
    L.append("/** Representative accent colour per chroma (classic is chosen by the UI per hero; this is a neutral fallback). */")
    L.append("const CHROMA_ACCENT: Record<ChromaId, string> = {")
    for c in SKIN_ORDER:
        L.append("  %s: '%s'," % (c, SKIN_ACCENT[c]))
    L.append("};")
    L.append("/** A look's accent: its chroma's colour (an outfit in its own colour reads as classic). */")
    L.append("export const skinAccent = (skin: SkinId): string => CHROMA_ACCENT[chromaOf(skin)] ?? CHROMA_ACCENT.classic;")
    L.append("")
    L.append("const GENERATED: Partial<Record<SkinId, Record<number, SkinArt>>> = {")
    for outfit in ['classic'] + NEW_OUTFITS:
        for chroma in SKIN_ORDER:
            if outfit == 'classic' and chroma == 'classic':
                continue
            look = look_id(outfit, chroma)
            entries = []
            for hero in range(HERO_COUNT):
                if not outfit_ready(outfit, hero) or chroma == REDUNDANT.get(hero):
                    continue
                if chroma != 'classic' and (outfit, hero) in NO_CHROMAS:
                    continue
                if chroma == 'classic':
                    name = lambda pose, hero=hero: "../assets/sprites/outfits/%s/%s_%s.%s" % (outfit, pose, HERO_FILES[hero], EXT)
                else:
                    name = lambda pose, hero=hero: "../assets/sprites/skins/%s/%d_%s.%s" % (look, hero, pose.lower(), EXT)
                entries.append("    %d: {" % hero)
                for key, pose in [('playerImage', 'Hero'), ('attackImage', 'Attack'), ('scoreImage', 'Icon'), ('winImage', 'Win'), ('loseImage', 'Lose')]:
                    entries.append("      %s: require('%s')," % (key, name(pose)))
                for kind in FACING_KINDS:
                    if has_facing(hero, kind, outfit):
                        entries.append("      %sImage: require('%s')," % (kind, name(kind.capitalize())))
                entries.append("    },")
            if entries:
                L.append("  %s: {" % look)
                L.extend(entries)
                L.append("  },")
    L.append("};")
    L.append("")
    L.append("/** The art of a look (the classic art when a look has none for that hero). */")
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
    L.append("    frontImage: c.frontImage,")
    L.append("    backImage: c.backImage,")
    L.append("  };")
    L.append("};")
    L.append("")
    L.append("/** Whether a look has its own art for a hero (an outfit not painted yet has none). */")
    L.append("export const hasSkinArt = (heroIndex: number, skin: SkinId): boolean => skin === 'classic' || !!GENERATED[skin]?.[heroIndex];")
    with open(TS_OUT, 'w', newline='\n') as f:
        f.write('\n'.join(L) + '\n')


# ---------------------------------------------------------------- contact sheets
def contact_sheets(outdir, results):
    os.makedirs(outdir, exist_ok=True)
    for hero in range(HERO_COUNT):
        skins = skins_for(hero)
        W = 260
        sheet = Image.new('RGBA', (W * len(skins), W * 5), (34, 28, 42, 255))
        for i, skin in enumerate(skins):
            for kind in CONTACT_KINDS:
                im = results[(hero, skin, kind)]
                row = CONTACT_KINDS.index(kind)
                x, y, size = i * W, row * W, (130 if kind == 'icon' else W)
                im = im.resize((size, size), Image.LANCZOS)
                sheet.alpha_composite(im, (x, y))
        sheet.convert('RGB').save(os.path.join(outdir, 'contact_%d_%s.png' % (hero, HERO_NAMES[hero])))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--contact', default=None)
    ap.add_argument('--no-quantize', action='store_true')
    ap.add_argument('--ts-only', action='store_true', help='only rewrite src/data/skinArt.ts')
    ap.add_argument('--outfit', default=None, help='only recolour this outfit (e.g. gala)')
    args = ap.parse_args()
    if args.ts_only:
        write_ts()
        return
    results = {}
    for hero in range(HERO_COUNT):
        for outfit in ['classic'] + NEW_OUTFITS:
            if not outfit_ready(outfit, hero) or (args.outfit and outfit != args.outfit):
                continue
            for kind, prefix in KINDS:
                if kind in FACING_KINDS and not has_facing(hero, kind, outfit):
                    continue
                src = Image.open(os.path.join(outfit_dir(outfit), '%s_%s.webp' % (prefix, HERO_FILES[hero]))).convert('RGBA')
                results[(hero, look_id(outfit, 'classic'), kind)] = src
                for skin in ([] if (outfit, hero) in NO_CHROMAS else skins_for(hero)[1:]):
                    look = look_id(outfit, skin)
                    out = recolor(src, hero, skin, kind, outfit)
                    results[(hero, look, kind)] = out
                    d = os.path.join(OUT_DIR, look)
                    os.makedirs(d, exist_ok=True)
                    out.save(os.path.join(d, '%d_%s.%s' % (hero, kind, EXT)), 'WEBP', quality=88, method=6)
    write_ts()
    total = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(OUT_DIR) for f in fs)
    print('skins written, total %.2f MB' % (total / 1e6))
    if args.contact:
        contact_sheets(args.contact, results)


if __name__ == '__main__':
    sys.exit(main())
