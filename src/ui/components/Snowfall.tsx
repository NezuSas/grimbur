import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useWindowDimensions } from "../layout/scaledWindow";

/**
 * Snow drifting down over a screen while Christmas in the cave runs. Purely a look: it never touches anything (no touches,
 * no layout) and it is off for the reduced-flash setting.
 */
export default function Snowfall({ count = 34, calm = false }: { count?: number; calm?: boolean }) {
  const { width, height } = useWindowDimensions();
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        // A fixed scatter (no Math.random in render): the same snow every time the screen opens.
        const r = (k: number) => ((Math.sin((i + 1) * 12.9898 * k) * 43758.5453) % 1 + 1) % 1;
        return { x: r(1), size: 3 + r(2) * 5, drift: (r(3) - 0.5) * 60, duration: 6000 + r(4) * 7000, delay: r(5) * 7000, opacity: 0.55 + r(6) * 0.4 };
      }),
    [count],
  );
  if (calm) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {flakes.map((f, i) => (
        <Flake key={i} {...f} width={width} height={height} />
      ))}
    </View>
  );
}

function Flake({ x, size, drift, duration, delay, opacity, width, height }: { x: number; size: number; drift: number; duration: number; delay: number; opacity: number; width: number; height: number }) {
  const fall = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Each fall starts over from the top by hand (a looped timing stopped after one fall on some platforms).
    let alive = true;
    const drop = () => {
      if (!alive) return;
      fall.setValue(0);
      Animated.timing(fall, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => finished && drop());
    };
    const start = setTimeout(drop, delay);
    return () => {
      alive = false;
      clearTimeout(start);
      fall.stopAnimation();
    };
  }, [fall, duration, delay]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x * width,
        top: -10,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: "#FFFFFF",
        shadowColor: "#E3F2FD",
        shadowOpacity: 0.9,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 0 },
        opacity,
        transform: [
          { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, height + 20] }) },
          { translateX: fall.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, drift, 0] }) },
        ],
      }}
    />
  );
}
