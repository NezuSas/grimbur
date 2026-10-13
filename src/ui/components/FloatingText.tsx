// src/ui/components/FloatingText.tsx
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useGameLayout } from "../layout/useGameLayout";

type Props = {
  text: string;
  color?: string;
  onComplete: () => void;
};

const FloatingText: React.FC<Props> = ({ text, color = "#FFD700", onComplete }) => {
    const { spacing, fontSize } = useGameLayout();
  const floatAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(floatAnim, {
        toValue: -spacing(100), // More distance
        duration: 1500,        // Slower/smoother
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1.5, // Larger scale spring
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start(() => onComplete());
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [
            { translateY: floatAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <Text style={[styles.text, { color, fontSize: fontSize(40) }]}>{text}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: "40%", // Default center-ish, but GameScreen will relative position it
    alignSelf: "center",
    zIndex: 1000,
    pointerEvents: "none",
  },
  text: {
    fontWeight: "900",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
});

export default FloatingText;
