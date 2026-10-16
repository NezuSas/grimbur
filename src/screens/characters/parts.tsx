import { memo, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useT } from "../../i18n/useT";
import { heroText, skinText } from "../../i18n/keys";
import SpriteImage from "../../ui/components/SpriteImage";
import { SKIN_ACCENT, skinArt, type SkinId } from "../../data/skinArt";
import { heroAccent } from "../../data/heroAccent";

/** A few motes of the hero's colour that rise behind it, so the stage feels alive. */
export const SPARKS = [
  { x: 0.16, duration: 3200, delay: 0, size: 5 },
  { x: 0.3, duration: 2600, delay: 700, size: 4 },
  { x: 0.44, duration: 3600, delay: 300, size: 6 },
  { x: 0.58, duration: 2900, delay: 1200, size: 4 },
  { x: 0.7, duration: 3300, delay: 500, size: 5 },
  { x: 0.84, duration: 2700, delay: 1500, size: 4 },
] as const;

export const Spark = ({ color, x, duration, delay, size, rise }: { color: string; x: number; duration: number; delay: number; size: number; rise: number }) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, duration, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        bottom: 24,
        left: `${x * 100}%`,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] }),
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -rise] }) }],
      }}
    />
  );
};

type ThumbProps = { heroIndex: number; skin: SkinId; selected: boolean; locked: boolean; size: number; onPress: (heroIndex: number) => void };

/** A small round portrait in the roster under the stage: the selected one is bigger and ringed in its colour. */
export const Thumb = memo(({ heroIndex, skin, selected, locked, size, onPress }: ThumbProps) => {
  const { t } = useT();
  const accent = heroAccent(heroIndex);
  const box = selected ? size + 12 : size;
  const name = heroText(t, heroIndex, "name");
  return (
    <TouchableOpacity
      onPress={() => onPress(heroIndex)}
      activeOpacity={0.8}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={t("heroes.rosterItem", { name, state: locked ? t("heroes.state.locked") : t("heroes.state.open") })}
      style={[
        styles.thumb,
        { width: box, height: box, borderRadius: box / 2, borderColor: selected ? accent : "rgba(255,255,255,0.22)", borderWidth: selected ? 3 : 1.5 },
        selected && { shadowColor: accent, shadowOpacity: 0.9, shadowRadius: 12, elevation: 10, backgroundColor: accent + "33" },
      ]}
    >
      <SpriteImage
        source={skinArt(heroIndex, skin).scoreImage}
        style={{ width: box * 0.82, height: box * 0.82, borderRadius: box * 0.41, ...(locked ? { tintColor: "#0b0716" } : null) }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      {locked && (
        <View style={styles.thumbLock}>
          <Ionicons name="lock-closed" size={Math.max(10, size * 0.3)} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
});

type SwatchProps = { heroIndex: number; skin: SkinId; previewing: boolean; owned: boolean; equipped: boolean; onPress: (skin: SkinId) => void };

/**
 * One outfit in the picker: a round chip in the outfit's colour with a check when it is worn. The selection ring is the
 * border of a fixed-size wrapper (not a scale or a shadow, which Android and iOS draw differently and which made the ring
 * spill out of the chip), so every state takes exactly the same space.
 */
export const SWATCH = 32;
export const RING = 3;
export const Swatch = memo(({ heroIndex, skin, previewing, owned, equipped, onPress }: SwatchProps) => {
  const { t } = useT();
  const color = skin === "classic" ? heroAccent(heroIndex) : SKIN_ACCENT[skin];
  const box = SWATCH + (RING + 2) * 2;
  return (
    <TouchableOpacity
      onPress={() => onPress(skin)}
      activeOpacity={0.8}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
      accessibilityRole="button"
      accessibilityState={{ selected: previewing }}
      accessibilityLabel={`${skinText(t, skin)}. ${owned ? (equipped ? t("skin.equipped") : t("skin.owned")) : t("heroes.state.locked")}`}
      style={[styles.swatchRing, { width: box, height: box, borderRadius: box / 2, borderColor: previewing ? "#fff" : "transparent" }]}
    >
      <View style={[styles.swatch, { backgroundColor: color + (owned ? "" : "55") }]}>
        {!owned && <Ionicons name="lock-closed" size={13} color="#fff" />}
        {equipped && <Ionicons name="checkmark" size={18} color="#111" />}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  thumb: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)", overflow: "visible" },
  thumbLock: { position: "absolute", right: -2, bottom: -2, backgroundColor: "#1a1030", borderRadius: 10, padding: 3, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" },

  swatchRing: { borderWidth: RING, alignItems: "center", justifyContent: "center" },
  swatch: { width: SWATCH, height: SWATCH, borderRadius: SWATCH / 2, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
