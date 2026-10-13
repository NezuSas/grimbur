import React, { memo, useEffect, useRef } from "react";
import { View, Text, Image, StyleSheet, ImageSourcePropType, Animated } from "react-native";
import { useGameLayout } from "../layout/useGameLayout";

type Props = {
  icon: ImageSourcePropType;
  value: number | string;
  label?: string;
  iconDim?: number;
};

const ScoreCounter: React.FC<Props> = memo(({ icon, value, label, iconDim = 32 }) => {
  const { spacing } = useGameLayout();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 120-160ms scale pop: 1 -> 1.15 -> 1
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.15,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, [value]);

  return (
    <View style={[styles.container, { paddingRight: spacing(12), paddingVertical: spacing(4), marginHorizontal: spacing(4) }]}>
      <View style={[styles.iconWrapper, { width: iconDim, height: iconDim }]}>
        <Image source={icon} style={[styles.icon, { width: iconDim * 0.9, height: iconDim * 0.9 }]} />
      </View>
      <View style={[styles.content, { marginLeft: spacing(10) }]}>
        <Animated.Text style={[styles.value, { transform: [{ scale: scaleAnim }] }]}>
          {value}
        </Animated.Text>
        {label && <Text style={styles.label}>{label}</Text>}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    resizeMode: "contain",
  },
  content: {},
  value: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    includeFontPadding: false,
  },
  label: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    includeFontPadding: false,
    marginTop: 0,
  },
});

export default ScoreCounter;
