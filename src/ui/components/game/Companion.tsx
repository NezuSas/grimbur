import React, { memo, useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import type { ImageSourcePropType } from "react-native";
import SpriteImage from "../SpriteImage";

/** The two frames of a companion (cut from one sheet so they share scale): swapped on a beat, they flap, swish or glow. */
export type CompanionLook = readonly [ImageSourcePropType, ImageSourcePropType];

const FLAP_MS = 320;

/**
 * A companion floating by the hero: it bobs gently and swaps its two frames. Purely a look: it never reacts to the board, so it
 * can never give a danger away. Calm (reduced motion): it hovers still on its first frame.
 */
const Companion = ({ look, size, calm = false, mirror = false, aura = null }: { look: CompanionLook; size: number; calm?: boolean; mirror?: boolean; aura?: string | null }) => {
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
      <SpriteImage source={look[0]} style={{ position: "absolute", width: size, height: size, opacity: second ? 0 : 1 }} resizeMode="contain" />
      <SpriteImage source={look[1]} style={{ position: "absolute", width: size, height: size, opacity: second ? 1 : 0 }} resizeMode="contain" />
    </Animated.View>
  );
};

export default memo(Companion);
