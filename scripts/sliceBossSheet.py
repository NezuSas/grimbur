"""Cuts the AI-generated Grimbur sheet (4 poses on white) into the four boss frames the game animates.

Unlike processSprites.py, every frame shares ONE scale and a common bottom baseline, so swapping
frames never makes the monster jump or change size.

Usage: python scripts/sliceBossSheet.py <sheet.png>
Writes src/assets/sprites/enemies/Grimbur_Boss[_Breathe|_Attack|_Hurt].png (512px each).
"""
import os
import sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'assets', 'sprites', 'enemies')
NAMES = ['Grimbur_Boss.png', 'Grimbur_Boss_Breathe.png', 'Grimbur_Boss_Attack.png', 'Grimbur_Boss_Hurt.png']
SIZE = 512
PADDING = 0.06
WHITE_DIST = 60  # how far from pure white still counts as background


def white_background_to_alpha(im: Image.Image) -> Image.Image:
    """Only background connected to the image border becomes transparent: ivory fangs and claws survive."""
    rgb = np.asarray(im.convert('RGB'), dtype=np.int16)
    near_white = ((255 - rgb).max(axis=2) <= WHITE_DIST)
    bg = np.zeros_like(near_white)
    bg[0, :] = near_white[0, :]
    bg[-1, :] = near_white[-1, :]
    bg[:, 0] = near_white[:, 0]
    bg[:, -1] = near_white[:, -1]
    while True:  # grow the border-connected white region until it stops growing
        grown = bg.copy()
        grown[1:, :] |= bg[:-1, :]
        grown[:-1, :] |= bg[1:, :]
        grown[:, 1:] |= bg[:, :-1]
        grown[:, :-1] |= bg[:, 1:]
        grown &= near_white
        if (grown == bg).all():
            break
        bg = grown
    out = np.dstack([np.asarray(im.convert('RGB'), dtype=np.uint8), np.where(bg, 0, 255).astype(np.uint8)])
    return Image.fromarray(out, 'RGBA')


def split_poses(alpha: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Connected components of the alpha mask: poses whose raised claws overlap in columns still separate.
    Returns the 4 largest blobs' boxes (x0, y0, x1, y1), left to right."""
    mask = alpha > 24
    labels = np.zeros(mask.shape, dtype=np.int32)
    boxes = []
    ys, xs = np.nonzero(mask)
    order = np.argsort(xs, kind='stable')  # scan roughly left to right
    nxt = 1
    for i in order:
        y, x = int(ys[i]), int(xs[i])
        if labels[y, x]:
            continue
        stack = [(y, x)]
        labels[y, x] = nxt
        x0 = x1 = x
        y0 = y1 = y
        n = 0
        while stack:
            cy, cx = stack.pop()
            n += 1
            x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                ny, nx_ = cy + dy, cx + dx
                if 0 <= ny < mask.shape[0] and 0 <= nx_ < mask.shape[1] and mask[ny, nx_] and not labels[ny, nx_]:
                    labels[ny, nx_] = nxt
                    stack.append((ny, nx_))
        boxes.append((n, (x0, y0, x1 + 1, y1 + 1), nxt))
        nxt += 1
    boxes = [(b, lab) for _, b, lab in sorted(boxes, reverse=True)[:4]]  # the 4 big blobs; specks drop out
    return labels, sorted(boxes, key=lambda b: b[0][0])


def main(sheet_path: str) -> None:
    im = white_background_to_alpha(Image.open(sheet_path))
    alpha = np.asarray(im.getchannel('A'))
    labels, boxes = split_poses(alpha)
    while len(boxes) < 4:
        # Two poses touching (fur tip to fur tip) come out as one wide blob: cut it at its thinnest column.
        (x0, y0, x1, y1), lab = max(boxes, key=lambda b: b[0][2] - b[0][0])
        boxes.remove(((x0, y0, x1, y1), lab))
        fill = (labels[y0:y1, x0:x1] == lab).sum(axis=0)
        lo, hi = int(len(fill) * 0.3), int(len(fill) * 0.7)
        cut = x0 + lo + int(np.argmin(fill[lo:hi]))
        boxes += [((x0, y0, cut, y1), lab), ((cut, y0, x1, y1), lab)]
        boxes.sort(key=lambda b: b[0][0])
    assert len(boxes) == 4, f'expected 4 poses, found {len(boxes)}: {boxes}'
    frames = []
    for (x0, y0, x1, y1), lab in boxes:
        f = im.crop((x0, y0, x1, y1))
        keep = (labels[y0:y1, x0:x1] == lab)  # a neighbor's claw inside this box is erased
        arr = np.array(f)
        arr[..., 3] = np.where(keep, arr[..., 3], 0)
        f = Image.fromarray(arr, 'RGBA')
        frames.append(f.crop(f.getchannel('A').getbbox()))  # tight box per pose
    inner = int(SIZE * (1 - 2 * PADDING))
    scale = inner / max(max(f.size) for f in frames)  # ONE scale for the whole set
    for name, f in zip(NAMES, frames):
        f = f.resize((max(1, round(f.width * scale)), max(1, round(f.height * scale))), Image.LANCZOS)
        canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        bottom = SIZE - int(SIZE * PADDING)  # feet share one baseline across frames
        canvas.paste(f, ((SIZE - f.width) // 2, bottom - f.height), f)
        path = os.path.join(OUT, name)
        canvas.save(path, optimize=True)
        print(f'{name}: {f.width}x{f.height} on {SIZE}px, {os.path.getsize(path) // 1024} KB')


if __name__ == '__main__':
    main(sys.argv[1])
