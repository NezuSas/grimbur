import React, { useCallback, useRef, useState, memo } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing, Platform, GestureResponderEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useGameLayout } from "../layout/useGameLayout";
import { Direction } from "../../core/engine/types";
import { dpadDirection } from "../../core/input/dpad";
import { haptic, NotificationFeedbackType } from "../../shared/haptics";
import { useT } from "../../i18n/useT";

type Props = {
  onMove: (direction: Direction) => void;
  onAttack: () => void;
  /** Arrows left, shown on the attack button. */
  arrows: number;
};

const GOLD = "#FFD54F";

const animateScale = (anim: Animated.Value, toValue: number) => {
  Animated.timing(anim, { toValue, duration: 90, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
};

type AttackButtonProps = { size: number; arrows: number; label: string; onPress: () => void };

/** The round attack button with the number of arrows left on it (so the player never has to look away). */
export const AttackButton = memo(({ size, arrows, label, onPress }: AttackButtonProps) => {
  const scale = useRef(new Animated.Value(1)).current;
  const empty = arrows <= 0;

  const handlePress = useCallback(() => {
    haptic.notify(empty ? NotificationFeedbackType.Warning : NotificationFeedbackType.Success);
    onPress();
  }, [empty, onPress]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => animateScale(scale, 0.9)}
        onPressOut={() => animateScale(scale, 1)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: empty }}
        hitSlop={6}
        style={[styles.attack, { width: size, height: size, borderRadius: size / 2 }, empty && styles.attackEmpty]}
      >
        <LinearGradient
          colors={empty ? ["#5b5b66", "#33333b"] : ["#FF6B3D", "#E6194B"]}
          style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
        />
        <Ionicons name="flash" size={Math.round(size * 0.46)} color={empty ? "#9a9aa5" : "#fff"} />
        <View style={[styles.badge, { minWidth: size * 0.36, height: size * 0.3, borderRadius: size * 0.15 }]}>
          <Text style={[styles.badgeText, { fontSize: Math.max(11, size * 0.19) }, empty && { color: "#FF5252" }]} allowFontScaling={false}>
            {arrows}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const ARROWS: { dir: Direction; icon: keyof typeof Ionicons.glyphMap; dx: number; dy: number }[] = [
  { dir: "UP", icon: "caret-up", dx: 0, dy: -1 },
  { dir: "DOWN", icon: "caret-down", dx: 0, dy: 1 },
  { dir: "LEFT", icon: "caret-back", dx: -1, dy: 0 },
  { dir: "RIGHT", icon: "caret-forward", dx: 1, dy: 0 },
];

/**
 * One round direction pad. The whole disc is the touch area, split into four quadrants along its diagonals,
 * so a thumb that drifts a little still lands on the intended arrow (a pad of four small buttons has gaps).
 */
const DirectionPad: React.FC<Props> = memo(({ onMove, onAttack, arrows }) => {
  const { t } = useT();
  const { padDiameter: D, splitAttack, attackSize } = useGameLayout();
  const [active, setActive] = useState<Direction | null>(null);
  const pressed = useRef<Direction | null>(null);

  // With the attack button in the middle, the dead zone has to cover it.
  const deadZone = splitAttack ? 0.24 : 0.46;

  const read = (e: GestureResponderEvent) => dpadDirection(e.nativeEvent.locationX, e.nativeEvent.locationY, D, deadZone);

  const handlePressIn = (e: GestureResponderEvent) => {
    pressed.current = read(e);
    setActive(pressed.current);
  };
  const handlePress = () => {
    const dir = pressed.current;
    if (!dir) return;
    haptic.impact();
    onMove(dir);
  };
  const handlePressOut = () => {
    setActive(null);
  };

  const names: Record<Direction, string> = {
    UP: t("a11y.moveUp"),
    DOWN: t("a11y.moveDown"),
    LEFT: t("a11y.moveLeft"),
    RIGHT: t("a11y.moveRight"),
  };

  const chevron = D * 0.22;
  const reach = D * 0.34; // distance of each arrow from the centre

  return (
    <View
      style={[styles.disc, { width: D, height: D, borderRadius: D / 2 }]}
      accessible
      accessibilityLabel={t("a11y.dpad")}
      accessibilityActions={ARROWS.map(a => ({ name: a.dir, label: names[a.dir] }))}
      onAccessibilityAction={e => {
        const dir = e.nativeEvent.actionName as Direction;
        if (names[dir]) onMove(dir);
      }}
    >
      {/* Diagonal seams between the four quadrants */}
      <View style={[styles.seam, { top: D / 2 - 1, width: D, transform: [{ rotate: "45deg" }] }]} />
      <View style={[styles.seam, { top: D / 2 - 1, width: D, transform: [{ rotate: "-45deg" }] }]} />
      <View
        style={[
          styles.hub,
          { width: D * (splitAttack ? 0.34 : 0.5), height: D * (splitAttack ? 0.34 : 0.5), borderRadius: D / 2 },
        ]}
      />

      {ARROWS.map(a => {
        const on = active === a.dir;
        const size = chevron;
        return (
          <View
            key={a.dir}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: D / 2 + a.dx * reach - size,
              top: D / 2 + a.dy * reach - size,
              width: size * 2,
              height: size * 2,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {on && <View style={[styles.glow, { width: size * 1.9, height: size * 1.9, borderRadius: size }]} />}
            <Ionicons name={a.icon} size={size * (on ? 1.25 : 1.1)} color={on ? GOLD : "rgba(255,255,255,0.92)"} />
          </View>
        );
      })}

      {/* The whole disc catches touches */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPressIn={handlePressIn}
        onPress={handlePress}
        onPressOut={handlePressOut}
        accessible={false}
        importantForAccessibility="no"
      />

      {!splitAttack && (
        <View style={styles.center} pointerEvents="box-none">
          <AttackButton size={attackSize} arrows={arrows} label={`${t("a11y.attack")}. ${t("a11y.arrowsLeft", { count: arrows })}`} onPress={onAttack} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  disc: {
    backgroundColor: "rgba(14, 11, 31, 0.8)",
    borderWidth: 3,
    borderColor: "rgba(255, 213, 79, 0.55)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  seam: {
    position: "absolute",
    left: 0,
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  hub: {
    position: "absolute",
    backgroundColor: "rgba(14, 11, 31, 0.95)",
    borderWidth: 2,
    borderColor: "rgba(255, 213, 79, 0.3)",
  },
  glow: {
    position: "absolute",
    backgroundColor: "rgba(255, 213, 79, 0.25)",
  },
  center: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  attack: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.4)",
    overflow: "visible",
    ...Platform.select({
      ios: { shadowColor: "#FF4B2B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.55, shadowRadius: 10 },
      android: { elevation: 10 },
    }),
  },
  attackEmpty: { borderColor: "rgba(255,255,255,0.18)", shadowOpacity: 0 },
  badge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    paddingHorizontal: 5,
    backgroundColor: "rgba(14, 11, 31, 0.95)",
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: GOLD, fontWeight: "900" },
});

export default DirectionPad;
