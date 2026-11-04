/**
 * The tilted board (2.5D): the floor leans back like a table seen from a little above, the back rows a touch smaller, while
 * the heroes, creatures and items stand on it. The board is drawn flat and turned with a perspective transform; these are the
 * same sums, so a touch on the drawn board finds its tile and a popup rises from where a tile is drawn.
 *
 * Coordinates are the board's own (flat) pixels, origin at its top-left corner. The transform turns the board about its
 * centre; the whole picture is then moved up by `shift` so the tilted floor and the table's front edge sit centred in the
 * board's box.
 */

/** How far the floor leans back (the back row about 17% narrower than the front one, as in the approved mock-up). */
export const TILT_DEG = 20;
/** The camera's distance, in board heights: farther is flatter. */
const CAMERA_K = 1.85;
/** The table's front edge under the board, in tiles. */
export const LIP_TILES = 0.12;
/** A block tile's top face, from its top (the rest is the block's front edge): what stands on a tile stands on this face. */
export const BLOCK_FACE = 0.82;

const S = Math.sin((TILT_DEG * Math.PI) / 180);
const C = Math.cos((TILT_DEG * Math.PI) / 180);
/** Half the board's height over the camera distance, times the sine: the same for every board (the camera scales with it). */
const SK = S / (2 * CAMERA_K);
/** What stands on the tilted floor is stretched back up by this much, so the tilt does not flatten it. */
export const STAND = 1 / C;

export interface BoardTilt {
  w: number;
  h: number;
  /** Camera distance (px). */
  p: number;
  /** How far the tilted picture is moved up to sit centred. */
  shift: number;
  /** The table's front edge: where it starts, how wide and how tall. */
  lipTop: number;
  lipWidth: number;
  lipHeight: number;
}

/**
 * How much room a tilted board takes against a flat one of the same tiles: its front row is wider (`width`), and the floor
 * plus the table's edge is a little shorter (`heightPerRow` per row, plus `extraTiles` tiles of edge).
 */
export const TILT_FIT = {
  width: 1 / (1 - SK),
  heightPerRow: (C / 2) * (1 / (1 + SK) + 1 / (1 - SK)),
  extraTiles: LIP_TILES,
};

export function makeTilt(w: number, h: number, tileSize: number): BoardTilt {
  const p = CAMERA_K * h;
  const half = h / 2;
  const top = half - (half * C * p) / (p + half * S);
  const bottom = half + (half * C * p) / (p - half * S);
  const lipHeight = LIP_TILES * tileSize;
  const shift = (top + bottom + lipHeight) / 2 - half;
  return { w, h, p, shift, lipTop: bottom - shift, lipWidth: (w * p) / (p - half * S), lipHeight };
}

/** Where a point of the flat board is drawn. */
export function projectPoint(t: BoardTilt, x: number, y: number): { x: number; y: number } {
  const u = x - t.w / 2;
  const v = y - t.h / 2;
  const k = t.p / (t.p - v * S);
  return { x: t.w / 2 + u * k, y: t.h / 2 + v * C * k - t.shift };
}

/** Which point of the flat board is drawn at (x, y): the inverse of `projectPoint`. */
export function unprojectPoint(t: BoardTilt, x: number, y: number): { x: number; y: number } {
  const yc = y + t.shift - t.h / 2;
  const v = (yc * t.p) / (C * t.p + yc * S);
  const k = t.p / (t.p - v * S);
  return { x: t.w / 2 + (x - t.w / 2) / k, y: t.h / 2 + v };
}

/** The transforms that tilt the board (perspective first, as React Native needs it). */
export function tiltTransforms(t: BoardTilt) {
  // A move at depth 0 right after the perspective is a plain move on the screen.
  return [{ perspective: t.p }, { translateY: -t.shift }, { rotateX: `${TILT_DEG}deg` }];
}
