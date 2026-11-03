import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import SpriteImage from "../../ui/components/SpriteImage";
import { TRAIL_LOOKS } from "../../ui/cosmeticArt";
import { useSettingsStore } from "../../state/settings/store";
import type { CosmeticId } from "../../core/cosmetics/cosmetics";

/** The shape of a wake particle: a round ember, a diamond (crystal, spark), a thin streak, or a four-point star. */
type Shape = "dot" | "diamond" | "streak" | "star";

/** How a trail's wake behaves: what its particles look like and where they go over their short life. */
type Wake = {
  shape: Shape;
  count: number;
  /** Fraction of the flight a particle lives. */
  life: number;
  /** Particle size, as a share of the preview. */
  size: [number, number];
  /** Where a particle drifts over its life (shares of the preview): a straight drift, plus a jitter for each one. */
  drift: (r: () => number) => { dx: number; dy: number };
  /** The particle swells (smoke) or shrinks (embers) as it fades. */
  grow: [number, number];
  /** Turns over its life (crystals). */
  spin?: number;
  /** Swirls around where it was born instead of drifting (the void). */
  orbit?: boolean;
  opacity: number;
  /** The wake's two lights: brighter than the trail's interface colours, as light on a dark cave should be. */
  glow: [string, string];
};

const WAKES: Record<string, Wake> = {
  trail_fire: { shape: "dot", count: 18, life: 0.32, size: [0.035, 0.07], drift: r => ({ dx: -0.04 - r() * 0.05, dy: -0.12 - r() * 0.14 }), grow: [1.1, 0.2], opacity: 0.95, glow: ["#FF8C2A", "#FFD27A"] },
  trail_frost: { shape: "diamond", count: 14, life: 0.42, size: [0.03, 0.055], drift: r => ({ dx: -0.03 - r() * 0.04, dy: 0.05 + r() * 0.1 }), grow: [1, 0.5], spin: 220, opacity: 0.95, glow: ["#9FE3FF", "#FFFFFF"] },
  trail_storm: { shape: "streak", count: 14, life: 0.18, size: [0.05, 0.09], drift: r => ({ dx: (r() - 0.5) * 0.12, dy: (r() - 0.5) * 0.22 }), grow: [1, 0.4], spin: 0, opacity: 1, glow: ["#FFF2A0", "#CFE8FF"] },
  trail_shadow: { shape: "dot", count: 12, life: 0.45, size: [0.07, 0.12], drift: r => ({ dx: -0.05 - r() * 0.05, dy: -0.03 - r() * 0.06 }), grow: [0.5, 1.8], opacity: 0.5, glow: ["#8A6BC4", "#4A2E78"] },
  trail_stars: { shape: "star", count: 12, life: 0.4, size: [0.05, 0.09], drift: r => ({ dx: -0.01 - r() * 0.03, dy: (r() - 0.5) * 0.08 }), grow: [0.2, 1.1], spin: 90, opacity: 1, glow: ["#FFE38A", "#FFFFFF"] },
  trail_venom: { shape: "dot", count: 14, life: 0.4, size: [0.03, 0.06], drift: r => ({ dx: -0.03 - r() * 0.03, dy: 0.12 + r() * 0.16 }), grow: [1, 0.6], opacity: 0.9, glow: ["#9BE36A", "#3FAF4A"] },
  trail_void: { shape: "dot", count: 14, life: 0.4, size: [0.03, 0.06], drift: r => ({ dx: 0.05 + r() * 0.06, dy: 0 }), grow: [1.2, 0.2], orbit: true, opacity: 0.9, glow: ["#7FD6E0", "#7A5CE0"] },
  trail_royal: { shape: "diamond", count: 14, life: 0.36, size: [0.03, 0.06], drift: r => ({ dx: -0.04 - r() * 0.04, dy: -0.06 - r() * 0.08 }), grow: [1, 0.3], spin: 180, opacity: 1, glow: ["#F2CF6A", "#C08CE0"] },
};

/** A seeded random, so a trail's wake is the same every time it is shown. */
const seeded = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

const hash = (text: string) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

/** The ribbon behind the arrow: bands further back are thinner and fainter. */
const RIBBON = [
  { at: 0, len: 0.5, h: 0.46, o: 0.2, core: false },
  { at: 0.3, len: 0.45, h: 0.3, o: 0.12, core: false },
  { at: 0, len: 0.42, h: 0.1, o: 0.75, core: true },
  { at: 0.3, len: 0.4, h: 0.06, o: 0.45, core: true },
  { at: 0.6, len: 0.35, h: 0.04, o: 0.22, core: true },
];

/** One flight across the preview, in ms. */
const FLIGHT_MS = 1500;
/** Where the arrow flies, as shares of the preview: in from beyond the left edge, out beyond the right one. */
const FROM = -0.75;
const TO = 0.75;

/**
 * A particle's whole life as a function of the flight clock (0..1, looping), sampled so `interpolate` can play it: born at
 * the arrow's tail at `born`, it drifts and fades over `life`, then waits unseen for the next pass.
 */
function particleTrack(born: number, life: number, f: (age: number) => number, idle: number) {
  const input: number[] = [];
  const output: number[] = [];
  const steps = 8;
  const push = (c: number, v: number) => {
    if (input.length && c <= input[input.length - 1]) c = input[input.length - 1] + 1e-4;
    input.push(c);
    output.push(v);
  };
  // A life that runs past the end of the flight carries on at its start (the loop).
  const wraps = born + life > 1;
  if (wraps) {
    const carried = born + life - 1;
    for (let k = 0; k <= steps; k++) {
      const c = (carried * k) / steps;
      push(c, f((1 - born + c) / life));
    }
    push(carried + 1e-4, idle);
  } else {
    push(0, idle);
  }
  push(Math.max(born - 1e-4, input[input.length - 1] + 1e-4), idle);
  const end = wraps ? 1 : born + life;
  for (let k = 0; k <= steps; k++) {
    const c = born + ((end - born) * k) / steps;
    push(c, f((c - born) / life));
  }
  if (!wraps) {
    push(end + 1e-4, idle);
    push(1, idle);
  }
  return { inputRange: input, outputRange: output };
}

/** A particle with a soft halo of its own light around it. */
const Particle = ({ shape, size, color }: { shape: Shape; size: number; color: string }) => (
  <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
    <View style={{ position: "absolute", width: size * 2.2, height: size * 2.2, borderRadius: size * 2, backgroundColor: color, opacity: 0.22 }} />
    <Core shape={shape} size={size} color={color} />
  </View>
);

/** A four-point star (two thin bars crossed) or another particle shape. */
const Core = ({ shape, size, color }: { shape: Shape; size: number; color: string }) => {
  if (shape === "star") {
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", width: size, height: size * 0.22, borderRadius: size, backgroundColor: color }} />
        <View style={{ position: "absolute", width: size * 0.22, height: size, borderRadius: size, backgroundColor: color }} />
        <View style={{ width: size * 0.4, height: size * 0.4, borderRadius: size, backgroundColor: "#FFFFFF" }} />
      </View>
    );
  }
  if (shape === "diamond") return <View style={{ width: size * 0.75, height: size * 0.75, backgroundColor: color, transform: [{ rotate: "45deg" }] }} />;
  if (shape === "streak") return <View style={{ width: size * 1.6, height: Math.max(1.5, size * 0.22), borderRadius: size, backgroundColor: color }} />;
  return <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color }} />;
};

type Props = { id: CosmeticId; size: number; small?: boolean };

/**
 * A trail in flight: the arrow crosses the preview with a light swing and a glow, shedding its own wake from the tail
 * (embers rise from fire, crystals fall from frost, sparks crackle around the storm, smoke swells behind the shadow...).
 * Small previews (grid cards) and calm mode show the wake still, frozen mid-flight.
 */
const TrailPreview = ({ id, size, small }: Props) => {
  const calm = useSettingsStore(s => s.reduceFlash);
  const look = TRAIL_LOOKS[id]!;
  const wake = WAKES[id] ?? WAKES.trail_fire;
  const still = calm || !!small;
  const clock = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (still) return;
    // Each flight starts the next one when it lands (a looped timing stalled at its end on the web).
    let alive = true;
    const fly = () => {
      clock.setValue(0);
      Animated.timing(clock, { toValue: 1, duration: FLIGHT_MS, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
        if (alive && finished) fly();
      });
    };
    fly();
    return () => {
      alive = false;
      clock.stopAnimation();
    };
  }, [still, clock]);

  const arrowW = size * 0.95;
  const arrowH = arrowW / 3;
  // The tail of the arrow, where the wake is born, relative to the arrow's centre.
  const tail = -arrowW * 0.42;
  const xAt = (c: number) => (FROM + (TO - FROM) * c) * size;
  const swing = (c: number) => Math.sin(c * Math.PI * 2) * size * 0.04;

  const particles = useMemo(() => {
    const r = seeded(hash(id));
    const count = Math.round(wake.count * 1.7);
    return Array.from({ length: count }, (_, i) => {
      const born = (i + r() * 0.6) / count;
      const d = wake.drift(r);
      const s = size * 1.3 * (wake.size[0] + r() * (wake.size[1] - wake.size[0]));
      const color = i % 4 === 3 ? "#FFF6E6" : wake.glow[i % 2];
      const x0 = xAt(born) + tail;
      const y0 = swing(born) + (r() - 0.5) * size * 0.08;
      const phase = r() * Math.PI * 2;
      return { born, d, s, color, x0, y0, phase };
    });
    // The wake is fixed for a trail and a size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, size]);

  const arrowX = clock.interpolate({ inputRange: [0, 1], outputRange: [xAt(0), xAt(1)] });
  const swingSamples = Array.from({ length: 9 }, (_, k) => k / 8);
  const arrowY = clock.interpolate({ inputRange: swingSamples, outputRange: swingSamples.map(swing) });
  const arrowTilt = clock.interpolate({ inputRange: swingSamples, outputRange: swingSamples.map(c => `${Math.cos(c * Math.PI * 2) * -6}deg`) });

  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, !small && { overflow: "hidden", borderRadius: size }]}>
      {particles.map((p, i) => {
        const at = (age: number) => {
          if (wake.orbit) {
            const a = p.phase + age * Math.PI * 2.5;
            const rad = size * 0.08 * (1 - age);
            return { x: p.x0 + Math.cos(a) * rad + p.d.dx * size * age, y: p.y0 + Math.sin(a) * rad };
          }
          // Embers and drips move faster at first; a fall speeds up.
          const ease = p.d.dy > 0.1 ? age * age : 1 - (1 - age) * (1 - age);
          return { x: p.x0 + p.d.dx * size * age, y: p.y0 + p.d.dy * size * ease };
        };
        const life = Math.min(0.6, wake.life * 1.3);
        if (still) {
          // Frozen mid-flight: the particles born in the last stretch before the arrow's middle position, at their age then.
          const age = (0.5 - p.born + 1) % 1;
          if (age > life) return null;
          const t = age / life;
          const pos = at(t);
          const scale = wake.grow[0] + (wake.grow[1] - wake.grow[0]) * t;
          return (
            <View key={i} pointerEvents="none" style={{ position: "absolute", left: size / 2 + pos.x - p.s / 2, top: size / 2 + pos.y - p.s / 2, opacity: wake.opacity * (1 - t * 0.8), transform: [{ scale }] }}>
              <Particle shape={wake.shape} size={p.s} color={p.color} />
            </View>
          );
        }
        const track = (f: (t: number) => number, idle: number) => clock.interpolate(particleTrack(p.born, life, f, idle));
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: size / 2 - p.s / 2,
              top: size / 2 - p.s / 2,
              opacity: track(t => wake.opacity * (t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88), 0),
              transform: [
                { translateX: track(t => at(t).x, p.x0) },
                { translateY: track(t => at(t).y, p.y0) },
                { scale: track(t => wake.grow[0] + (wake.grow[1] - wake.grow[0]) * t, 0.01) },
                ...(wake.spin ? [{ rotate: track(t => t * (wake.spin ?? 0), 0).interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] }) }] : []),
              ],
            }}
          >
            <Particle shape={wake.shape} size={p.s} color={p.color} />
          </Animated.View>
        );
      })}

      {/* The arrow, with a glow of its own colour around it. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: size / 2 - arrowW / 2,
          top: size / 2 - arrowH / 2,
          width: arrowW,
          height: arrowH,
          alignItems: "center",
          justifyContent: "center",
          transform: still ? [] : [{ translateX: arrowX }, { translateY: arrowY }, { rotate: arrowTilt }],
        }}
      >
        {/* A ribbon of light streaming from the tail, thinning and fading behind the arrow. */}
        {RIBBON.map((b, k) => (
          <View
            key={k}
            style={{
              position: "absolute",
              right: arrowW * (0.62 + b.at),
              width: arrowW * b.len,
              height: arrowH * b.h,
              borderRadius: arrowW,
              backgroundColor: b.core ? wake.glow[1] : wake.glow[0],
              opacity: b.o,
            }}
          />
        ))}
        <SpriteImage source={look.arrow} style={{ width: arrowW, height: arrowH }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Animated.View>
    </View>
  );
};

export default TrailPreview;
