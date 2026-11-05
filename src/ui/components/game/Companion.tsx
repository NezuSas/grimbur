import React, { memo, useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import SpriteImage from "../SpriteImage";

/** The two frames of a companion (cut from one sheet so they share scale): swapped on a beat, they flap, swish or glow. */
export type CompanionLook = readonly [ImageSourcePropType, ImageSourcePropType];

const FLAP_MS = 320;

/**
 * A companion floating by the hero: it bobs gently and swaps its two frames. Purely a look: it never reacts to the board, so it
 * can never give a danger away. Calm (reduced motion): it hovers still on its first frame.
 */
const OUTLINE: readonly (readonly [number, number])[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const RIM: readonly (readonly [number, number])[] = [[-1, 0], [1, 0], [0, -1], [0, 1], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]];

const Companion = ({ look, size, calm = false, mirror = false, aura = null }: { look: CompanionLook; size: number; calm?: boolean; mirror?: boolean; aura?: string | null }) => {
  const line = Math.max(1, size * 0.03);
  const bob = useRef(new Animated.Value(0)).current;
  const [second, setSecond] = useState(false);

  useEffect(() => {
    if (calm) {
      bob.setValue(0);
      setSecond(false);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    const id = setInterval(() => setSecond(s => !s), FLAP_MS);
    return () => {
      loop.stop();
      clearInterval(id);
    };
  }, [calm, bob]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        width: size,
        height: size,
        transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.14] }) }, { scaleX: mirror ? -1 : 1 }],
      }}
    >
      {/* A grown companion glows with its colour (a soft halo that breathes with the bob). */}
      {aura ? (
        <Animated.View
          style={{
            position: "absolute",
            left: size * 0.12,
            top: size * 0.12,
            width: size * 0.76,
            height: size * 0.76,
            borderRadius: size,
            backgroundColor: aura,
            opacity: calm ? 0.22 : bob.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.32] }),
            transform: [{ scale: calm ? 1.1 : bob.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) }],
          }}
        />
      ) : null}
      {/* Both frames stay mounted and swap by opacity: changing the image source would flash. */}
      {/* Each frame with a thin dark outline (its silhouette a hair to every side) inside a soft warm rim, so it reads on the dark stone. */}
      {[look[0], look[1]].map((frame, f) => (
        <View key={f} pointerEvents="none" style={{ position: "absolute", width: size, height: size, opacity: (f === 1) === second ? 1 : 0 }}>
          {RIM.map(([dx, dy], k) => (
            <SpriteImage key={`r${k}`} source={frame} style={{ position: "absolute", left: dx * line * 2.4, top: dy * line * 2.4, width: size, height: size, tintColor: "#FFE6B0", opacity: 0.38 }} resizeMode="contain" />
          ))}
          {OUTLINE.map(([dx, dy], k) => (
            <SpriteImage key={k} source={frame} style={{ position: "absolute", left: dx * line, top: dy * line, width: size, height: size, tintColor: "#140a05", opacity: 0.85 }} resizeMode="contain" />
          ))}
          <SpriteImage source={frame} style={{ position: "absolute", width: size, height: size }} resizeMode="contain" />
        </View>
      ))}
    </Animated.View>
  );
};

export default memo(Companion);
