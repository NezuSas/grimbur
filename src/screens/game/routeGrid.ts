/** What one action of the run left in the shared route: a new tile, a gem picked or an arrow shot. */
export type RouteMark = "tile" | "gem" | "arrow";

export const ROUTE_TILE = "🟫";
export const ROUTE_GEM = "💎";
export const ROUTE_ARROW = "🏹";
export const ROUTE_DEATH = "💀";
export const ROUTE_CROWN = "👑";

/** Squares per floor in the shared text: one line each, short enough for a chat bubble. */
export const ROUTE_ROW_MAX = 10;

const EMOJI: Record<RouteMark, string> = { tile: ROUTE_TILE, gem: ROUTE_GEM, arrow: ROUTE_ARROW };

/** Keeps `keep` of `total` items spread evenly (first and last included when keep >= 2). */
function spread(total: number, keep: number): Set<number> {
  const kept = new Set<number>();
  if (keep <= 0) return kept;
  if (keep >= total) {
    for (let i = 0; i < total; i++) kept.add(i);
    return kept;
  }
  if (keep === 1) return kept.add(0);
  for (let k = 0; k < keep; k++) kept.add(Math.round((k * (total - 1)) / (keep - 1)));
  return kept;
}

/**
 * One floor in at most `max` squares, in the order it was played. Gems and arrows are kept before plain tiles; when
 * the floor is longer, the tiles in between are thinned evenly (and the gems and arrows too, if even they overflow).
 */
export function compressRow(marks: readonly RouteMark[], max = ROUTE_ROW_MAX): RouteMark[] {
  if (marks.length <= max) return [...marks];
  const special = marks.map((m, i) => (m === "tile" ? -1 : i)).filter(i => i >= 0);
  const tiles = marks.map((m, i) => (m === "tile" ? i : -1)).filter(i => i >= 0);
  const keepSpecial = spread(special.length, Math.min(max, special.length));
  const keepTiles = spread(tiles.length, max - keepSpecial.size);
  const kept = new Set<number>([...special.filter((_, k) => keepSpecial.has(k)), ...tiles.filter((_, k) => keepTiles.has(k))]);
  return marks.filter((_, i) => kept.has(i));
}

/**
 * The route of a daily run, one line per floor played, with no board positions in it (nothing to spoil). A defeat
 * ends the last line in a skull, a victory in a crown; both take one of the line's squares. Floors with no recorded
 * action (a run resumed from a save) are left out, except the last one, where the run ended; a route with no action
 * at all gives an empty string.
 */
export function buildRouteGrid(floors: readonly (readonly RouteMark[])[], outcome: "victory" | "defeat"): string {
  if (!floors.some(f => f.length > 0)) return "";
  const rows = floors.filter((f, i) => f.length > 0 || i === floors.length - 1);
  const end = outcome === "victory" ? ROUTE_CROWN : ROUTE_DEATH;
  return rows
    .map((row, i) => {
      const last = i === rows.length - 1;
      const squares = compressRow(row, last ? ROUTE_ROW_MAX - 1 : ROUTE_ROW_MAX).map(m => EMOJI[m]);
      return last ? squares.join("") + end : squares.join("");
    })
    .join("\n");
}
