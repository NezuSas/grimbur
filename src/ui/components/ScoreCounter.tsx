import React, { memo, useEffect, useRef, type ComponentRef } from "react";
import { View, StyleSheet, ImageSourcePropType, Animated } from "react-native";
import Text from "./Text";
import { useGameLayout } from "../layout/useGameLayout";
import SpriteImage from "./SpriteImage";
import { useRollTo } from "../useRollTo";

type Props = {
  icon?: ImageSourcePropType;
  /** A drawn icon (used instead of an image). */
  iconNode?: React.ReactNode;
  value: number | string;
  /** Shown right after the value, unrolled ("/5" after a rolling count). */
  suffix?: string;
  label?: string;
  iconDim?: number;
  /** Spoken description for screen readers. */
  a11yLabel?: string;
  /** Narrow windows: tighter padding so the three counters fit. */
  compact?: boolean;
  /** Peak scale of the pop when the value changes (a streak makes it bigger). */
  popScale?: number;
  /** The number rolls to a new value instead of jumping (numbers only). */
  roll?: boolean;
  /** Reduced motion: no pop and no roll. */
  calm?: boolean;
  /** Reports where the icon's centre is on screen, so things can fly into it. */
  onAnchor?: (at: { x: number; y: number }) => void;
};

const ScoreCounter: React.FC<Props> = memo(({ icon, iconNode, value, suffix, label, iconDim = 32, a11yLabel, compact, popScale = 1.15, roll = false, calm = false, onAnchor }) => {
  const { spacing } = useGameLayout();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const popRef = useRef(popScale);
  popRef.current = popScale;
  const rolled = useRollTo(typeof value === "number" ? value : 0, calm || !roll || typeof value !== "number");
  const shown = roll && typeof value === "number" ? rolled : value;
  const box = useRef<ComponentRef<typeof View>>(null);
  const measure = () => {
    if (!onAnchor) return;
    box.current?.measureInWindow((x, y, _w, h) => onAnchor({ x: x + iconDim / 2 + (compact ? 5 : 10), y: y + h / 2 }));
  };

  useEffect(() => {
    if (calm) return;
    // 120-160ms scale pop: 1 -> 1.15 -> 1
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: popRef.current,
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
    <View
      ref={box}
      onLayout={measure}
      style={[
        styles.container,
        { paddingRight: spacing(12), paddingVertical: spacing(4), marginHorizontal: spacing(4) },
        compact && { paddingLeft: 5, paddingRight: 6, marginHorizontal: 1 },
      ]}
      accessible={!!a11yLabel}
      accessibilityLabel={a11yLabel}
    >
      <View style={[styles.iconWrapper, { width: iconDim, height: iconDim }]}>
        {iconNode ?? (icon && <SpriteImage source={icon} style={[styles.icon, { width: iconDim * 0.9, height: iconDim * 0.9 }]} />)}
      </View>
      <View style={[styles.content, { marginLeft: compact ? 4 : spacing(10) }]}>
        <Animated.Text
          style={[styles.value, { fontFamily: "Fredoka_700Bold", fontWeight: undefined, transform: [{ scale: scaleAnim }] }]}
          maxFontSizeMultiplier={1.15}
          numberOfLines={1}
        >
          {shown}
          {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
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
  suffix: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  label: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    includeFontPadding: false,
    marginTop: 0,
  },
});

export default ScoreCounter;
