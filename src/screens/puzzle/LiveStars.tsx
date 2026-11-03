import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import SpriteImage from "../../ui/components/SpriteImage";
import { useT } from "../../i18n/useT";

const STAR = require("../../assets/sprites/ui/Icon_Star.webp");

/**
 * The stars still possible, in the banner while playing: three to start, one goes out with every mistake or hint (it shakes,
 * shrinks and dims), so the cost of a slip is felt the moment it happens.
 */
export default function LiveStars({ possible, calm }: { possible: number; calm: boolean }) {
  const { t } = useT();
  const lit = useRef([0, 1, 2].map(k => new Animated.Value(k < possible ? 1 : 0))).current;
  const shake = useRef(new Animated.Value(0)).current;
  const last = useRef(possible);
  useEffect(() => {
    const before = last.current;
    last.current = possible;
    if (possible >= before) {
      lit.forEach((v, k) => v.setValue(k < possible ? 1 : 0));
      return;
    }
    if (calm) {
      lit.forEach((v, k) => v.setValue(k < possible ? 1 : 0));
      return;
    }
    shake.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 120, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]),
      ...lit.slice(possible, before).map(v => Animated.timing(v, { toValue: 0, duration: 520, easing: Easing.in(Easing.quad), useNativeDriver: true })),
    ]).start();
  }, [possible, calm, lit, shake]);

  return (
    <Animated.View
      style={[styles.row, { transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] }) }] }]}
      accessible
      accessibilityLabel={t("puzzle.stars", { n: possible })}
    >
      {lit.map((v, k) => (
        <View key={k} style={styles.slot}>
          <SpriteImage source={STAR} style={[styles.star, styles.off]} resizeMode="contain" />
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1.6, 1] }) }] }]}>
            <SpriteImage source={STAR} style={styles.star} resizeMode="contain" />
          </Animated.View>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 1, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.35)" },
  slot: { width: 20, height: 20 },
  star: { width: 20, height: 20 },
  off: { opacity: 0.18 },
});
