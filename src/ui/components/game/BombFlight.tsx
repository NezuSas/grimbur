import React from "react";
import { Animated, View } from "react-native";
import type { ArrowShot } from "../BoardView";
import type { BombLook } from "../../cosmeticArt";
import { AMMO_ART } from "../../weaponArt";
import SpriteImage from "../SpriteImage";
import { landAt } from "./ArrowFlight";

/** Bram's own colours when no bomb style is worn: an amber fuse and an orange-red blast. */
const DEFAULT_LOOK: BombLook = { spark: "#FFB347", blast: "#FF5A36" };

const VECTORS = { UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 }, LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 } } as const;

/** The lob, sampled along the throw (0..1 of it): how high the bomb is, as a part of the arc's height. */
const ARC = Array.from({ length: 11 }, (_, k) => k / 10);
/** The fuse flickers: its brightness at even steps of the throw. */
const FLICKER = [1, 0.35, 0.9, 0.5, 1, 0.3, 0.85, 0.45, 1, 0.4, 0.95, 0.6, 1];
/** Sparks thrown off by the blast. */
const SPARKS = Array.from({ length: 10 }, (_, i) => ({ angle: (i / 10) * Math.PI * 2 + 0.15, dist: 0.8 + (i % 3) * 0.3 }));
/** Smoke left over the blast, drifting up. */
const SMOKE = [-0.25, 0, 0.25];

type Props = {
  shot: ArrowShot;
  /** 0 → 1 over the whole shot (see BoardView, a steady pace for the bomb): the throw up to landAt, the blast after it. */
  flight: Animated.Value;
  tileSize: number;
  /** The hero's tile. */
  row: number;
  col: number;
  /** Board columns (to place the blast's tiles). */
  cols: number;
  /** The equipped bomb style (Collection), or null for Bram's own fire. */
  look?: BombLook | null;
};

/**
 * Bram's bomb: lobbed in an arc, spinning, its fuse flickering, with its shadow sliding on the floor below; it goes off where
 * it lands: a flash, a fireball, every tile of the blast (the tiles the rules hit) flaring, sparks flying out and smoke. The
 * board's jolt is BoardView's (it shakes the whole board). One native-driven value, like the arrow; nothing when calm.
 */
const BombFlight = ({ shot, flight, tileSize, row, col, cols, look }: Props) => {
  const { spark, blast } = look ?? DEFAULT_LOOK;
  const L = landAt(shot);
  const vec = VECTORS[shot.dir];
  const reach = shot.tiles * tileSize;
  const landing = shot.landing !== undefined && shot.landing >= 0 ? shot.landing : (row + vec.y * shot.tiles) * cols + col + vec.x * shot.tiles;
  const lr = Math.floor(landing / cols);
  const lc = landing % cols;
  const area = shot.area ?? [];
  const tile = { position: "absolute" as const, width: tileSize, height: tileSize, alignItems: "center" as const, justifyContent: "center" as const, zIndex: 9 };
  const from = { left: col * tileSize, top: row * tileSize };
  const at = { left: lc * tileSize, top: lr * tileSize };
  const height = tileSize * (0.45 + 0.15 * shot.tiles);
  const throwIn = ARC.map(p => p * L);
  const along = [
    { translateX: flight.interpolate({ inputRange: [0, L], outputRange: [vec.x * tileSize * 0.25, vec.x * reach], extrapolate: "clamp" }) },
    { translateY: flight.interpolate({ inputRange: [0, L], outputRange: [vec.y * tileSize * 0.25, vec.y * reach], extrapolate: "clamp" }) },
  ];
  const lift = flight.interpolate({ inputRange: throwIn, outputRange: ARC.map(p => -height * 4 * p * (1 - p)), extrapolate: "clamp" });
  const spin = (vec.x || 1) * 720;
  const size = tileSize * 0.5;
  const gone = flight.interpolate({ inputRange: [0, L, L + 0.02], outputRange: [1, 1, 0], extrapolate: "clamp" });

  return (
    <>
      {/* Its shadow on the floor: smaller while the bomb is high. */}
      <Animated.View
        pointerEvents="none"
        style={{
          ...tile,
          ...from,
          zIndex: 8,
          opacity: gone,
          transform: [...along, { translateY: tileSize * 0.22 }, { scale: flight.interpolate({ inputRange: throwIn, outputRange: ARC.map(p => 1 - 0.55 * 4 * p * (1 - p)), extrapolate: "clamp" }) }],
        }}
      >
        <View style={{ width: size * 0.9, height: size * 0.36, borderRadius: size * 0.2, backgroundColor: "rgba(0,0,0,0.4)" }} />
      </Animated.View>

      {/* The bomb, lobbed and spinning, its fuse flickering. */}
      <Animated.View
        pointerEvents="none"
        style={{
          ...tile,
          ...from,
          zIndex: 11,
          opacity: gone,
          transform: [...along, { translateY: lift }, { rotate: flight.interpolate({ inputRange: [0, L], outputRange: ["0deg", `${spin}deg`], extrapolate: "clamp" }) }],
        }}
      >
        <SpriteImage source={AMMO_ART.bomb} style={{ width: size, height: size }} resizeMode="contain" />
        <Animated.View
          style={{
            position: "absolute",
            top: tileSize * 0.22,
            right: tileSize * 0.24,
            width: tileSize * 0.13,
            height: tileSize * 0.13,
            borderRadius: tileSize * 0.065,
            backgroundColor: spark,
            borderWidth: 1.5,
            borderColor: "#FFF8E1",
            opacity: flight.interpolate({ inputRange: FLICKER.map((_, k) => (k / (FLICKER.length - 1)) * L), outputRange: FLICKER, extrapolate: "clamp" }),
            transform: [{ scale: flight.interpolate({ inputRange: FLICKER.map((_, k) => (k / (FLICKER.length - 1)) * L), outputRange: FLICKER.map(f => 0.7 + 0.5 * f), extrapolate: "clamp" }) }],
          }}
        />
      </Animated.View>

      {/* Every tile of the blast flares, then smoulders out. */}
      {area.map(i => (
        <Animated.View
          key={`blast${i}`}
          pointerEvents="none"
          style={{
            ...tile,
            left: (i % cols) * tileSize,
            top: Math.floor(i / cols) * tileSize,
            zIndex: 8,
            // A soft glow of heat under the painted flames that rise from each tile (TileFx), not a flat coloured square.
            opacity: flight.interpolate({ inputRange: [0, L, L + 0.04, 1], outputRange: [0, 0, 0.45, 0.25], extrapolate: "clamp" }),
          }}
        >
          <View style={{ width: tileSize * 0.8, height: tileSize * 0.8, borderRadius: tileSize * 0.4, backgroundColor: blast, opacity: 0.55 }} />
        </Animated.View>
      ))}

      {/* The flash and the fireball where it lands. */}
      <Animated.View
        pointerEvents="none"
        style={{
          ...tile,
          ...at,
          zIndex: 12,
          opacity: flight.interpolate({ inputRange: [0, L - 0.005, L + 0.02, L + 0.12], outputRange: [0, 0, 0.95, 0], extrapolate: "clamp" }),
          transform: [{ scale: flight.interpolate({ inputRange: [0, L, L + 0.12], outputRange: [0.4, 0.4, 2.2], extrapolate: "clamp" }) }],
        }}
      >
        <View style={{ width: tileSize, height: tileSize, borderRadius: tileSize / 2, backgroundColor: "#FFFDF2" }} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{
          ...tile,
          ...at,
          zIndex: 11,
          opacity: flight.interpolate({ inputRange: [0, L, L + 0.04, 1], outputRange: [0, 0, 0.9, 0], extrapolate: "clamp" }),
          transform: [{ scale: flight.interpolate({ inputRange: [0, L, 1], outputRange: [0.3, 0.3, 2.4], extrapolate: "clamp" }) }],
        }}
      >
        <View style={{ width: tileSize * 0.9, height: tileSize * 0.9, borderRadius: tileSize * 0.45, backgroundColor: blast, borderWidth: 3, borderColor: spark }} />
      </Animated.View>

      {SPARKS.map((s, i) => (
        <Animated.View
          key={`spark${i}`}
          pointerEvents="none"
          style={{
            ...tile,
            ...at,
            zIndex: 12,
            opacity: flight.interpolate({ inputRange: [0, L, L + 0.03, 1], outputRange: [0, 0, 1, 0], extrapolate: "clamp" }),
            transform: [
              { translateX: flight.interpolate({ inputRange: [0, L, 1], outputRange: [0, 0, Math.cos(s.angle) * s.dist * tileSize], extrapolate: "clamp" }) },
              { translateY: flight.interpolate({ inputRange: [0, L, 1], outputRange: [0, 0, Math.sin(s.angle) * s.dist * tileSize], extrapolate: "clamp" }) },
              { rotate: `${(s.angle * 180) / Math.PI}deg` },
            ],
          }}
        >
          <View style={{ width: tileSize * 0.2, height: Math.max(2, tileSize * 0.055), borderRadius: 2, backgroundColor: i % 2 ? spark : "#FFF8E1" }} />
        </Animated.View>
      ))}

      {SMOKE.map((x, i) => (
        <Animated.View
          key={`smoke${i}`}
          pointerEvents="none"
          style={{
            ...tile,
            ...at,
            zIndex: 11,
            opacity: flight.interpolate({ inputRange: [0, L + 0.1, L + 0.2, 1], outputRange: [0, 0, 0.55, 0], extrapolate: "clamp" }),
            transform: [
              { translateX: x * tileSize },
              { translateY: flight.interpolate({ inputRange: [0, L + 0.1, 1], outputRange: [0, 0, -tileSize * (0.45 + 0.1 * i)], extrapolate: "clamp" }) },
              { scale: flight.interpolate({ inputRange: [0, L + 0.1, 1], outputRange: [0.5, 0.5, 1.4], extrapolate: "clamp" }) },
            ],
          }}
        >
          <View style={{ width: tileSize * 0.4, height: tileSize * 0.4, borderRadius: tileSize * 0.2, backgroundColor: "rgba(70,62,58,0.85)" }} />
        </Animated.View>
      ))}
    </>
  );
};

export default BombFlight;
