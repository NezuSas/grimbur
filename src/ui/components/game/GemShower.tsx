import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";
import SpriteImage from "../SpriteImage";
import { DEFAULT_CELEBRATION, type CelebrationLook } from "../../cosmeticArt";

type Props = {
  count?: number;
  /** The celebration worn (Collection); the gems and arrows of old when none. */
  look?: CelebrationLook;
  /** The box it plays in (the whole window when left out). */
  width?: number;
  height?: number;
  /** Plays again and again (the Collection preview) instead of once (a victory). */
  loop?: boolean;
};

/**
 * The victory celebration: the game's own art raining, rising, bursting or flying over the cave, each piece on its own
 * timing. Native-driven, then it stays out of the way.
 */
const GemShower: React.FC<Props> = ({ count = 26, look = DEFAULT_CELEBRATION, width: boxW, height: boxH, loop }) => {
  const win = useWindowDimensions();
  const width = boxW ?? win.width;
  const height = boxH ?? win.height;
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const golden = (i * 0.6180339 + 0.07) % 1;
        const [min, max] = look.size;
        return {
          x: golden * (width - 30),
          size: min + ((i % 4) / 3) * (max - min),
          delay: (i * 83) % 1400,
          duration: look.motion === "burst" ? 1500 + ((i * 397) % 900) : 2300 + ((i * 397) % 1900),
          sway: (((i * 31) % 13) - 6) * 12,
          spin: look.spin ? 1 + (i % 3) : 0,
          angle: (i / count) * Math.PI * 2 + (i % 3) * 0.3,
          reach: 0.25 + ((i * 7) % 10) / 22,
          sprite: look.sprites[i % look.sprites.length],
        };
      }),
    [count, width, look],
  );
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {items.map((p, i) => (
        <Piece key={i} p={p} width={width} height={height} motion={look.motion} loop={!!loop} />
      ))}
    </View>
  );
};

type Item = { x: number; size: number; delay: number; duration: number; sway: number; spin: number; angle: number; reach: number; sprite: CelebrationLook["sprites"][number] };

const Piece = ({ p, width, height, motion, loop }: { p: Item; width: number; height: number; motion: CelebrationLook["motion"]; loop: boolean }) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const once = Animated.timing(t, { toValue: 1, duration: p.duration, delay: p.delay, easing: motion === "burst" ? Easing.out(Easing.quad) : Easing.in(Easing.quad), useNativeDriver: true });
    const run = loop ? Animated.loop(Animated.sequence([once, Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true })])) : once;
    run.start();
    return () => run.stop();
  }, [t, p.duration, p.delay, motion, loop]);

  const fade = t.interpolate({ inputRange: [0, 0.06, 0.8, 1], outputRange: [0, 1, 1, 0] });
  const turn = t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.spin * 220}deg`] });
  let place: { left: number; top: number };
  let transform: Record<string, Animated.AnimatedInterpolation<number> | Animated.AnimatedInterpolation<string> | string>[];
  let w = p.size;
  let h = p.size;
  if (motion === "rise") {
    place = { left: p.x, top: height + 10 };
    transform = [
      { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -(height + 60)] }) },
      { translateX: t.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0, p.sway, -p.sway, p.sway * 0.5] }) },
      { rotate: turn },
      { scale: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 1.15, 0.6] }) },
    ];
  } else if (motion === "burst") {
    // Out of the middle, then gravity takes over.
    const r = Math.min(width, height) * p.reach * 1.4;
    const dx = Math.cos(p.angle) * r;
    const dy = Math.sin(p.angle) * r * 0.8;
    const fall = height * 0.35;
    place = { left: width / 2 - p.size / 2, top: height * 0.42 - p.size / 2 };
    transform = [
      { translateX: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, dx * 0.8, dx] }) },
      { translateY: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, dy * 0.8 + fall * 0.15, dy + fall] }) },
      { rotate: turn },
      { scale: t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.3, 1.25, 0.8] }) },
    ];
  } else if (motion === "volley") {
    // Arrows loosed from the floor, flying up and across.
    w = p.size * 2.4;
    h = p.size * 0.8;
    const drift = (p.sway / 72) * width * 0.25;
    place = { left: p.x - w / 2, top: height + 10 };
    const deg = Math.round((Math.atan2(-(height + 80), drift) * 180) / Math.PI);
    transform = [
      { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, drift] }) },
      { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -(height + 80)] }) },
      { rotate: `${deg}deg` },
    ];
  } else {
    place = { left: p.x, top: -40 };
    transform = [
      { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, height + 60] }) },
      { translateX: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, p.sway, -p.sway * 0.6] }) },
      { rotate: turn },
      // A gem "twinkles": it swells and shrinks as it turns.
      { scale: t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 1.25, 0.9, 1.2, 1] }) },
    ];
  }
  return (
    <Animated.View style={{ position: "absolute", ...place, opacity: fade, transform }}>
      <SpriteImage source={p.sprite} style={{ width: w, height: h }} resizeMode="contain" />
    </Animated.View>
  );
};

export default GemShower;
