"""
Moves the interface's colours from the bright, cartoon-like Material tones to the muted dark-fantasy palette of the art
(old gold, bronze, crimson, moss, steel blue, parchment). Every bright colour the code used is listed once in PALETTE, so
a shade is tuned here and re-applied, and `--reverse` puts the old colours back. The colours before this pass are in tag
style-v1.

  python scripts/restylePalette.py            # apply
  python scripts/restylePalette.py --reverse  # undo
"""
import glob
import re
import sys

# bright (old) -> muted (new)
PALETTE = {
    # golds and ambers: the accent of the whole interface
    'FFD54F': 'D9B45A', 'FFE082': 'E6CC88', 'FFE7A8': 'EAD8A8', 'FFCA28': 'D6AA48', 'FFEB3B': 'DCC25C',
    'F7D774': 'E0C47A', 'F2C14E': 'D9B052', 'FFCC80': 'E2BE8C', 'FFB74D': 'DCA45A', 'FFAB40': 'D89A4C',
    'FFA726': 'D49242', 'FF9800': 'CC8638', 'FF9A3C': 'D38C46', 'FFE0B2': 'E8D2B2', 'FFE3A0': 'E8D3A2',
    # embers and reds
    'FF7043': 'CC6E44', 'FF8A65': 'D28663', 'FF9A5C': 'D58F62', 'FFAB91': 'DBA48F', 'FF8A80': 'D58A7E',
    'FF6E6E': 'CF6F68', 'FF5252': 'CC5249', 'EF5350': 'C4534A', 'E57373': 'C47268', 'E53935': 'B8423A',
    'FF3B30': 'C2463D', 'FF1744': 'C23A44', 'FFCDD2': 'E3C7C4',
    # greens
    '9EE37D': 'A3BF7C', '81C784': '8EAE7C', 'A5D6A7': 'A5BC9E', '76FF03': '93C450',
    # blues and teals
    '4FC3F7': '7FAFC6', '81D4FA': '8FBCD2', '80D8FF': '8DBDD3', '7FE3FF': '8CC4D6', '90CAF9': '94B3CC',
    'B3E5FC': 'B9D1DC', '4DD0E1': '6CB0B9', '80DEEA': '8FC0C5', '80CBC4': '8EB7B0', '7986CB': '7E87B0',
    # purples and pinks
    'CE93D8': 'B08DBE', 'BA68C8': '9A72AC', 'B39DDB': 'A397BF', 'B388FF': '9E8BCB', 'F48FB1': 'C98FA3',
    'E1BEE7': 'D3C2D8',
}
RGBA = {  # the same shades written as rgba(r, g, b, a)
    (255, 213, 79): (217, 180, 90), (255, 171, 64): (216, 154, 76), (242, 193, 78): (217, 176, 82),
    (255, 82, 82): (204, 82, 73), (158, 227, 125): (163, 191, 124), (255, 23, 68): (194, 58, 68),
    (206, 147, 216): (176, 141, 190), (239, 83, 80): (196, 83, 74), (255, 204, 128): (226, 190, 140),
    (79, 195, 247): (127, 175, 198), (144, 202, 249): (148, 179, 204),
}
# Pure white text becomes parchment (white images tints and overlays stay white).
TEXT_WHITE = ('FFFFFF', 'F3EADB')


def files() -> list[str]:
    fs = glob.glob('src/**/*.ts', recursive=True) + glob.glob('src/**/*.tsx', recursive=True) + ['App.tsx']
    return [f for f in fs if '__tests__' not in f]


def apply(text: str, reverse: bool) -> str:
    hexmap = {(v if reverse else k): (k if reverse else v) for k, v in PALETTE.items()}
    pat = re.compile(r'#(' + '|'.join(hexmap) + r')\b', re.I)
    text = pat.sub(lambda m: '#' + hexmap[m.group(1).upper()], text)
    for old, new in RGBA.items():
        a, b = (new, old) if reverse else (old, new)
        text = re.sub(r'rgba\(\s*%d,\s*%d,\s*%d,' % a, 'rgba(%d, %d, %d,' % b, text)
    w_old, w_new = TEXT_WHITE
    if reverse:
        text = re.sub(r'(\bcolor:\s*["\'])#%s(["\'])' % w_new, r'\g<1>#FFFFFF\2', text, flags=re.I)
    else:
        text = re.sub(r'(\bcolor:\s*["\'])#(?:FFF|FFFFFF)(["\'])', r'\g<1>#%s\2' % w_new, text, flags=re.I)
    return text


def main() -> None:
    reverse = '--reverse' in sys.argv
    changed = 0
    for f in files():
        with open(f, encoding='utf8') as fh:
            s = fh.read()
        t = apply(s, reverse)
        if t != s:
            with open(f, 'w', encoding='utf8', newline='') as fh:
                fh.write(t)
            changed += 1
    print(f'{changed} files {"restored" if reverse else "restyled"}')


if __name__ == '__main__':
    main()
