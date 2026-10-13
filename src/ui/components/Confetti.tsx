import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";

type Props = { count?: number };

const COLORS = ["#F2C14E", "#FF7043", "#4FC3F7", "#9ee37d", "#CE93D8", "#ffffff"];

/** One burst of falling paper for a victory or a new record. Native-driven, then it stays out of the way. */
const Confetti: React.FC<Props> = ({ count = 40 }) => {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: ((i * 0.7548 + 0.11) % 1) * width,
        w: 6 + (i % 4) * 2,
        h: 9 + (i % 3) * 3,
        delay: (i * 47) % 700,
        duration: 1900 + ((i * 331) % 1600),
        sway: (((i * 29) % 13) - 6) * 14,
        spin: 2 + (i % 5),
        color: COLORS[i % COLORS.length],
      })),
    [count, width],
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((p, i) => (
        <Piece key={i} p={p} height={height} />
      ))}
    </View>
  );
};

const Piece = ({ p, height }: { p: { x: number; w: number; h: number; delay: number; duration: number; sway: number; spin: number; color: string }; height: number }) => {
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
        top: -20,
        width: p.w,
        height: p.h,
        backgroundColor: p.color,
        borderRadius: 1.5,
        opacity: t.interpolate({ inputRange: [0, 0.05, 0.85, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
          { translateX: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, p.sway, -p.sway * 0.5] }) },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.spin * 180}deg`] }) },
        ],
      }}
    />
  );
};

export default Confetti;
