import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, type ImageSourcePropType } from "react-native";
import SpriteImage from "./SpriteImage";
import { useSettingsStore } from "../../state/settings/store";

export const SPARKS = Array.from({ length: 9 }, (_, i) => ({ angle: (i / 9) * Math.PI * 2 + 0.4, dist: 38 + (i % 3) * 16, size: 10 + (i % 3) * 3 }));
const EMBER_SPRITE = require("../../assets/sprites/items/Icon_Ember.png");

/**
 * Painted sparks thrown out from the middle of the parent: embers off the Forge's anvil by default, or any other
 * sprite (`spread` scales how far and how big they fly). A new `run` (a timestamp) throws them again; nothing when calm.
 */
export const Burst: React.FC<{ run: number; source?: ImageSourcePropType; spread?: number }> = ({ run, source = EMBER_SPRITE, spread = 1 }) => {
  const calm = useSettingsStore(s => s.reduceFlash);
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run || calm) return;
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [run, calm, t]);
  if (!run || calm) return null;
  return (
    <View style={styles.burst} pointerEvents="none">
      {SPARKS.map((s, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            opacity: t.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 1, 0] }),
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(s.angle) * s.dist * spread] }) },
              // Sparks fly out and up a little, like sparks off an anvil.
              { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, (Math.sin(s.angle) * s.dist - 16) * spread] }) },
              { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${(i % 2 ? 1 : -1) * 90}deg`] }) },
              { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1.1, 0.4] }) },
            ],
          }}
        >
          <SpriteImage source={source} style={{ width: s.size * spread, height: s.size * spread }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  burst: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
});
