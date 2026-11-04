import React from "react";
import { Animated, View } from "react-native";
import { BOMB_LOOKS, type BombLook } from "../../ui/cosmeticArt";
import { useSettingsStore } from "../../state/settings/store";
import type { CosmeticId } from "../../core/cosmetics/cosmetics";
import { useFlightClock } from "./TrailPreview";

/** One throw, in ms: the arc through the air, then the blast. */
const THROW_MS = 1900;
/** The share of the throw spent in the air; the rest is the blast. */
const LAND = 0.5;
/** Where the bomb is thrown from and where it lands (shares of the preview, from its centre). */
const FROM = -0.6;
const AT = 0.1;
/** The blast covers its tile and the four around it (a plus, as on the board). */
const PLUS = [
  [0, 0],
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;
/** The sparks thrown out by the blast: their angle (degrees) and how far they fly (share of the preview). */
const SPARKS = [
  [-80, 0.34],
  [-35, 0.3],
  [10, 0.36],
  [55, 0.28],
  [100, 0.33],
  [145, 0.3],
  [190, 0.35],
  [235, 0.27],
] as const;

/** The bomb: a dark iron ball with a glint, a short fuse and the burning spark at its tip. */
export const BombBall = ({ look, size, spark = 1 }: { look: BombLook; size: number; spark?: number }) => (
  <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
    {/* The fuse, out of the top right. */}
    <View style={{ position: "absolute", left: size * 0.6, top: size * 0.06, width: size * 0.08, height: size * 0.24, borderRadius: size, backgroundColor: "#8A6B48", transform: [{ rotate: "35deg" }] }} />
    <View style={{ position: "absolute", left: size * 0.62, top: -size * 0.06, width: size * 0.3, height: size * 0.3, borderRadius: size, backgroundColor: look.spark, opacity: 0.3 * spark }} />
    <View style={{ position: "absolute", left: size * 0.7, top: size * 0.02, width: size * 0.14, height: size * 0.14, borderRadius: size, backgroundColor: look.spark, opacity: spark }} />
    <View style={{ position: "absolute", left: size * 0.12, top: size * 0.2, width: size * 0.76, height: size * 0.76, borderRadius: size, backgroundColor: "#2B2522", borderWidth: Math.max(1, size * 0.05), borderColor: "#120E0C" }} />
    {/* A band and a glint, so the ball reads as metal. */}
    <View style={{ position: "absolute", left: size * 0.3, top: size * 0.17, width: size * 0.32, height: size * 0.12, borderRadius: size * 0.04, backgroundColor: "#4A403A", borderWidth: 1, borderColor: "#120E0C" }} />
    <View style={{ position: "absolute", left: size * 0.28, top: size * 0.36, width: size * 0.16, height: size * 0.12, borderRadius: size, backgroundColor: "#FFFFFF", opacity: 0.28 }} />
  </View>
);

type Props = { id: CosmeticId; size: number; small?: boolean };

/**
 * Bram's bomb in a style: it is thrown in an arc, tumbling, its fuse spitting sparks of its colour, and bursts where it
 * lands in a flash and a plus of its blast colour (the tiles a bomb hits on the board), throwing sparks out. Small previews
 * and calm mode show the bomb still beside its blast.
 */
const BombPreview = ({ id, size, small }: Props) => {
  const calm = useSettingsStore(s => s.reduceFlash);
  const look = BOMB_LOOKS[id] ?? BOMB_LOOKS.bomb_ember!;
  const still = calm || !!small;
  const clock = useFlightClock(still, THROW_MS);

  const ball = size * 0.3;
  const tile = size * 0.16;
  const landX = AT * size;
  const landY = size * 0.08;

  const plus = (opacity: number | Animated.AnimatedInterpolation<number>, scale: number | Animated.AnimatedInterpolation<number>) =>
    PLUS.map(([dx, dy], k) => (
      <Animated.View
        key={k}
        pointerEvents="none"
        style={{
          position: "absolute",
          left: size / 2 + landX + dx * tile * 1.1 - tile / 2,
          top: size / 2 + landY + dy * tile * 1.1 - tile / 2,
          width: tile,
          height: tile,
          borderRadius: tile * 0.22,
          backgroundColor: k === 0 ? look.spark : look.blast,
          opacity,
          transform: [{ scale }],
        }}
      />
    ));

  if (still) {
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        {plus(0.4, 1)}
        <View style={{ position: "absolute", left: size / 2 - size * 0.42, top: size / 2 - size * 0.16 - ball / 2 }}>
          <BombBall look={look} size={ball * 0.9} />
        </View>
      </View>
    );
  }

  // The arc: up and over, falling faster as it comes down.
  const arc = Array.from({ length: 9 }, (_, k) => k / 8);
  const x = clock.interpolate({ inputRange: [0, LAND, 1], outputRange: [FROM * size, landX, landX] });
  const y = clock.interpolate({ inputRange: [...arc.map(c => c * LAND), 1], outputRange: [...arc.map(c => landY - (1 - c) * size * 0.1 - Math.sin(c * Math.PI) * size * 0.32), landY] });
  const spin = clock.interpolate({ inputRange: [0, LAND, 1], outputRange: ["-20deg", "340deg", "340deg"] });
  const bombOpacity = clock.interpolate({ inputRange: [0, 0.04, LAND, LAND + 0.02, 1], outputRange: [0, 1, 1, 0, 0] });
  // The fuse flickers while it burns.
  const flicker = clock.interpolate({ inputRange: arc.map(c => c * LAND), outputRange: arc.map((_, k) => (k % 2 ? 0.45 : 1)), extrapolate: "clamp" });
  // The blast: a flash, the plus of tiles, then the sparks.
  const flashScale = clock.interpolate({ inputRange: [0, LAND, LAND + 0.12, 1], outputRange: [0.2, 0.2, 2.4, 2.6] });
  const flashOpacity = clock.interpolate({ inputRange: [0, LAND, LAND + 0.03, LAND + 0.22, 1], outputRange: [0, 0, 0.85, 0, 0] });
  const plusOpacity = clock.interpolate({ inputRange: [0, LAND + 0.02, LAND + 0.1, 0.9, 1], outputRange: [0, 0, 0.75, 0, 0] });
  const plusScale = clock.interpolate({ inputRange: [0, LAND + 0.02, LAND + 0.12, 1], outputRange: [0.3, 0.3, 1.08, 1] });
  const sparkOut = clock.interpolate({ inputRange: [0, LAND, LAND + 0.3, 1], outputRange: [0, 0, 1, 1] });
  const sparkOpacity = clock.interpolate({ inputRange: [0, LAND, LAND + 0.04, LAND + 0.34, 1], outputRange: [0, 0, 1, 0, 0] });
  const dot = Math.max(3, size * 0.045);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: size }}>
      {plus(plusOpacity, plusScale)}
      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", left: size / 2 + landX - tile, top: size / 2 + landY - tile, width: tile * 2, height: tile * 2, borderRadius: tile * 2, backgroundColor: look.blast, opacity: flashOpacity, transform: [{ scale: flashScale }] }}
      />
      {SPARKS.map(([deg, far], k) => {
        const a = (deg * Math.PI) / 180;
        return (
          <Animated.View
            key={k}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: size / 2 + landX - dot / 2,
              top: size / 2 + landY - dot / 2,
              width: dot,
              height: dot,
              borderRadius: dot,
              backgroundColor: k % 2 ? look.spark : look.blast,
              opacity: sparkOpacity,
              transform: [
                { translateX: sparkOut.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * far * size] }) },
                { translateY: sparkOut.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * far * size] }) },
              ],
            }}
          />
        );
      })}
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: size / 2 - ball / 2, top: size / 2 - ball / 2, opacity: bombOpacity, transform: [{ translateX: x }, { translateY: y }, { rotate: spin }] }}>
        <BombBall look={look} size={ball} />
        {/* The burning spark, flickering over the painted one. */}
        <Animated.View style={{ position: "absolute", left: ball * 0.6, top: -ball * 0.08, width: ball * 0.34, height: ball * 0.34, borderRadius: ball, backgroundColor: look.spark, opacity: flicker }} />
      </Animated.View>
    </View>
  );
};

export default BombPreview;
