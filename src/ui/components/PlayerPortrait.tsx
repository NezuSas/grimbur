import React from "react";
import { StyleSheet, View } from "react-native";
import type { ImageSourcePropType, StyleProp, ViewStyle } from "react-native";
import Text from "./Text";
import SpriteImage from "./SpriteImage";
import { parseLook } from "../../core/cosmetics/look";
import { FRAME_ART } from "../cosmeticArt";
import { useT } from "../../i18n/useT";
import { cosmeticText } from "../../i18n/keys";

/** A player's portrait as others see it: inside their painted frame when they wear one. */
export const PlayerPortrait = ({ source, size, frame, style }: { source: ImageSourcePropType; size: number; frame?: unknown; style?: StyleProp<ViewStyle> }) => {
  const look = parseLook({ frame });
  const art = look.frame ? FRAME_ART[look.frame] : undefined;
  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      <View style={{ width: art ? size * 0.68 : size, height: art ? size * 0.68 : size, borderRadius: size, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.08)" }}>
        <SpriteImage source={source} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors />
      </View>
      {art ? <SpriteImage source={art} style={[StyleSheet.absoluteFill, { width: size, height: size }]} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
    </View>
  );
};

/** A player's title, a small gold plate (nothing when they wear none or the row carries something unknown). */
export const PlayerTitle = ({ title }: { title?: unknown }) => {
  const { t } = useT();
  const look = parseLook({ title });
  if (!look.title) return null;
  return (
    <View style={styles.plate}>
      <Text style={styles.plateText} numberOfLines={1} maxFontSizeMultiplier={1.1}>
        {cosmeticText(t, look.title).toLocaleUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  plate: { alignSelf: "flex-start", marginTop: 2, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: "rgba(40,26,10,0.9)", borderWidth: 1, borderColor: "#E8B04A" },
  plateText: { color: "#FFD54F", fontWeight: "900", fontSize: 9.5, letterSpacing: 0.8 },
});
