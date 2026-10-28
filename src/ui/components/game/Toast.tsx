import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import Text from "../Text";

type Props = {
  /** Shown text; a new `toastKey` replays the toast even with the same text. */
  text: string;
  toastKey: number;
  top: number;
  duration?: number;
  onDone: () => void;
};

/** A short message that fades in under the HUD and goes away by itself. Never blocks touches. */
const Toast: React.FC<Props> = ({ text, toastKey, top, duration = 1500, onDone }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    opacity.setValue(0);
    const run = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.delay(duration),
      Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]);
    run.start(({ finished }) => {
      if (finished) doneRef.current();
    });
    return () => run.stop();
  }, [toastKey, duration, opacity]);

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { top, opacity }]} accessibilityLiveRegion="polite">
      <Text style={styles.text} maxFontSizeMultiplier={1.2}>
        {text}
      </Text>
    </Animated.View>
  );
};

export default Toast;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 40,
    backgroundColor: "rgba(52, 40, 28,0.96)",
    borderColor: "#FF8A80",
    borderWidth: 2,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 7,
    shadowColor: "#FF5252",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  text: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
