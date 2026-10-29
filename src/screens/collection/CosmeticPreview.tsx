import React, { useEffect, useRef } from "react";
import { Animated, Easing, ImageBackground, StyleSheet, View } from "react-native";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import { cosmeticInfo, type CosmeticId } from "../../core/cosmetics/cosmetics";
import { BIOME_ART } from "../../ui/biomeArt";
import { BOARD_BIOME, FRAME_ART, TRAIL_LOOKS } from "../../ui/cosmeticArt";
import { useSettingsStore } from "../../state/settings/store";
import { useT } from "../../i18n/useT";
import { cosmeticText } from "../../i18n/keys";
import type { ImageSourcePropType } from "react-native";

type Props = {
  id: CosmeticId;
  /** The box the preview fills (a square of this side). */
  size: number;
  /** The player's own portrait (frames go around it, titles under it). */
  portrait: ImageSourcePropType;
  /** The player's name, for the title preview. */
  playerName?: string;
  /** Small previews (grid cards) skip the moving parts and the text. */
  small?: boolean;
};

/** A trail's arrow gliding back and forth with its wake (still when calm or small). */
const TrailPreview = ({ id, size, small }: { id: CosmeticId; size: number; small?: boolean }) => {
  const calm = useSettingsStore(s => s.reduceFlash);
  const look = TRAIL_LOOKS[id]!;
  const glide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (calm || small) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glide, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glide, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [calm, small, glide]);
  const w = size * 0.95;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {!small
        ? [0, 1, 2, 3, 4].map(i => (
            <View
              key={i}
              style={{ position: "absolute", left: size * (0.08 + i * 0.07), top: size * 0.5 - size * 0.02 + (i % 2 ? -1 : 1) * size * 0.05, width: size * 0.05, height: size * 0.05, borderRadius: size, backgroundColor: look.colors[i % 2], opacity: 0.3 + i * 0.12 }}
            />
          ))
        : null}
      <Animated.View style={{ transform: [{ translateX: glide.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.05, size * 0.05] }) }] }}>
        <SpriteImage source={look.arrow} style={{ width: w, height: w / 3 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Animated.View>
    </View>
  );
};

/** What a cosmetic looks like, as the player will see it: an arrow in flight, a framed portrait, a title, a patch of floor. */
const CosmeticPreview = ({ id, size, portrait, playerName, small }: Props) => {
  const { t } = useT();
  const kind = cosmeticInfo(id).kind;
  if (kind === "trail") return <TrailPreview id={id} size={size} small={small} />;
  if (kind === "frame") {
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: size * 0.66, height: size * 0.66, borderRadius: size, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.35)" }}>
          <SpriteImage source={portrait} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors />
        </View>
        <SpriteImage source={FRAME_ART[id]!} style={[StyleSheet.absoluteFill, { width: size, height: size }]} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
    );
  }
  if (kind === "title") {
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", gap: size * 0.04 }}>
        <View style={{ width: size * (small ? 0.5 : 0.42), height: size * (small ? 0.5 : 0.42), borderRadius: size, overflow: "hidden", borderWidth: 2, borderColor: "rgba(232,176,74,0.7)" }}>
          <SpriteImage source={portrait} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors />
        </View>
        {!small && playerName ? (
          <Text style={[styles.titleName, { fontSize: Math.max(12, size * 0.075) }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
            {playerName}
          </Text>
        ) : null}
        <View style={[styles.titlePlate, { paddingHorizontal: size * 0.05 }]}>
          <Text style={[styles.titleText, { fontSize: Math.max(small ? 9 : 12, size * (small ? 0.09 : 0.07)) }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>
            {cosmeticText(t, id).toLocaleUpperCase()}
          </Text>
        </View>
      </View>
    );
  }
  // A board theme: a two-by-two patch of its floor (unexplored and explored) on its backdrop.
  const art = BIOME_ART[BOARD_BIOME[id]!];
  const tile = size * 0.34;
  return (
    <ImageBackground source={art.background} style={{ width: size, height: size, alignItems: "center", justifyContent: "center", borderRadius: 16, overflow: "hidden" }} resizeMode="cover">
      <View style={{ width: tile * 2, flexDirection: "row", flexWrap: "wrap" }}>
        {[art.tileHidden, art.tileRevealed, art.tileRevealed, art.tileHidden].map((src, i) => (
          <SpriteImage key={i} source={src} style={{ width: tile, height: tile }} resizeMode="stretch" accessibilityIgnoresInvertColors />
        ))}
      </View>
    </ImageBackground>
  );
};

export default CosmeticPreview;

const styles = StyleSheet.create({
  titleName: { color: "#fff", fontWeight: "900" },
  titlePlate: { borderRadius: 8, paddingVertical: 3, backgroundColor: "rgba(40,26,10,0.9)", borderWidth: 1.5, borderColor: "#E8B04A", maxWidth: "100%" },
  titleText: { color: "#FFD54F", fontWeight: "900", letterSpacing: 1 },
});
