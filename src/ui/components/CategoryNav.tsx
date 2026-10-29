import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import SpriteImage from "./SpriteImage";
import { Ionicons } from "@expo/vector-icons";
import Text from "./Text";
import { MIN_TOUCH } from "../layout/useGameLayout";

export type NavItem<Id extends string> = { id: Id; label: string; icon: keyof typeof Ionicons.glyphMap; tint: string; /** Painted art shown instead of the icon. */ art?: ImageSourcePropType };

type Props<Id extends string> = {
  items: NavItem<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  /** A vertical rail (wide windows) or a row of chips (narrow ones). */
  wide: boolean;
  railWidth?: number;
};

/**
 * The navigation shared by Settings and How to play: a rail of categories on the left on wide windows, a scrolling row of
 * chips on top on narrow ones. Each category has its own colour so a screen with many of them can be read at a glance.
 */
export function CategoryNav<Id extends string>({ items, value, onChange, wide, railWidth = 200 }: Props<Id>) {
  if (wide) {
    return (
      <ScrollView style={{ width: railWidth, flexGrow: 0 }} contentContainerStyle={styles.rail} showsVerticalScrollIndicator={false}>
        {items.map(c => {
          const on = c.id === value;
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => onChange(c.id)}
              activeOpacity={0.85}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.railItem, on && { backgroundColor: c.tint + "1F", borderColor: c.tint + "88" }]}
            >
              {c.art ? (
                <SpriteImage source={c.art} style={[styles.railArt, !on && { opacity: 0.8 }]} resizeMode="contain" accessibilityIgnoresInvertColors />
              ) : (
                <View style={[styles.railChip, { backgroundColor: c.tint + (on ? "40" : "22") }]}>
                  <Ionicons name={c.icon} size={20} color={c.tint} />
                </View>
              )}
              <Text style={[styles.railLabel, on && { color: "#fff" }]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                {c.label}
              </Text>
              {on ? <View style={[styles.railBar, { backgroundColor: c.tint }]} /> : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }
  return (
    <View style={styles.chipsWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {items.map(c => {
          const on = c.id === value;
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => onChange(c.id)}
              activeOpacity={0.85}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.topChip, on && { backgroundColor: c.tint + "26", borderColor: c.tint }]}
            >
              {c.art ? <SpriteImage source={c.art} style={styles.chipArt} resizeMode="contain" accessibilityIgnoresInvertColors /> : <Ionicons name={c.icon} size={18} color={c.tint} />}
              <Text style={[styles.topChipText, on && { color: "#fff" }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { padding: 12, gap: 8 },
  railItem: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: MIN_TOUCH + 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16, borderWidth: 1.5, borderColor: "transparent", overflow: "hidden" },
  railChip: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  railArt: { width: 38, height: 38 },
  chipArt: { width: 26, height: 26 },
  railLabel: { flex: 1, color: "#D6C4B2", fontWeight: "800", fontSize: 14 },
  railBar: { position: "absolute", left: 0, top: 10, bottom: 10, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  chipsWrap: { height: 62, flexShrink: 0 },
  chips: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: "center" },
  topChip: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 46, paddingHorizontal: 14, borderRadius: 21, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.05)" },
  topChipText: { color: "#D6C4B2", fontWeight: "800", fontSize: 13 },
});
