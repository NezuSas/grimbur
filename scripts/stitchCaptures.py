"""
Rebuilds a generated sheet from browser captures of its quadrants. Each capture shows one quadrant plus a margin
of `overlap` sheet pixels on every inner side, drawn top-left on a white canvas and enlarged to fit the viewport;
only the quadrant's interior is kept, so the edge blending of each capture never leaves a seam.
Used to bring ChatGPT image generations onto disk.

  python scripts/stitchCaptures.py <out.png> <sheetW>x<sheetH> <cols>x<rows> <viewW>x<viewH> <overlap> <cap1.jpg> ...
  (captures row by row; the page drew region (x0-m, y0-m) .. (x1+m, y1+m) clipped to the sheet)
"""
import sys

from PIL import Image


def region(q0: int, q1: int, size: int, m: int) -> tuple[int, int]:
    return max(0, q0 - m), min(size, q1 + m)


def main(out: str, sheet: str, grid: str, view: str, overlap: str, caps: list[str]) -> None:
    sw, sh = map(int, sheet.split('x'))
    cols, rows = map(int, grid.split('x'))
    vw, vh = map(int, view.split('x'))
    m = int(overlap)
    assert len(caps) == cols * rows, f'{len(caps)} captures for a {cols}x{rows} grid'
    qw, qh = sw // cols, sh // rows
    canvas = Image.new('RGB', (sw, sh), (255, 255, 255))
    for i, path in enumerate(caps):
        cx, cy = i % cols, i // cols
        x0, x1 = region(cx * qw, (cx + 1) * qw, sw, m)
        y0, y1 = region(cy * qh, (cy + 1) * qh, sh, m)
        s = min(vw / (x1 - x0), vh / (y1 - y0))
        cap = Image.open(path).convert('RGB')
        box = (round((cx * qw - x0) * s), round((cy * qh - y0) * s), round(((cx + 1) * qw - x0) * s), round(((cy + 1) * qh - y0) * s))
        canvas.paste(cap.crop(box).resize((qw, qh), Image.LANCZOS), (cx * qw, cy * qh))
    canvas.save(out)
    print(out, canvas.size)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6:])
