import React from "react";
import { Animated, View } from "react-native";
import type { ArrowShot } from "../BoardView";
import type { OrbLook } from "../../cosmeticArt";
import { landAt } from "./ArrowFlight";

/** Mira's own colours when no orb style is worn: a pale pink heart in a magenta glow. */
const DEFAULT_LOOK: OrbLook = { core: "#F8C8F0", glow: "#E879C9" };

const VECTORS = { UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 }, LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 } } as const;

/** The soft wake behind the orb: how far back each mote runs (in `flight`), how strongly it shows and how big it is. */
const WAKE = [1, 2, 3, 4, 5].map(k => ({ lag: 0.035 * k, alpha: 0.5 - 0.08 * k, scale: 1 - 0.13 * k }));
/** Motes of light thrown off by the burst. */
const MOTES = Array.from({ length: 8 }, (_, i) => ({ angle: (i / 8) * Math.PI * 2 + 0.2, dist: 0.55 + (i % 3) * 0.18 }));
/** The wobble across the line of flight, sampled along it (it settles to nothing as the orb lands). */
const WOBBLE = [0, 0.7, 1, 0.3, -0.6, -0.9, -0.4, 0.3, 0.5, 0];

type Props = {
  shot: ArrowShot;
  /** 0 → 1 over the whole shot (see BoardView): flight up to landAt, burst after it. */
  flight: Animated.Value;
  tileSize: number;
  /** The hero's tile. */
  row: number;
  col: number;
  /** Board columns (to place the burst's tiles). */
  cols: number;
  /** The equipped orb style (Collection), or null for Mira's own pink. */
  look?: OrbLook | null;
};

/**
 * Mira's orb: a glowing ball that wobbles along the line of flight leaving a soft, fading wake, then bursts where it lands:
 * a flash, two rings spreading over the burst and a brief wash of light over each tile of it (the tiles the rules light
 * up). All of it rides one native-driven value, like the arrow; nothing when calm (BoardView does not mount it then).
 */
const OrbFlight = ({ shot, flight, tileSize, row, col, cols, look }: Props) => {
  const { core, glow } = look ?? DEFAULT_LOOK;
  const L = landAt(shot);
  const vec = VECTORS[shot.dir];
  const reach = shot.tiles * tileSize;
  const landing = shot.landing !== undefined && shot.landing >= 0 ? shot.landing : (row + vec.y * shot.tiles) * cols + col + vec.x * shot.tiles;
  const lr = Math.floor(landing / cols);
  const lc = landing % cols;
  const area = shot.area ?? [];
  const radius = Math.max(1, ...area.map(i => Math.abs(Math.floor(i / cols) - lr) + Math.abs((i % cols) - lc)));
  const tile = { position: "absolute" as const, width: tileSize, height: tileSize, alignItems: "center" as const, justifyContent: "center" as const, zIndex: 9 };
  const from = { left: col * tileSize, top: row * tileSize };
  const at = { left: lc * tileSize, top: lr * tileSize };
  const wobbleIn = WOBBLE.map((_, k) => (k / (WOBBLE.length - 1)) * L);
  const amp = tileSize * 0.12;
  const along = (lag: number) => [
    { translateX: flight.interpolate({ inputRange: [lag, L + lag], outputRange: [vec.x * tileSize * 0.3, vec.x * reach], extrapolate: "clamp" }) },
    { translateY: flight.interpolate({ inputRange: [lag, L + lag], outputRange: [vec.y * tileSize * 0.3, vec.y * reach], extrapolate: "clamp" }) },
    // Across the line: a gentle weave (the orb drifts, it is not shot).
    { translateX: flight.interpolate({ inputRange: wobbleIn.map(v => v + lag), outputRange: WOBBLE.map(w => -vec.y * w * amp), extrapolate: "clamp" }) },
    { translateY: flight.interpolate({ inputRange: wobbleIn.map(v => v + lag), outputRange: WOBBLE.map(w => vec.x * w * amp), extrapolate: "clamp" }) },
  ];
  const orb = tileSize * 0.46;

  return (
    <>
      {WAKE.map((w, i) => (
        <Animated.View
          key={`wake${i}`}
          pointerEvents="none"
          style={{
            ...tile,
            ...from,
            opacity: flight.interpolate({ inputRange: [0, w.lag, L, L + 0.05], outputRange: [0, w.alpha, w.alpha, 0], extrapolate: "clamp" }),
            transform: [...along(w.lag), { scale: w.scale }],
          }}
        >
          <View style={{ width: orb * 0.7, height: orb * 0.7, borderRadius: orb * 0.35, backgroundColor: i % 2 ? core : glow }} />
        </Animated.View>
      ))}

      {/* The orb: a halo, a bright heart and a glint. */}
      <Animated.View
        pointerEvents="none"
        style={{
          ...tile,
          ...from,
          opacity: flight.interpolate({ inputRange: [0, 0.04, L, L + 0.06], outputRange: [0, 1, 1, 0], extrapolate: "clamp" }),
          transform: [...along(0), { scale: flight.interpolate({ inputRange: [0, 0.06, L, L + 0.06], outputRange: [0.5, 1, 1, 1.7], extrapolate: "clamp" }) }],
        }}
      >
        <View style={{ width: orb, height: orb, borderRadius: orb / 2, backgroundColor: glow, opacity: 0.45 }} />
        <View style={{ position: "absolute", width: orb * 0.58, height: orb * 0.58, borderRadius: orb * 0.29, backgroundColor: core, borderWidth: 1.5, borderColor: glow }} />
        <View style={{ position: "absolute", width: orb * 0.16, height: orb * 0.16, borderRadius: orb * 0.08, backgroundColor: "#FFFFFF", transform: [{ translateX: -orb * 0.1 }, { translateY: -orb * 0.1 }] }} />
      </Animated.View>

      {/* The burst: every tile of it takes a brief wash of light, the nearest first. */}
      {area.map(i => {
        const d = Math.abs(Math.floor(i / cols) - lr) + Math.abs((i % cols) - lc);
        const start = L + 0.035 * d;
        return (
          <Animated.View
            key={`wash${i}`}
            pointerEvents="none"
            style={{
              ...tile,
              left: (i % cols) * tileSize,
              top: Math.floor(i / cols) * tileSize,
              zIndex: 8,
              // A soft glow under the painted arcane burst that rises from each tile (TileFx).
              opacity: flight.interpolate({ inputRange: [0, start, start + 0.07, 1], outputRange: [0, 0, 0.4, 0.2], extrapolate: "clamp" }),
            }}
          >
            <View style={{ width: tileSize * 0.8, height: tileSize * 0.8, borderRadius: tileSize * 0.4, backgroundColor: glow, opacity: 0.55 }} />
          </Animated.View>
        );
      })}

      {/* A flash where it lands. */}
      <Animated.View
        pointerEvents="none"
        style={{
          ...tile,
          ...at,
          opacity: flight.interpolate({ inputRange: [0, L - 0.01, L + 0.03, L + 0.2], outputRange: [0, 0, 0.85, 0], extrapolate: "clamp" }),
          transform: [{ scale: flight.interpolate({ inputRange: [0, L, L + 0.2], outputRange: [0.4, 0.4, 1.3], extrapolate: "clamp" }) }],
        }}
      >
        <View style={{ width: tileSize * 0.8, height: tileSize * 0.8, borderRadius: tileSize * 0.4, backgroundColor: core }} />
      </Animated.View>

      {/* Two rings spreading over the whole burst. */}
      {[0, 0.06].map((delay, k) => (
        <Animated.View
          key={`ring${k}`}
          pointerEvents="none"
          style={{
            ...tile,
            ...at,
            zIndex: 10,
            opacity: flight.interpolate({ inputRange: [0, L + delay - 0.01, L + delay + 0.04, 1], outputRange: [0, 0, 0.95, 0], extrapolate: "clamp" }),
            transform: [{ scale: flight.interpolate({ inputRange: [0, L + delay, 1], outputRange: [0.25, 0.25, 2 * radius + 0.6], extrapolate: "clamp" }) }],
          }}
        >
          <View style={{ width: tileSize * 0.9, height: tileSize * 0.9, borderRadius: tileSize * 0.45, borderWidth: k ? 1.5 : 2.5, borderColor: k ? core : glow }} />
        </Animated.View>
      ))}

      {MOTES.map((m, i) => (
        <Animated.View
          key={`mote${i}`}
          pointerEvents="none"
          style={{
            ...tile,
            ...at,
            zIndex: 10,
            opacity: flight.interpolate({ inputRange: [0, L, L + 0.04, 1], outputRange: [0, 0, 1, 0], extrapolate: "clamp" }),
            transform: [
              { translateX: flight.interpolate({ inputRange: [0, L, 1], outputRange: [0, 0, Math.cos(m.angle) * m.dist * radius * tileSize], extrapolate: "clamp" }) },
              { translateY: flight.interpolate({ inputRange: [0, L, 1], outputRange: [0, 0, Math.sin(m.angle) * m.dist * radius * tileSize], extrapolate: "clamp" }) },
            ],
          }}
        >
          <View style={{ width: tileSize * 0.1, height: tileSize * 0.1, borderRadius: tileSize * 0.05, backgroundColor: i % 2 ? core : "#FFFFFF" }} />
        </Animated.View>
      ))}
    </>
  );
};

export default OrbFlight;
