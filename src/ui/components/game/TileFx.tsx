import React, { memo, useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import SpriteImage from "../SpriteImage";
import type { FxFrames } from "../../weaponFxArt";
import { BLOCK_FACE } from "../../layout/boardTilt";

/** How long the effect stays on the tiles once the shot lands. */
export const TILE_FX_MS = 2000;
/** How long the mark the shot leaves on the tiles lasts (a little longer than the effect, fading out after it). */
export const TILE_MARK_MS = 2600;
/** How fast the painted frames cycle. */
const FRAME_MS = 95;

/** The glowing embers on a scorched tile: where they lie (fractions of its face), their size, and when each dies out (fraction of the mark's life). */
const EMBERS: readonly (readonly [number, number, number, number])[] = [
  [0.3, 0.38, 0.05, 0.55],
  [0.64, 0.3, 0.04, 0.68],
  [0.52, 0.62, 0.06, 0.6],
  [0.26, 0.7, 0.035, 0.48],
  [0.74, 0.66, 0.045, 0.74],
];
/** A tile's own jitter (-0.5..0.5), so the scorches do not all look the same. */
const jitter = (i: number) => ((i * 37) % 11) / 11 - 0.5;
const FILL = { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 } as const;

type Props = {
  tiles: readonly number[];
  cols: number;
  tileSize: number;
  frames: FxFrames;
  /** When the shot lands (ms after mount): the effect starts then. */
  delay: number;
  /** The tile the shot landed on: it starts first, the others a beat later (the fire spreads out from it). */
  center: number;
  /** The board is tilted (2.5D): the effect is stretched back up so it stands on the tile instead of lying flat. */
  stand?: number;
  /**
   * What the shot leaves lying flat on each tile's top face, under the effect: a bomb's SCORCH (the tile darkened, a charred
   * mark and a few embers glowing out) or an orb's faint RUNE glow. None when missing.
   */
  mark?: "scorch" | "rune";
  /** The mark's colour (the style worn): the embers of a scorch, the glow of a rune. */
  tint?: string;
  onDone: () => void;
};

/**
 * A painted effect standing on each tile a shot touched: flames licking up from the tiles of a bomb's blast, an arcane burst
 * rising from the tiles an orb lit. Four frames cycle while it burns; it flares up, holds and dies down. Each tile starts a
 * little after the one the shot landed on, so it spreads out. The look follows the style worn (weaponFxArt).
 */
const TileFx = ({ tiles, cols, tileSize, frames, delay, center, stand = 1, mark, tint, onDone }: Props) => {
  const life = useRef(new Animated.Value(0)).current;
  const cycle = useRef(new Animated.Value(0)).current;
  const burn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loops = Math.ceil(TILE_FX_MS / (FRAME_MS * frames.length));
    const spin = Animated.loop(Animated.timing(cycle, { toValue: frames.length, duration: FRAME_MS * frames.length, easing: Easing.linear, useNativeDriver: true }), { iterations: loops });
    const parts = [Animated.timing(life, { toValue: 1, duration: TILE_FX_MS, easing: Easing.linear, useNativeDriver: true }), spin];
    // The mark outlasts the effect: the whole thing is done (onDone) once it has faded too.
    if (mark) parts.push(Animated.timing(burn, { toValue: 1, duration: TILE_MARK_MS, easing: Easing.linear, useNativeDriver: true }));
    const run = Animated.sequence([Animated.delay(delay), Animated.parallel(parts)]);
    run.start(({ finished }) => finished && onDone());
    return () => run.stop();
  }, []);

  const cr = Math.floor(center / cols);
  const cc = center % cols;
  // The tile's top face: the whole tile on the flat board, the block's top on the tilted one. The mark lies flat on it (the
  // board's own tilt lays it down; no stand stretch).
  const inset = tileSize * 0.04;
  const w = tileSize - inset * 2;
  const h = tileSize * (stand !== 1 ? BLOCK_FACE : 1) - inset * 2;
  const side = Math.min(w, h);
  return (
    <>
      {mark
        ? tiles.map(i => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            const lag = Math.min(0.14, (Math.abs(r - cr) + Math.abs(c - cc)) * 0.055);
            const box = { position: "absolute" as const, left: c * tileSize + inset, top: r * tileSize + inset, width: w, height: h, zIndex: 11, alignItems: "center" as const, justifyContent: "center" as const };
            if (mark === "rune") {
              // A faint glow left where the orb's light touched: a soft wash, a ring and a turned square, fading out.
              const glow = tint ?? "#B48CFF";
              const ring = side * 0.78;
              return (
                <Animated.View
                  key={`m${i}`}
                  pointerEvents="none"
                  style={[box, { borderRadius: tileSize * 0.14, backgroundColor: glow + "1F", opacity: burn.interpolate({ inputRange: [0, lag, lag + 0.12, 0.6, 1], outputRange: [0, 0, 0.75, 0.45, 0], extrapolate: "clamp" }) }]}
                >
                  <View style={{ width: ring, height: ring, borderRadius: ring / 2, borderWidth: Math.max(1, tileSize * 0.025), borderColor: glow + "AA", shadowColor: glow, shadowOpacity: 0.9, shadowRadius: tileSize * 0.12, shadowOffset: { width: 0, height: 0 } }} />
                  <View style={{ position: "absolute", width: ring * 0.52, height: ring * 0.52, borderWidth: Math.max(1, tileSize * 0.015), borderColor: glow + "77", transform: [{ rotate: "45deg" }] }} />
                </Animated.View>
              );
            }
            // A bomb's scorch: the tile darkened, a charred mark burnt into its middle and a few embers glowing out.
            const ember = tint ?? "#FF8A2A";
            const j = jitter(i);
            return (
              <Animated.View
                key={`m${i}`}
                pointerEvents="none"
                style={[box, { borderRadius: tileSize * 0.12, overflow: "hidden", opacity: burn.interpolate({ inputRange: [0, lag, lag + 0.05, 0.7, 1], outputRange: [0, 0, 1, 0.85, 0], extrapolate: "clamp" }) }]}
              >
                <View style={[FILL, { backgroundColor: "rgba(12,7,3,0.42)" }]} />
                {/* Soot streaked across the face, darker toward its corners. */}
                <LinearGradient colors={["rgba(0,0,0,0.32)", "rgba(0,0,0,0)", "rgba(0,0,0,0.36)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={FILL} />
                {/* The charred mark: rings of soot growing darker toward the middle (a radial burn), a little uneven per tile. */}
                {[0.96, 0.74, 0.52, 0.3].map((k, n) => (
                  <View
                    key={n}
                    style={{
                      position: "absolute",
                      width: side * k * (1 + j * 0.16),
                      height: side * k * (0.86 - j * 0.1),
                      borderRadius: side,
                      backgroundColor: ["rgba(26,14,6,0.28)", "rgba(18,9,4,0.38)", "rgba(10,5,2,0.5)", "rgba(4,2,1,0.62)"][n],
                      transform: [{ rotate: `${Math.round(j * 40)}deg` }],
                    }}
                  />
                ))}
                {/* A last hot glow in the middle of the burn, the first thing to go. */}
                <Animated.View
                  style={{
                    position: "absolute",
                    width: side * 0.34,
                    height: side * 0.26,
                    borderRadius: side,
                    backgroundColor: ember + "66",
                    opacity: burn.interpolate({ inputRange: [0, lag, lag + 0.05, 0.4], outputRange: [0, 0, 1, 0], extrapolate: "clamp" }),
                  }}
                />
                {EMBERS.map(([x, y, d, out], n) => {
                  const dot = Math.max(2, side * d);
                  return (
                    <Animated.View
                      key={`e${n}`}
                      style={{
                        position: "absolute",
                        left: w * Math.min(0.9, Math.max(0.08, x + j * 0.12)) - dot / 2,
                        top: h * Math.min(0.9, Math.max(0.08, y - j * 0.1)) - dot / 2,
                        width: dot,
                        height: dot,
                        borderRadius: dot,
                        backgroundColor: "#FFE2A8",
                        borderWidth: dot * 0.22,
                        borderColor: ember,
                        shadowColor: ember,
                        shadowOpacity: 1,
                        shadowRadius: dot * 1.4,
                        shadowOffset: { width: 0, height: 0 },
                        // Each ember flickers, then dies out at its own moment.
                        opacity: burn.interpolate({
                          inputRange: [0, lag, lag + 0.05, lag + 0.2 + n * 0.03, lag + 0.3 + n * 0.03, out, Math.min(1, out + 0.12)],
                          outputRange: [0, 0, 1, 0.55, 1, 0.8, 0],
                          extrapolate: "clamp",
                        }),
                      }}
                    />
                  );
                })}
              </Animated.View>
            );
          })
        : null}
      {tiles.map(i => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        // Tiles farther from where it landed catch a moment later.
        const lag = Math.min(0.18, (Math.abs(r - cr) + Math.abs(c - cc)) * 0.07);
        const opacity = life.interpolate({ inputRange: [0, lag, lag + 0.1, 0.72, 1], outputRange: [0, 0, 1, 0.9, 0], extrapolate: "clamp" });
        const grow = life.interpolate({ inputRange: [0, lag, lag + 0.14, 0.8, 1], outputRange: [0.3, 0.3, 1.08, 1, 0.7], extrapolate: "clamp" });
        const size = tileSize * 1.05;
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: c * tileSize + (tileSize - size) / 2,
              // Stands on the lower part of its tile, rising up over it.
              top: r * tileSize + tileSize * 0.86 - size,
              width: size,
              height: size,
              zIndex: 12,
              opacity,
              transform: [{ translateY: size / 2 }, { scaleY: stand }, { scale: grow }, { translateY: -size / 2 }],
            }}
          >
            {frames.map((frame, k) => (
              <Animated.View
                key={k}
                style={{
                  position: "absolute",
                  width: size,
                  height: size,
                  // Step through the frames: each shows for its quarter of the cycle.
                  opacity: cycle.interpolate({
                    inputRange: [k - 0.01, k, k + 0.99, k + 1],
                    outputRange: [0, 1, 1, 0],
                    extrapolate: "clamp",
                  }),
                }}
              >
                <SpriteImage source={frame} style={{ width: size, height: size }} resizeMode="contain" />
              </Animated.View>
            ))}
            {/* The last frame also covers the loop's wrap (cycle back at 0 shows frame 0). */}
            <View />
          </Animated.View>
        );
      })}
    </>
  );
};

export default memo(TileFx);
