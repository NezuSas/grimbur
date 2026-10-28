"""
Moves the UI's cold indigo backgrounds and lilac greys to the warm stone and parchment tones of the painted art,
keeping each colour's lightness (so contrast does not change). Colours that mean something (the vortex violet, the
gem cyan, danger red, hero colours) are not touched: only the listed neutrals are.

  python scripts/warmPalette.py          # rewrites src/ in place (git is the undo)
"""
import colorsys
import glob
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Cold neutrals found in the UI: dark indigo panels and lilac-grey text.
NEUTRALS = """
1A1030 8F8AAB B9B4D4 D8D2F0 C9C3E6 C3BEDB 9F9ABB D7D2EE A8A2C4 CFC9E8 0E0B1F A9A3C6 8F8AA8 B8C7E6 2F2458 171030
E6E1FA 4A4560 BDB8D4 CFCBE6 9A95B8 2B2050 D9D3F0 9A9AB0 8F8FA8 A9A3C8 F0ECFF BDB7D8 120C26 9D97BA 2A2440 C4BFDC
06030F D4D0E8 E8E3FA E4DEFA 181031 0F0A22 B8B4D0 EFEAFF 0B0716 E4E0F4 B4AED0 1A1233 3A2E66 291F4D 150F2B 443D70
2C2650 140F2A
""".split()
RGBA = [(6, 4, 16), (20, 15, 40), (18, 14, 38), (43, 32, 80), (30, 20, 60)]

HUE = 30 / 360  # warm umber / parchment


def warm(r: int, g: int, b: int) -> tuple[int, int, int]:
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    # Dark tones become warm stone (a little saturated), light ones parchment (barely tinted).
    sat = 0.30 if l < 0.25 else 0.22 if l < 0.6 else 0.30
    nr, ng, nb = colorsys.hls_to_rgb(HUE, l, min(s, sat) if l > 0.85 else sat)
    return round(nr * 255), round(ng * 255), round(nb * 255)


def main() -> None:
    hex_map = {}
    for h in NEUTRALS:
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        hex_map['#' + h.upper()] = '#%02X%02X%02X' % warm(r, g, b)
    hex_re = re.compile(r'#(' + '|'.join(hex_map_key[1:] for hex_map_key in hex_map) + r')\b', re.IGNORECASE)
    rgba_re = re.compile(r'rgba\(\s*(' + '|'.join(r'%d\s*,\s*%d\s*,\s*%d' % c for c in RGBA) + r')\s*,')
    changed = 0
    for path in glob.glob(os.path.join(ROOT, 'src', '**', '*.ts*'), recursive=True):
        s = open(path, encoding='utf-8', newline='').read()
        t = hex_re.sub(lambda m: hex_map['#' + m.group(1).upper()], s)
        t = rgba_re.sub(lambda m: 'rgba(%d, %d, %d,' % warm(*map(int, re.split(r'\s*,\s*', m.group(1)))), t)
        if t != s:
            open(path, 'w', encoding='utf-8', newline='').write(t)
            changed += 1
    print(f'{changed} files, {len(hex_map)} colours')
    for k, v in list(hex_map.items())[:8]:
        print(k, '->', v)


if __name__ == '__main__':
    main()
