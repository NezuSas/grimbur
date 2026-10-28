import React, { useRef } from "react";
import { Animated, Pressable } from "react-native";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";
import { useSettingsStore } from "../../state/settings/store";
import { MOTION } from "../motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle>; children: React.ReactNode; depth?: number };

/** A Pressable that sinks a little under the finger and springs back, so every menu button answers the touch. */
const PressScale: React.FC<Props> = ({ style, children, depth = 0.92, onPressIn, onPressOut, ...rest }) => {
  const calm = useSettingsStore(s => s.reduceFlash);
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <AnimatedPressable
      {...rest}
      style={[style, { transform: [{ scale }] }]}
      onPressIn={e => {
        if (!calm) Animated.timing(scale, { toValue: depth, duration: MOTION.fast / 2, useNativeDriver: true }).start();
        onPressIn?.(e);
      }}
      onPressOut={e => {
        Animated.spring(scale, { toValue: 1, ...MOTION.spring, useNativeDriver: true }).start();
        onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
};

export default PressScale;
