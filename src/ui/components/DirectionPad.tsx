import React, { useRef, memo, useCallback } from "react";
import { View, Pressable, StyleSheet, Animated, Easing, Platform } from "react-native";
import { useGameLayout } from "../layout/useGameLayout";
import { Direction } from "../../core/engine/types";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { haptic, NotificationFeedbackType } from "../../shared/haptics";
import { useT } from "../../i18n/useT";

type Props = {
  onMove: (direction: Direction) => void;
  onAttack: () => void;
};

const animateScale = (anim: Animated.Value, toValue: number) => {
  Animated.timing(anim, {
    toValue,
    duration: 100,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  }).start();
};

type PadButtonProps = {
  size: number;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  variant: "move" | "attack";
  onPress: () => void;
};

/** One round pad button. Defined at module level so it is never remounted mid-touch. */
const PadButton = memo(({ size, icon, label, variant, onPress }: PadButtonProps) => {
  const scale = useRef(new Animated.Value(1)).current;
  const isAttack = variant === "attack";

  const handlePress = useCallback(() => {
    if (isAttack) haptic.notify(NotificationFeedbackType.Success);
    else haptic.impact();
    onPress();
  }, [isAttack, onPress]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => animateScale(scale, isAttack ? 0.88 : 0.9)}
        onPressOut={() => animateScale(scale, 1)}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={4}
        style={({ pressed }) => [
          isAttack ? styles.attackWrapper : styles.moveWrapper,
          { width: size, height: size, borderRadius: size / 2 },
          pressed && (isAttack ? styles.attackPressed : styles.movePressed),
        ]}
      >
        <LinearGradient
          colors={isAttack ? ["#FF4B2B", "#FF416C"] : ["#4a4a4a", "#2a2a2a"]}
          style={[styles.gradient, { borderRadius: size / 2 }]}
        >
          <View style={[styles.bevel, isAttack && styles.attackBevel]}>
            <Ionicons name={icon} size={Math.round(size * 0.5)} color={isAttack ? "#FFF" : "#E0E0E0"} />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

const DirectionPad: React.FC<Props> = memo(({ onMove, onAttack }) => {
  const { t } = useT();
  const { padButtonSize: size, buttonGap } = useGameLayout();

  const up = useCallback(() => onMove("UP"), [onMove]);
  const down = useCallback(() => onMove("DOWN"), [onMove]);
  const left = useCallback(() => onMove("LEFT"), [onMove]);
  const right = useCallback(() => onMove("RIGHT"), [onMove]);

  return (
    <View style={[styles.container, { padding: size * 0.25 }]}>
      <View style={[styles.row, { marginBottom: buttonGap }]}>
        <PadButton size={size} icon="caret-up" label={t("a11y.moveUp")} variant="move" onPress={up} />
      </View>

      <View style={[styles.row, { marginBottom: buttonGap }]}>
        <PadButton size={size} icon="caret-back" label={t("a11y.moveLeft")} variant="move" onPress={left} />
        <View style={{ marginHorizontal: buttonGap * 1.5 }}>
          <PadButton size={size * 1.1} icon="flash" label={t("a11y.attack")} variant="attack" onPress={onAttack} />
        </View>
        <PadButton size={size} icon="caret-forward" label={t("a11y.moveRight")} variant="move" onPress={right} />
      </View>

      <View style={styles.row}>
        <PadButton size={size} icon="caret-down" label={t("a11y.moveDown")} variant="move" onPress={down} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  moveWrapper: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
      android: { elevation: 6 },
    }),
  },
  movePressed: {
    borderColor: "#FFD700",
  },
  gradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bevel: {
    width: "90%",
    height: "90%",
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  attackWrapper: {
    backgroundColor: "transparent",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#FF4B2B", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.6, shadowRadius: 10 },
      android: { elevation: 12 },
    }),
  },
  attackPressed: {
    borderColor: "#FFF",
    shadowOpacity: 0.9,
    shadowRadius: 15,
  },
  attackBevel: {
    width: "85%",
    height: "85%",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
});

export default DirectionPad;
