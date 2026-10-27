import { useCallback, useEffect, useRef } from "react";
import type { GameState } from "../../core/engine/types";
import type { RouteMark } from "./routeGrid";

type Entry = { mark: RouteMark; turn: number };
/** What each floor of the run left, by floor number. */
export type RouteLog = Record<number, Entry[]>;

type Seen = Pick<GameState, "level" | "turn" | "playerIndex" | "visited" | "totalCoins" | "attack" | "vortexCost">;

/**
 * The route after one more state of the run, read from what changed: a step onto a tile never seen is a tile, a gem
 * more is a gem, an arrow less without moving is a shot (a vortex that eats an arrow moves the hero). An undo or a
 * revive takes the floor back to an earlier turn, so what was recorded after it goes; a new run (back to a lower
 * floor) starts an empty route.
 */
export function trackRoute(log: RouteLog, prev: Seen, next: Seen): RouteLog {
  if (next.level < prev.level) return {};
  if (next.level !== prev.level) return log;
  let floor = log[next.level] ?? [];
  if (next.turn < prev.turn) floor = floor.filter(e => e.turn <= next.turn);
  else {
    const gems = next.totalCoins - prev.totalCoins;
    const moved = next.playerIndex !== prev.playerIndex;
    const added: Entry[] = [];
    for (let i = 0; i < gems; i++) added.push({ mark: "gem", turn: next.turn });
    if (gems <= 0 && moved && !prev.visited.includes(next.playerIndex)) added.push({ mark: "tile", turn: next.turn });
    if (!moved && next.attack < prev.attack && next.turn > prev.turn && next.vortexCost !== "arrow") added.push({ mark: "arrow", turn: next.turn });
    if (added.length === 0) return log;
    floor = [...floor, ...added];
  }
  return floor === log[next.level] ? log : { ...log, [next.level]: floor };
}

/** The floors of a route in order, as the marks the shared text draws. */
export function routeFloors(log: RouteLog, lastFloor: number): RouteMark[][] {
  const floors: RouteMark[][] = [];
  for (let level = 1; level <= lastFloor; level++) floors.push((log[level] ?? []).map(e => e.mark));
  return floors;
}

/** Records the route of the run being played (in memory: a run resumed from a save starts from the floor it resumes on). */
export function useRouteLog(state: GameState) {
  const log = useRef<RouteLog>({});
  const prev = useRef<Seen>(state);
  useEffect(() => {
    log.current = trackRoute(log.current, prev.current, state);
    prev.current = state;
  }, [state]);
  return useCallback(() => routeFloors(log.current, prev.current.level), []);
}
