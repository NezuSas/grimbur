import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";
import SpriteImage from "../SpriteImage";

type Props = { count?: number };

const GEM = require("../../../assets/sprites/items/Icon_Gem.png");
const ARROW = require("../../../assets/sprites/items/Icon_Arrows.png");

/**
 * The victory celebration: a shower of the game's own gems and arrows falling over the cave, each one
 * tumbling and twinkling. Native-driven, then it stays out of the way.
 */
const GemShower: React.FC<Props> = ({ count = 26 }) => {
  const { width, height } = useWindowDimensions();
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: ((i * 0.6180339 + 0.07) % 1) * (width - 30),
        size: 18 + (i % 4) * 7,
        delay: (i * 83) % 1400,
        duration: 2300 + ((i * 397) % 1900),
        sway: (((i * 31) % 13) - 6) * 12,
        spin: 1 + (i % 3),
        arrow: i % 7 === 3,
      })),
    [count, width],
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {items.map((p, i) => (
        <Falling key={i} p={p} height={height} />
      ))}
    </View>
  );
};

type Item = { x: number; size: number; delay: number; duration: number; sway: number; spin: number; arrow: boolean };

const Falling = ({ p, height }: { p: Item; height: number }) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const run = Animated.timing(t, { toValue: 1, duration: p.duration, delay: p.delay, easing: Easing.in(Easing.quad), useNativeDriver: true });
    run.start();
    return () => run.stop();
  }, [t, p.duration, p.delay]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: p.x,
        top: -40,
        opacity: t.interpolate({ inputRange: [0, 0.06, 0.8, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, height + 60] }) },
          { translateX: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, p.sway, -p.sway * 0.6] }) },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.spin * 220}deg`] }) },
          // A gem "twinkles": it swells and shrinks as it turns.
          { scale: t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 1.25, 0.9, 1.2, 1] }) },
        ],
      }}
    >
      <SpriteImage source={p.arrow ? ARROW : GEM} style={{ width: p.size, height: p.size }} resizeMode="contain" />
    </Animated.View>
  );
};

export default GemShower;
