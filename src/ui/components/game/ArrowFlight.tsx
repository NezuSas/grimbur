import React from "react";
import { Animated, View } from "react-native";
import type { ArrowShot } from "../BoardView";

/** The part of `flight` (0..1) at which the arrow reaches its tile; the rest is the impact. */
const LAND_AT = 0.8;
/** How long an arrow flies: farther tiles take longer. */
export const flightMs = (shot: ArrowShot) => 110 + 55 * shot.tiles;
/**
 * When, after the shot, the arrow is seen to land. `flight` runs on an ease-out-quad curve, so it reaches LAND_AT at
 * 1 - sqrt(1 - LAND_AT) of the time (about 55%), well before the whole flight is over.
 */
export const landMs = (shot: ArrowShot) => Math.round(flightMs(shot) * (1 - Math.sqrt(1 - LAND_AT)));

/** Ghost arrows behind the real one: how far back each one runs (in `flight`) and how strongly it shows. */
const GHOSTS = [1, 2, 3, 4].map(k => ({ lag: 0.05 * k, alpha: 0.55 - 0.11 * k, scale: 1 - 0.12 * k }));
/** Sparks thrown off a hit, all around the tile. */
const SPARKS = Array.from({ length: 6 }, (_, i) => ({ angle: (i / 6) * Math.PI * 2 + 0.3, dist: 0.42 + (i % 2) * 0.14 }));
/** Puffs where a missed arrow sticks. */
const PUFFS = [-1, 0, 1];

const VECTORS = { UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 }, LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 } } as const;
const ANGLES = { UP: -90, DOWN: 90, LEFT: 180, RIGHT: 0 } as const;

type Props = {
  shot: ArrowShot;
  /** 0 → 1 over the whole shot (see BoardView): flight up to LAND_AT, impact after it. */
  flight: Animated.Value;
  tileSize: number;
  /** The hero's tile. */
  row: number;
  col: number;
  /** The hero's own arrow colour: the trail and the impact take it. */
  color: string;
};

/**
 * An arrow in flight: it leaves a fading trail in the hero's colour. A hit flashes the tile, rings it and throws
 * sparks; a miss sticks, quivers and kicks up a little dust. All of it rides one native-driven value; nothing when calm
 * (BoardView does not mount it then).
 */
const ArrowFlight = ({ shot, flight, tileSize, row, col, color }: Props) => {
  const vec = VECTORS[shot.dir];
  const angle = ANGLES[shot.dir];
  const reach = shot.tiles * tileSize;
  const head = tileSize * 0.1;
  const shaft = { width: tileSize * 0.4, height: Math.max(2, tileSize * 0.07), borderRadius: 2 };
  const tile = { position: "absolute" as const, width: tileSize, height: tileSize, alignItems: "center" as const, justifyContent: "center" as const, zIndex: 9 };
  const from = { left: col * tileSize, top: row * tileSize };
  const target = { left: (col + vec.x * shot.tiles) * tileSize, top: (row + vec.y * shot.tiles) * tileSize };
  const along = (lag: number) => [
    { translateX: flight.interpolate({ inputRange: [lag, LAND_AT + lag], outputRange: [vec.x * tileSize * 0.35, vec.x * reach], extrapolate: "clamp" }) },
    { translateY: flight.interpolate({ inputRange: [lag, LAND_AT + lag], outputRange: [vec.y * tileSize * 0.35, vec.y * reach], extrapolate: "clamp" }) },
  ];
  // A miss quivers where it sticks; a hit flies straight.
  const rotate = shot.hit
    ? `${angle}deg`
    : flight.interpolate({ inputRange: [0, LAND_AT, 0.85, 0.9, 0.95, 1], outputRange: [angle, angle, angle + 9, angle - 6, angle + 3, angle].map(a => `${a}deg`) });

  return (
    <>
      {GHOSTS.map((g, i) => (
        <Animated.View
          key={`ghost${i}`}
          pointerEvents="none"
          style={{
            ...tile,
            ...from,
            opacity: flight.interpolate({ inputRange: [0, g.lag, LAND_AT, LAND_AT + 0.05], outputRange: [0, g.alpha, g.alpha, 0], extrapolate: "clamp" }),
            transform: [...along(g.lag), { rotate: `${angle}deg` }, { scale: g.scale }],
          }}
        >
          <View style={[shaft, { backgroundColor: color }]} />
        </Animated.View>
      ))}

      <Animated.View
        pointerEvents="none"
        style={{
          ...tile,
          ...from,
          opacity: flight.interpolate({ inputRange: [0, LAND_AT, shot.hit ? 0.95 : 1], outputRange: [1, 1, 0] }),
          transform: [...along(0), { rotate }],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={[shaft, { backgroundColor: "#F5E6B8" }]} />
          <View style={{ width: 0, height: 0, borderTopWidth: head, borderBottomWidth: head, borderLeftWidth: head * 1.8, borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftColor: "#FFD54F" }} />
        </View>
      </Animated.View>

      {shot.hit ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={{ ...tile, ...target, borderRadius: 8, backgroundColor: "#FFFFFF", opacity: flight.interpolate({ inputRange: [0, LAND_AT - 0.02, LAND_AT + 0.02, 0.92], outputRange: [0, 0, 0.6, 0], extrapolate: "clamp" }) }}
          />
          <Animated.View
            pointerEvents="none"
            style={{
              ...tile,
              ...target,
              opacity: flight.interpolate({ inputRange: [0, LAND_AT - 0.02, LAND_AT + 0.06, 1], outputRange: [0, 0, 0.95, 0] }),
              transform: [{ scale: flight.interpolate({ inputRange: [0, LAND_AT - 0.02, 1], outputRange: [0.3, 0.3, 1.5] }) }],
            }}
          >
            <View style={{ width: tileSize * 0.7, height: tileSize * 0.7, borderRadius: tileSize * 0.35, borderWidth: 3, borderColor: color }} />
          </Animated.View>
          {SPARKS.map((s, i) => (
            <Animated.View
              key={`spark${i}`}
              pointerEvents="none"
              style={{
                ...tile,
                ...target,
                opacity: flight.interpolate({ inputRange: [0, LAND_AT - 0.01, LAND_AT + 0.03, 1], outputRange: [0, 0, 1, 0] }),
                transform: [
                  { translateX: flight.interpolate({ inputRange: [0, LAND_AT, 1], outputRange: [0, 0, Math.cos(s.angle) * s.dist * tileSize] }) },
                  { translateY: flight.interpolate({ inputRange: [0, LAND_AT, 1], outputRange: [0, 0, Math.sin(s.angle) * s.dist * tileSize] }) },
                  { rotate: `${(s.angle * 180) / Math.PI}deg` },
                ],
              }}
            >
              <View style={{ width: tileSize * 0.16, height: Math.max(2, tileSize * 0.05), borderRadius: 2, backgroundColor: i % 2 ? color : "#FFF8E1" }} />
            </Animated.View>
          ))}
        </>
      ) : (
        PUFFS.map(p => (
          <Animated.View
            key={`puff${p}`}
            pointerEvents="none"
            style={{
              ...tile,
              ...target,
              opacity: flight.interpolate({ inputRange: [0, LAND_AT, LAND_AT + 0.05, 1], outputRange: [0, 0, 0.7, 0] }),
              transform: [
                // At the arrowhead, spread across the line of flight and drifting back the way it came.
                { translateX: flight.interpolate({ inputRange: [0, LAND_AT, 1], outputRange: [vec.x * tileSize * 0.3, vec.x * tileSize * 0.3, vec.x * tileSize * 0.15 + p * vec.y * tileSize * 0.2] }) },
                { translateY: flight.interpolate({ inputRange: [0, LAND_AT, 1], outputRange: [vec.y * tileSize * 0.3, vec.y * tileSize * 0.3, vec.y * tileSize * 0.15 + p * vec.x * tileSize * 0.2] }) },
                { scale: flight.interpolate({ inputRange: [0, LAND_AT, 1], outputRange: [0.4, 0.4, 1.2] }) },
              ],
            }}
          >
            <View style={{ width: tileSize * 0.18, height: tileSize * 0.18, borderRadius: tileSize * 0.09, backgroundColor: "rgba(200,190,170,0.8)" }} />
          </Animated.View>
        ))
      )}
    </>
  );
};

export default ArrowFlight;
