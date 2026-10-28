import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Text from "../Text";
import GlyphIcon from "../GlyphIcon";
import type { GlyphName } from "../../glyphArt";
import { MIN_TOUCH } from "../../layout/useGameLayout";
import { emitSound } from "../../../audio/audioEventBus";

/**
 * The look every pop-up card shares: a deep gradient panel with a coloured rim and glow, a lit top edge and corner studs; a
 * medallion title; and glossy buttons that sink when pressed. Pop-ups differ by their tint and their content, not by their style.
 */

type PanelProps = {
  /** The colour of the rim, the glow and the studs. */
  tint: string;
  width?: number | `${number}%`;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** The card grows in when it appears (off for the reduced-motion setting). */
  animate?: boolean;
};

export const PopupPanel = ({ tint, width, children, style, animate = true }: PanelProps) => {
  const pop = useRef(new Animated.Value(animate ? 0 : 1)).current;
  useEffect(() => {
    if (!animate) return;
    Animated.spring(pop, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
  }, [animate, pop]);
  return (
    <Animated.View
      style={[
        styles.shadow,
        { width, shadowColor: tint, opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] },
      ]}
    >
      <LinearGradient colors={["#493827", "#2D2318", "#201912"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[styles.panel, { borderColor: tint + "CC" }, style]}>
        <View style={[styles.lit, { backgroundColor: "rgba(255,255,255,0.22)" }]} pointerEvents="none" />
        <View style={[styles.stud, { top: 8, left: 8, backgroundColor: tint }]} pointerEvents="none" />
        <View style={[styles.stud, { top: 8, right: 8, backgroundColor: tint }]} pointerEvents="none" />
        <View style={[styles.stud, { bottom: 8, left: 8, backgroundColor: tint }]} pointerEvents="none" />
        <View style={[styles.stud, { bottom: 8, right: 8, backgroundColor: tint }]} pointerEvents="none" />
        {children}
      </LinearGradient>
    </Animated.View>
  );
};

type TitleProps = {
  tint: string;
  title: string;
  /** An Ionicons name, or a short text (an emoji) drawn inside the medallion. */
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  glyph?: string;
  subtitle?: string;
};

export const PopupTitle = ({ tint, title, icon, glyph, subtitle }: TitleProps) => (
  <View style={styles.titleBox}>
    {icon || glyph ? (
      <View style={[styles.medallion, { borderColor: tint, backgroundColor: tint + "26", shadowColor: tint }]}>
        {icon ? <Ionicons name={icon} size={26} color={tint} /> : <Text style={styles.glyph}>{glyph}</Text>}
      </View>
    ) : null}
    <Text style={[styles.title, { color: tint, textShadowColor: tint + "88" }]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
      {title.toLocaleUpperCase()}
    </Text>
    {subtitle ? (
      <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
        {subtitle}
      </Text>
    ) : null}
    <LinearGradient colors={["transparent", tint, "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.rule} />
  </View>
);

type ButtonProps = {
  /** Text, or a node when part of the label is an inline image (pass accessibilityLabel then). */
  label: string | React.ReactElement;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  busy?: boolean;
  /** A short leading text glyph. Prefer `icon` or `art`: emoji render differently on every phone. */
  glyph?: string;
  /** A leading Ionicons icon, drawn in the button's text colour. */
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  /** A leading painted glyph (the game's own art), for ideas Ionicons has no symbol for. */
  art?: GlyphName;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Paints a primary button in this colour (a hero's colour) instead of gold. */
  tint?: string;
};

const BUTTON_COLORS = {
  primary: { fill: ["#FFE082", "#FFB300"] as const, edge: "#B26A00", text: "#2B1A00" },
  secondary: { fill: ["#5A4A3A", "#463626"] as const, edge: "#261D14", text: "#FFFFFF" },
  danger: { fill: ["#FF8A80", "#E53935"] as const, edge: "#8E1B18", text: "#FFFFFF" },
};

/** Mixes a #RRGGBB colour towards white (amount > 0) or black (amount < 0). */
export const shade = (hex: string, amount: number): string => {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  if (!Number.isFinite(n)) return hex;
  const mix = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
};

export const PopButton = ({ label, onPress, variant = "primary", disabled, busy, glyph, icon, art, accessibilityLabel, style, tint }: ButtonProps) => {
  const press = useRef(new Animated.Value(0)).current;
  const c = tint ? { fill: [shade(tint, 0.35), tint] as const, edge: shade(tint, -0.5), text: "#14101F" } : BUTTON_COLORS[variant];
  const to = (v: number) => Animated.timing(press, { toValue: v, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  return (
    <Pressable
      onPress={() => {
        emitSound("UI_TAP");
        onPress();
      }}
      onPressIn={() => to(1)}
      onPressOut={() => to(0)}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof label === "string" ? label : undefined)}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      style={[{ alignSelf: "stretch", opacity: disabled ? 0.5 : 1 }, style]}
    >
      <Animated.View style={{ transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }) }, { translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }) }] }}>
        <LinearGradient colors={c.fill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.button, { borderBottomColor: c.edge }]}>
          <View style={styles.gloss} pointerEvents="none" />
          {busy ? (
            <ActivityIndicator color={c.text} />
          ) : (
            <Text style={[styles.buttonText, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
              {icon ? <Ionicons name={icon} size={15} color={c.text} /> : art ? <GlyphIcon name={art} size={16} /> : null}
              {icon || art ? "  " : ""}
              {glyph ? `${glyph}  ` : ""}
              {typeof label === "string" ? label.toLocaleUpperCase() : label}
            </Text>
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

/** A smaller line of text button (declines, skips). */
export const PopLink = ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => (
  <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={styles.link} hitSlop={6}>
    <Text style={styles.linkText} maxFontSizeMultiplier={1.3}>
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  shadow: { shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 18, elevation: 24, borderRadius: 26 },
  panel: { borderRadius: 26, borderWidth: 2, paddingHorizontal: 20, paddingVertical: 18, alignItems: "center", gap: 12, overflow: "hidden" },
  lit: { position: "absolute", top: 0, left: 22, right: 22, height: 2, borderRadius: 1 },
  stud: { position: "absolute", width: 6, height: 6, borderRadius: 3, opacity: 0.8 },
  titleBox: { alignItems: "center", gap: 6, alignSelf: "stretch" },
  medallion: { width: 52, height: 52, borderRadius: 26, borderWidth: 2.5, alignItems: "center", justifyContent: "center", shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  glyph: { fontSize: 26 },
  title: { fontWeight: "900", fontSize: 20, letterSpacing: 3, textAlign: "center", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  subtitle: { color: "#D6C4B2", fontSize: 12.5, textAlign: "center" },
  rule: { height: 2, width: "70%", alignSelf: "center", marginTop: 2 },
  button: { minHeight: MIN_TOUCH + 4, borderRadius: 16, paddingHorizontal: 16, justifyContent: "center", alignItems: "center", borderBottomWidth: 4, overflow: "hidden", alignSelf: "stretch" },
  gloss: { position: "absolute", top: 0, left: 0, right: 0, height: "48%", backgroundColor: "rgba(255,255,255,0.18)" },
  buttonText: { fontWeight: "900", fontSize: 15, letterSpacing: 1.2 },
  link: { minHeight: MIN_TOUCH, paddingHorizontal: 18, justifyContent: "center" },
  linkText: { color: "#D6C4B2", fontWeight: "800", fontSize: 14, textDecorationLine: "underline" },
});
