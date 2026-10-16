import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "../Text";

type Props = {
  /** Changes for every hint; replays the animation. */
  hintKey: string;
  text: string;
  /** Where it sits (absolute position); it should stay clear of the board. */
  place: { top: number; left?: number; right?: number; width: number };
  onDone: () => void;
  /** Milliseconds on screen. */
  duration?: number;
  calm?: boolean;
};

/** A one-time tip that slides in under the HUD, fades by itself and goes away when tapped. */
const CoachHint: React.FC<Props> = ({ hintKey, text, place, onDone, duration = 7000, calm }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(calm ? 0 : -10)).current;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    opacity.setValue(0);
    lift.setValue(calm ? 0 : -10);
    const run = Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(lift, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]),
      Animated.delay(duration),
      Animated.timing(opacity, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]);
    run.start(({ finished }) => {
      if (finished) doneRef.current();
    });
    return () => run.stop();
  }, [hintKey, duration, calm, opacity, lift]);

  return (
    <Animated.View style={[styles.wrap, { ...place, opacity, transform: [{ translateY: lift }] }]} accessibilityLiveRegion="polite">
      <Pressable onPress={() => doneRef.current()} style={styles.pill} accessibilityRole="button" accessibilityLabel={text}>
        <Ionicons name="bulb" size={16} color="#FFD54F" />
        <Text style={styles.text} maxFontSizeMultiplier={1.2}>
          {text}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

export default CoachHint;

const styles = StyleSheet.create({
  wrap: { position: "absolute", zIndex: 30 },
  pill: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "rgba(30,20,60,0.96)",
    borderColor: "#FFD54F",
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: "#FFD54F",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  text: { color: "#fff", fontWeight: "700", fontSize: 12, flexShrink: 1 },
});
