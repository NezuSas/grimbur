import React from "react";
import { StyleSheet, View } from "react-native";
import type { ImageSourcePropType, StyleProp, ViewStyle } from "react-native";
import SpriteImage from "./SpriteImage";
import { FRAME_BODY_ART } from "../cosmeticArt";
import type { CosmeticId } from "../../core/cosmetics/cosmetics";

type Props = {
  /** The hero's full figure. */
  source: ImageSourcePropType;
  /** Height of the whole piece; the width follows the frame's 3:4 shape. */
  height: number;
  /** The frame the player wears (none: the hero alone, at the same size). */
  frame?: CosmeticId | null;
  /** Tints the arch's backdrop (the hero's colour). */
  tint?: string;
  style?: StyleProp<ViewStyle>;
  /** Called when every picture in it has loaded (the share card waits for it). */
  onLoadEnd?: () => void;
};

/** Width of a framed hero for a given height (the full-body frames are 3 wide by 4 tall). */
export const framedWidth = (height: number) => Math.round(height * 0.75);

/**
 * The hero standing in the full-body version of the frame the player wears: the same frame as on their portrait in the
 * rankings, drawn as a tall arch around the whole figure. Without a frame the hero stands alone, the same size.
 */
const FramedHero = ({ source, height, frame, tint = "#E8B04A", style, onLoadEnd }: Props) => {
  const art = frame ? FRAME_BODY_ART[frame] : undefined;
  const width = framedWidth(height);
  return (
    <View style={[{ width, height }, style]}>
      {art ? <View style={[styles.backdrop, { backgroundColor: tint + "22", borderTopLeftRadius: width * 0.42, borderTopRightRadius: width * 0.42 }]} /> : null}
      {/* Explicit sizes, never "fill": an image stretched by its edges falls back to its own pixel size on some platforms. */}
      <SpriteImage
        source={source}
        style={art ? { position: "absolute", left: -width * 0.04, top: height * 0.07, width: width * 1.08, height: height * 0.88 } : { width, height }}
        resizeMode="contain"
        onLoadEnd={art ? undefined : onLoadEnd}
        accessibilityIgnoresInvertColors
      />
      {art ? <SpriteImage source={art} style={{ position: "absolute", left: 0, top: 0, width, height }} resizeMode="stretch" onLoadEnd={onLoadEnd} accessibilityIgnoresInvertColors /> : null}
    </View>
  );
};

export default FramedHero;

const styles = StyleSheet.create({
  backdrop: { position: "absolute", left: "9%", right: "9%", top: "7%", bottom: "5%" },
});
