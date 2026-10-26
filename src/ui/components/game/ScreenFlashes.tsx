import React from "react";
import { Animated, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  /** White flash on a kill or a hit on the Grimbur. */
  combat: Animated.Value;
  /** Red edges when the hero dies (0..0.34). */
  death: Animated.Value;
  /** Short red flash when a shield (or feather) soaks a deadly touch. */
  hit: Animated.Value;
  /** Purple flash on a vortex teleport. */
  vortex: Animated.Value;
  /** Reduced flashes: the white one is much dimmer. */
  calm: boolean;
};

const RED = "rgba(255,23,68,0.72)";
const RED_CLEAR = "rgba(255,23,68,0)";

/**
 * The full-screen flashes of the game screen. None of them takes a touch, and each one sits at its own depth so that the
 * death vignette and the shield flash stay under the overlays while the combat flash is above everything.
 */
const ScreenFlashes: React.FC<Props> = ({ combat, death, hit, vortex, calm }) => (
  <>
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: "#FFF", opacity: Animated.multiply(combat, calm ? 0.25 : 1), zIndex: 999 }]}
      pointerEvents="none"
    />

    {/* The death blow: red closes in from the edges of the screen (like damage in a console game) and leaves the middle,
        where the killer is, clean. A full-screen red wash hid the very thing the player needs to see. */}
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: death.interpolate({ inputRange: [0, 0.34], outputRange: [0, 1], extrapolate: "clamp" }), zIndex: 997 }]}
      pointerEvents="none"
    >
      <LinearGradient colors={[RED, RED_CLEAR]} style={{ position: "absolute", left: 0, right: 0, top: 0, height: "15%" }} />
      <LinearGradient colors={[RED_CLEAR, RED]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "15%" }} />
      <LinearGradient colors={[RED, RED_CLEAR]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "11%" }} />
      <LinearGradient colors={[RED_CLEAR, RED]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "11%" }} />
    </Animated.View>

    {/* A shield (or feather) soaked a deadly touch: a short red flash */}
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,23,68,1)", opacity: hit, zIndex: 996 }]} pointerEvents="none" />

    {/* Purple flash on vortex teleport */}
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(156,39,176,0.55)", opacity: vortex, zIndex: 998 }]} pointerEvents="none" />
  </>
);

export default ScreenFlashes;
