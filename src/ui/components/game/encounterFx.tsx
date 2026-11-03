import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

/**
 * The little light show of the encounter cards (the gambler's die, every scene's exchange): rays, sparks, a shockwave and a
 * rune circle. Each piece is centred on its parent's middle, plays from its own clock with the native driver, and draws
 * nothing to touch.
 */

type Centered = { size: number; color: string };

const center = (w: number, h = w) => ({ position: "absolute" as const, left: "50%" as const, top: "50%" as const, width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2 });

/** Light rays fanning out of the centre, turning slowly while they flare and fade (`play` starts them). */
export const RayBurst = ({ size, color, play, rays = 12, duration = 1400 }: Centered & { play: boolean; rays?: number; duration?: number }) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!play) return;
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [play]);
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "50deg"] });
  const opacity = t.interpolate({ inputRange: [0, 0.15, 0.6, 1], outputRange: [0, 0.9, 0.5, 0] });
  const scale = t.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.3, 1, 1.15] });
  const ray = { w: Math.max(3, size * 0.05), h: size * 0.5 };
  return (
    <Animated.View pointerEvents="none" style={[center(size), { opacity, transform: [{ rotate }, { scale }] }]}>
      {Array.from({ length: rays }, (_, i) => (
        <View key={i} style={[center(size), { transform: [{ rotate: `${(360 / rays) * i}deg` }] }]}>
          <View style={{ position: "absolute", left: size / 2 - ray.w / 2, top: 0, width: ray.w, height: ray.h, borderRadius: ray.w, backgroundColor: color, opacity: i % 2 ? 0.55 : 0.9 }} />
        </View>
      ))}
    </Animated.View>
  );
};

/** Sparks thrown out of the centre in every direction, falling a little as they fade. */
export const SparkBurst = ({ size, color, play, count = 14, duration = 900 }: Centered & { play: boolean; count?: number; duration?: number }) => {
  const t = useRef(new Animated.Value(0)).current;
  // Each spark's own heading, reach and size, fixed for the burst.
  const sparks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const reach = size * (0.32 + Math.random() * 0.25);
        return { dx: Math.cos(a) * reach, dy: Math.sin(a) * reach, r: Math.max(2.5, size * (0.035 + Math.random() * 0.03)) };
      }),
    [count, size],
  );
  useEffect(() => {
    if (!play) return;
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [play]);
  const opacity = t.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 0.8, 0] });
  return (
    <View pointerEvents="none" style={center(size)}>
      {sparks.map((s, i) => (
        <Animated.View
          key={i}
          style={[
            center(s.r * 2),
            {
              borderRadius: s.r,
              backgroundColor: i % 3 === 0 ? "#F3EADB" : color,
              opacity,
              transform: [
                { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, s.dx] }) },
                { translateY: t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, s.dy, s.dy + size * 0.06] }) },
                { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1.2, 0.4] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

/** A ring of light that swells out of the centre and thins away. */
export const Shockwave = ({ size, color, play, duration = 650 }: Centered & { play: boolean; duration?: number }) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!play) return;
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [play]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        center(size * 0.5),
        {
          borderRadius: size,
          borderWidth: Math.max(2, size * 0.035),
          borderColor: color,
          opacity: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.95, 0] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.1] }) }],
        },
      ]}
    />
  );
};

/** A soft glow that breathes behind the centre (`strength` 0..1 drives how bright). */
export const Glow = ({ size, color, strength }: Centered & { strength: Animated.Value | Animated.AnimatedInterpolation<number> }) => (
  <Animated.View pointerEvents="none" style={[center(size), { borderRadius: size, backgroundColor: color, opacity: strength }]} />
);

/** A circle of rune dots turning around the centre, faster while `active`; it fades out when `active` turns off. */
export const RuneCircle = ({ size, color, active }: Centered & { active: boolean }) => {
  const spin = useRef(new Animated.Value(0)).current;
  const show = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      Animated.timing(show, { toValue: 0, duration: 220, useNativeDriver: true }).start();
      return;
    }
    Animated.timing(show, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    spin.setValue(0);
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [active]);
  const dots = 10;
  const r = size / 2;
  const dot = Math.max(3, size * 0.06);
  return (
    <Animated.View
      pointerEvents="none"
      style={[center(size), { opacity: show, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }]}
    >
      <View style={[StyleSheet.absoluteFill, { borderRadius: r, borderWidth: 1.5, borderColor: color + "88" }]} />
      {Array.from({ length: dots }, (_, i) => {
        const a = (Math.PI * 2 * i) / dots;
        const big = i % 2 === 0;
        const d = big ? dot * 1.4 : dot;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: r + Math.cos(a) * r - d / 2,
              top: r + Math.sin(a) * r - d / 2,
              width: d,
              height: big ? d * 1.6 : d,
              borderRadius: d / 2,
              backgroundColor: big ? color : "#F3EADB",
              transform: [{ rotate: `${(a * 180) / Math.PI + 90}deg` }],
            }}
          />
        );
      })}
    </Animated.View>
  );
};
