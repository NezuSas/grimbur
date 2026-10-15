import React, { memo, useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { Direction } from "../../core/engine/types";
import { floatingDirection } from "../../core/input/floatingPad";
import type { JoystickSkin } from "../../state/settings/types";

type Side = { dir: Direction; icon: keyof typeof Ionicons.glyphMap; dx: number; dy: number };
const SIDES: Side[] = [
  { dir: "UP", icon: "caret-up", dx: 0, dy: -1 },
  { dir: "DOWN", icon: "caret-down", dx: 0, dy: 1 },
  { dir: "LEFT", icon: "caret-back", dx: -1, dy: 0 },
  { dir: "RIGHT", icon: "caret-forward", dx: 1, dy: 0 },
];

/** Light colour of each style: the blue of a console pad's light, the yellow of an arcade cabinet's marquee. */
export const SKIN_LIGHT: Record<JoystickSkin, string> = { console: "#4DA3FF", arcade: "#FFD54F" };

type Props = {
  skin: JoystickSkin;
  /** Radius of the whole base, in dp. The component is a square of 2 x radius. */
  radius: number;
  /** Where the thumb is from the centre (dp); it is limited to the radius. */
  thumb: { x: number; y: number };
  /** The side being pushed, if any. */
  active: Direction | null;
};

const limit = (x: number, y: number, max: number) => {
  const len = Math.hypot(x, y);
  const k = len > max ? max / len : 1;
  return { x: x * k, y: y * k };
};

/** The little ticks at the four sides: they light up in the style's colour when that side is pushed. */
const Marks = ({ radius, active, color, offset }: { radius: number; active: Direction | null; color: string; offset: number }) => {
  const size = radius * 0.3;
  return (
    <>
      {SIDES.map(s => {
        const on = active === s.dir;
        return (
          <View
            key={s.dir}
            pointerEvents="none"
            style={{ position: "absolute", left: radius + s.dx * radius * offset - size, top: radius + s.dy * radius * offset - size, width: size * 2, height: size * 2, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name={s.icon} size={size * (on ? 1.25 : 0.95)} color={on ? color : "rgba(255,255,255,0.42)"} />
          </View>
        );
      })}
    </>
  );
};

/** A console pad: a dark recessed well and a domed thumbstick with grip dots, lit blue while it is pushed. */
const ConsoleStick = ({ radius: R, thumb, active }: Omit<Props, "skin">) => {
  const light = SKIN_LIGHT.console;
  const S = R * 0.92; // stick diameter
  const p = limit(thumb.x, thumb.y, R * 0.42);
  const dots = useMemo(() => Array.from({ length: 18 }, (_, i) => (i / 18) * Math.PI * 2), []);
  return (
    <View style={{ width: R * 2, height: R * 2 }}>
      {/* The well */}
      <LinearGradient colors={["#07080d", "#1b1e2b"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[styles.fill, { borderRadius: R, borderWidth: 3, borderColor: "rgba(255,255,255,0.16)" }]} />
      <View style={[styles.center, { width: R * 1.56, height: R * 1.56, borderRadius: R, left: R * 0.22, top: R * 0.22, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.08)" }]} />
      <View style={[styles.center, { width: R * 1.24, height: R * 1.24, borderRadius: R, left: R * 0.38, top: R * 0.38, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }]} />
      <Marks radius={R} active={active} color={light} offset={0.74} />

      {/* The stick: shadow, dome, concave top, grip dots and a soft highlight */}
      <View style={{ position: "absolute", left: R - S / 2 + p.x, top: R - S / 2 + p.y, width: S, height: S }}>
        <View style={{ position: "absolute", left: S * 0.04, top: S * 0.1, width: S, height: S, borderRadius: S / 2, backgroundColor: "rgba(0,0,0,0.45)" }} />
        <LinearGradient colors={["#6a6f82", "#2a2d38", "#15171f"]} start={{ x: 0.25, y: 0.1 }} end={{ x: 0.75, y: 1 }} style={[styles.fill, { borderRadius: S / 2, borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" }]} />
        {dots.map((a, i) => (
          <View
            key={i}
            style={{ position: "absolute", width: S * 0.05, height: S * 0.05, borderRadius: S, backgroundColor: "rgba(255,255,255,0.3)", left: S / 2 + Math.cos(a) * S * 0.41 - S * 0.025, top: S / 2 + Math.sin(a) * S * 0.41 - S * 0.025 }}
          />
        ))}
        <LinearGradient colors={["#171922", "#3b3f4e"]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={{ position: "absolute", left: S * 0.17, top: S * 0.17, width: S * 0.66, height: S * 0.66, borderRadius: S, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }} />
        <View style={{ position: "absolute", left: S * 0.2, top: S * 0.1, width: S * 0.34, height: S * 0.16, borderRadius: S, backgroundColor: "rgba(255,255,255,0.16)", transform: [{ rotate: "-28deg" }] }} />
      </View>
    </View>
  );
};

/** An arcade cabinet stick: a metal plate with screws and a cross gate, a steel shaft and a glossy red ball. */
const ArcadeStick = ({ radius: R, thumb, active }: Omit<Props, "skin">) => {
  const light = SKIN_LIGHT.arcade;
  const B = R * 0.74; // ball diameter
  const p = limit(thumb.x, thumb.y, R * 0.5);
  const len = Math.hypot(p.x, p.y);
  const angle = Math.atan2(p.y, p.x);
  const shaft = R * 0.17;
  const screw = R * 0.13;
  const lift = 1 + (len / (R * 0.5)) * 0.1; // the ball comes a little closer to the viewer when it leans
  const corners = [
    [R * 0.2, R * 0.2],
    [R * 1.8, R * 0.2],
    [R * 0.2, R * 1.8],
    [R * 1.8, R * 1.8],
  ];
  return (
    <View style={{ width: R * 2, height: R * 2 }}>
      {/* The plate */}
      <LinearGradient colors={["#34343f", "#14141a"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.fill, { borderRadius: R * 0.3, borderWidth: 3, borderColor: "#585868" }]} />
      {corners.map(([x, y], i) => (
        <View key={i} style={{ position: "absolute", left: x - screw, top: y - screw, width: screw * 2, height: screw * 2, borderRadius: screw, backgroundColor: "#a8a8b6", borderWidth: 1, borderColor: "#5b5b69", alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: screw * 1.3, height: Math.max(1.5, screw * 0.2), backgroundColor: "#55555f", transform: [{ rotate: `${i * 40 + 20}deg` }] }} />
        </View>
      ))}
      {/* The cross-shaped gate that limits the stick to four ways */}
      <View style={{ position: "absolute", left: R * 0.3, top: R - R * 0.05, width: R * 1.4, height: R * 0.1, borderRadius: R, backgroundColor: "rgba(0,0,0,0.55)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" }} />
      <View style={{ position: "absolute", top: R * 0.3, left: R - R * 0.05, height: R * 1.4, width: R * 0.1, borderRadius: R, backgroundColor: "rgba(0,0,0,0.55)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" }} />
      <Marks radius={R} active={active} color={light} offset={0.78} />

      {/* The rubber boot at the foot of the shaft */}
      <LinearGradient colors={["#2a2a33", "#0d0d11"]} style={{ position: "absolute", left: R - R * 0.27, top: R - R * 0.27, width: R * 0.54, height: R * 0.54, borderRadius: R, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)" }} />

      {/* The shaft runs from the boot to the ball */}
      {len > 1 && (
        <LinearGradient
          colors={["#f1f1f8", "#8b8b99", "#d9d9e4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: "absolute", width: len, height: shaft, borderRadius: shaft / 2, left: R + p.x / 2 - len / 2, top: R + p.y / 2 - shaft / 2, transform: [{ rotate: `${angle}rad` }] }}
        />
      )}

      {/* The ball: a drop shadow, the red sphere and its highlight */}
      <View style={{ position: "absolute", left: R + p.x - (B * lift) / 2 + B * 0.1, top: R + p.y - (B * lift) / 2 + B * 0.16, width: B * lift, height: B * lift, borderRadius: B, backgroundColor: "rgba(0,0,0,0.4)" }} />
      <View style={{ position: "absolute", left: R + p.x - (B * lift) / 2, top: R + p.y - (B * lift) / 2, width: B * lift, height: B * lift }}>
        <LinearGradient
          colors={["#ff8a80", "#e53935", "#7f0000"]}
          start={{ x: 0.3, y: 0.15 }}
          end={{ x: 0.8, y: 0.95 }}
          style={[styles.fill, { borderRadius: B, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.25)" }]}
        />
        <View style={{ position: "absolute", left: B * lift * 0.2, top: B * lift * 0.12, width: B * lift * 0.34, height: B * lift * 0.2, borderRadius: B, backgroundColor: "rgba(255,255,255,0.7)", transform: [{ rotate: "-28deg" }] }} />
      </View>
    </View>
  );
};

/** A joystick in the chosen style, drawn at `radius` and following `thumb`. */
const JoystickBase = memo(({ skin, radius, thumb, active }: Props) =>
  skin === "arcade" ? <ArcadeStick radius={radius} thumb={thumb} active={active} /> : <ConsoleStick radius={radius} thumb={thumb} active={active} />,
);
export default JoystickBase;

/**
 * A place to try the style: the stick follows the finger. Used in Settings so the choice can be felt before playing.
 */
export const JoystickPreview = memo(({ skin, radius = 54 }: { skin: JoystickSkin; radius?: number }) => {
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState<Direction | null>(null);
  const prev = useRef<Direction | null>(null);
  const R = radius;
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          prev.current = null;
          setThumb({ x: 0, y: 0 });
        },
        onPanResponderMove: (_e, g) => {
          setThumb({ x: g.dx, y: g.dy });
          prev.current = floatingDirection(g.dx, g.dy, R, prev.current);
          setActive(prev.current);
        },
        onPanResponderRelease: () => {
          prev.current = null;
          setThumb({ x: 0, y: 0 });
          setActive(null);
        },
        onPanResponderTerminate: () => {
          prev.current = null;
          setThumb({ x: 0, y: 0 });
          setActive(null);
        },
      }),
    [R],
  );
  return (
    <View {...responder.panHandlers} style={{ width: R * 2, height: R * 2 }} accessible={false} importantForAccessibility="no">
      <JoystickBase skin={skin} radius={R} thumb={thumb} active={active} />
    </View>
  );
});

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill },
  center: { position: "absolute" },
});
