import React, { memo, useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Text from "./Text";
import { haptic } from "../../shared/haptics";
import { emitSound } from "../../audio/audioEventBus";

type Props = {
  title: string;
  subtitle: string;
  /** A short line under the button (best score). */
  footnote?: string;
  onPress: () => void;
  /** Size factor for big screens. */
  ui?: number;
  /** Stops the breathing glow (reduced motion). */
  calm?: boolean;
  /** Short windows: a single-line subtitle and a lower button. */
  compact?: boolean;
};

/**
 * The one thing the cover is for: a large, filled, glowing PLAY button. Everything else on the cover is smaller
 * and quieter, so a new player never has to decide where to tap first.
 */
const PlayButton: React.FC<Props> = memo(({ title, subtitle, footnote, onPress, ui = 1, calm = false, compact = false }) => {
  const press = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (calm) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [calm, glow]);

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ transform: [{ scale: press }] }}>
        <Pressable
          onPress={() => {
            emitSound("UI_TAP");
            onPress();
          }}
          onPressIn={() => {
            haptic.impact();
            Animated.spring(press, { toValue: 0.97, useNativeDriver: true }).start();
          }}
          onPressOut={() => Animated.spring(press, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${subtitle}`}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.halo,
              { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] }), borderRadius: 26 * ui },
            ]}
          />
          <LinearGradient
            colors={["#F7D774", "#E8A93A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.button, { minHeight: (compact ? 62 : 76) * ui, borderRadius: 22 * ui, paddingHorizontal: 18 * ui }]}
          >
            <View style={[styles.playIcon, { width: 46 * ui, height: 46 * ui, borderRadius: 23 * ui }]}>
              <Ionicons name="play" size={26 * ui} color="#E8A93A" style={{ marginLeft: 3 * ui }} />
            </View>
            <View style={styles.texts}>
              <Text style={[styles.title, { fontSize: (compact ? 24 : 28) * ui }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.15}>
                {title.toLocaleUpperCase()}
              </Text>
              <Text style={[styles.subtitle, { fontSize: 12 * ui, lineHeight: 15 * ui }]} numberOfLines={compact ? 1 : 2} maxFontSizeMultiplier={1.15}>
                {subtitle}
              </Text>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
      {footnote ? (
        <Text style={styles.footnote} numberOfLines={1} maxFontSizeMultiplier={1.15}>
          {footnote}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  halo: { position: "absolute", left: -5, right: -5, top: -5, bottom: -5, borderWidth: 3, borderColor: "#F7D774" },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 4,
    borderBottomColor: "#B07A1C",
    shadowColor: "#F2C14E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 12,
  },
  playIcon: { backgroundColor: "#1a1030", alignItems: "center", justifyContent: "center" },
  texts: { flex: 1, gap: 1 },
  title: { color: "#1a1030", fontWeight: "900", letterSpacing: 4 },
  subtitle: { color: "rgba(26,16,48,0.82)", fontWeight: "600" },
  footnote: { color: "#d9d3f0", fontSize: 12, fontWeight: "700", textAlign: "center", letterSpacing: 0.5 },
});

export default PlayButton;
