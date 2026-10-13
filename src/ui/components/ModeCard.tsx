import React, { memo, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import Text from "./Text";
import { Ionicons } from "@expo/vector-icons";
import { haptic } from "../../shared/haptics";
import { MIN_TOUCH } from "../layout/useGameLayout";

type Props = {
  title: string;
  /** One short line saying what makes this mode different. */
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  onPress: () => void;
  /** Locked modes show the lock and say how to open them. */
  locked?: boolean;
  /** Something small on the right (a streak flame, a record). */
  badge?: React.ReactNode;
  /** Larger title for the main mode. */
  featured?: boolean;
  /** Replaces the round icon (the daily shows its streak flame there). */
  leading?: React.ReactNode;
  /** Size factor for big screens (1 on a phone). */
  ui?: number;
  /** Lower card for short windows. */
  compactCard?: boolean;
};

/** A game-mode entry on the cover: icon, name, and a line that tells it apart from the others. */
const ModeCard: React.FC<Props> = memo(({ title, subtitle, icon, tint, onPress, locked = false, badge, featured = false, leading, ui = 1, compactCard = false }) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }], flex: featured ? undefined : 1 }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          haptic.impact();
          Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
        }}
        onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${subtitle}`}
        accessibilityState={{ disabled: locked }}
        style={[styles.card, { borderColor: locked ? "rgba(255,255,255,0.14)" : tint + "AA", minHeight: (featured ? 78 : compactCard ? 60 : 70) * ui, gap: 12 * ui, paddingHorizontal: 12 * ui }]}
      >
        {leading ?? (
          <View style={[styles.iconWrap, { width: 46 * ui, height: 46 * ui, borderRadius: 23 * ui, backgroundColor: tint + (locked ? "14" : "26"), borderColor: tint + (locked ? "40" : "88") }]}>
            <Ionicons name={locked ? "lock-closed" : icon} size={(featured ? 26 : 22) * ui} color={locked ? "#b8b3d0" : tint} />
          </View>
        )}
        <View style={styles.text}>
          <Text style={[styles.title, featured && styles.titleFeatured, { fontSize: (featured ? 19 : compactCard ? 12 : 15) * ui, letterSpacing: compactCard ? 0.5 : 1.5 }, locked && { color: "#cfcbe6" }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
            {title.toLocaleUpperCase()}
          </Text>
          <Text style={[styles.subtitle, { fontSize: 12 * ui, lineHeight: 15 * ui }]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
            {subtitle}
          </Text>
        </View>
        {badge ? <View style={styles.badge}>{badge}</View> : null}
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: "rgba(18, 14, 36, 0.92)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: MIN_TOUCH,
  },
  iconWrap: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 1 },
  title: { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 1.5 },
  titleFeatured: { fontSize: 19, letterSpacing: 2 },
  subtitle: { color: "#bdb7d8", fontSize: 12, lineHeight: 15 },
  badge: { alignItems: "center", justifyContent: "center" },
});

export default ModeCard;
