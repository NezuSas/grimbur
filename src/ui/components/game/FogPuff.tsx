import React, { memo, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

const WISPS = Array.from({ length: 7 }, (_, i) => ({ angle: (i / 7) * Math.PI * 2 + 0.3, dist: 0.42 + (i % 3) * 0.1, size: 0.16 + (i % 2) * 0.06 }));

/**
 * The fog torn off a tile the moment it is explored: a few soft wisps fly out and fade. Their colour says what the tile's clue is
 * about to tell (amber near a guardian, violet near a vortex, pale stone when it is quiet). Mounted only when motion is allowed.
 */
const FogPuff = ({ size, color }: { size: number; color: string }) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(t, { toValue: 1, duration: 480, easing: Easing.out(Easing.quad), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [t]);
  return (
    <View style={styles.wrap} pointerEvents="none">
      {WISPS.map((w, i) => {
        const d = w.dist * size;
        const s = w.size * size;
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              width: s,
              height: s,
              borderRadius: s,
              backgroundColor: color,
              opacity: t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.75, 0] }),
              transform: [
                { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(w.angle) * d] }) },
                { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(w.angle) * d] }) },
                { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.4] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
};

export default memo(FogPuff);

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", zIndex: 3 },
});
