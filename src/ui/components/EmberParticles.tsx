import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";

type Props = {
  /** How many embers float at once. Kept low: this runs behind the menu on every phone. */
  count?: number;
};

type Spark = { x: number; size: number; delay: number; duration: number; drift: number; color: string };

const COLORS = ["#FFB74D", "#FF9A3C", "#FFD180", "#FF7043"];

/** A few embers drifting up from the bottom of the screen. Purely decorative; ignores touches. */
const EmberParticles: React.FC<Props> = ({ count = 12 }) => {
  const { width, height } = useWindowDimensions();
  const sparks = useMemo<Spark[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: ((i * 0.61803 + 0.13) % 1) * width,
        size: 3 + ((i * 7) % 4),
        delay: (i * 530) % 5200,
        duration: 5200 + ((i * 977) % 3800),
        drift: (((i * 37) % 11) - 5) * 9,
        color: COLORS[i % COLORS.length],
      })),
    [count, width],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {sparks.map((s, i) => (
        <Ember key={i} spark={s} height={height} />
      ))}
    </View>
  );
};

const Ember = ({ spark, height }: { spark: Spark; height: number }) => {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: spark.duration, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    const timer = setTimeout(() => loop.start(), spark.delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [t, spark.delay, spark.duration]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: spark.x,
        top: height - 12,
        width: spark.size,
        height: spark.size,
        borderRadius: spark.size / 2,
        backgroundColor: spark.color,
        shadowColor: spark.color,
        shadowOpacity: 0.9,
        shadowRadius: 5,
        opacity: t.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 0.9, 0.5, 0] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.85] }) },
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, spark.drift] }) },
        ],
      }}
    />
  );
};

export default EmberParticles;
