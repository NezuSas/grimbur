import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";
import type { ViewProps } from "react-native";
import { useSettingsStore } from "../../state/settings/store";
import { MOTION } from "../motion";

/** A block that rises and fades in after `delay` ms, so a screen builds itself instead of appearing (instant when calm). */
const Rise: React.FC<ViewProps & { delay?: number; children: React.ReactNode }> = ({ delay = 0, style, children, ...rest }) => {
  const calm = useSettingsStore(s => s.reduceFlash);
  const v = useRef(new Animated.Value(calm ? 1 : 0)).current;
  useEffect(() => {
    if (calm) {
      v.setValue(1);
      return;
    }
    Animated.timing(v, { toValue: 1, duration: MOTION.slow - 100, delay, easing: MOTION.ease, useNativeDriver: true }).start();
  }, [calm, delay, v]);
  return (
    <Animated.View {...rest} style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
};

/** The delay of the n-th item of a list that builds itself (capped, so a long list never makes the player wait). */
export const riseDelay = (index: number, start = 0): number => start + Math.min(index, 8) * MOTION.stagger;

export default Rise;
