import React, { useEffect, useRef } from "react";
import GlyphIcon from "./GlyphIcon";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Text from "./Text";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  days: number;
  /** The daily has been played today: the flame is calm and shows a check. Otherwise it flickers (play to keep it). */
  doneToday: boolean;
};

/** The daily streak: a flame with the number of days. It pulses while the streak still needs today's run. */
const StreakBadge: React.FC<Props> = ({ days, doneToday }) => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (doneToday || days === 0) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.14, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [doneToday, days, pulse]);

  const lit = days > 0;
  return (
    <Animated.View style={[styles.wrap, lit ? styles.lit : styles.cold, { transform: [{ scale: pulse }] }]}>
      <GlyphIcon name="flame" size={lit ? 24 : 26} style={!lit && { opacity: 0.35 }} />
      {lit ? (
        <Text style={styles.days} allowFontScaling={false}>
          {days}
        </Text>
      ) : null}
      {doneToday && lit ? (
        <View style={styles.check}>
          <Ionicons name="checkmark" size={11} color="#10260a" />
        </View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: { minWidth: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 2, paddingHorizontal: 8 },
  lit: { backgroundColor: "rgba(255,154,60,0.18)", borderColor: "rgba(255,154,60,0.85)" },
  cold: { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.18)" },
  days: { color: "#FFD9A8", fontWeight: "800", fontSize: 17, marginTop: -3 },
  check: {
    position: "absolute",
    right: -2,
    top: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#9ee37d",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default StreakBadge;
