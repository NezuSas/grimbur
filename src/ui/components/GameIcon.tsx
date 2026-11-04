import React from "react";
import type { ImageSourcePropType, StyleProp, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SpriteImage from "./SpriteImage";
import { GLYPHS } from "../glyphArt";
import { FORGE_ICONS } from "../forgeArt";

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * The game's things (a trophy, a padlock, a flame, a gem, a skull...) drawn with their painted art;
 * plain controls (chevrons, close, share, settings) stay font icons. An outline name is the same
 * picture faded, the way an empty star or an unlit flame read before.
 */
const PAINTED: Partial<Record<IconName, { art: ImageSourcePropType; faded?: boolean }>> = {
  trophy: { art: GLYPHS.trophy },
  "trophy-outline": { art: GLYPHS.trophy, faded: true },
  "lock-closed": { art: GLYPHS.padlock },
  flame: { art: GLYPHS.flame },
  "flame-outline": { art: GLYPHS.flame, faded: true },
  sparkles: { art: GLYPHS.sparkles },
  flag: { art: GLYPHS.flag },
  star: { art: GLYPHS.star },
  "star-outline": { art: GLYPHS.star, faded: true },
  skull: { art: GLYPHS.skull },
  "skull-outline": { art: GLYPHS.skull },
  infinite: { art: GLYPHS.infinity },
  flash: { art: GLYPHS.bolt },
  diamond: { art: GLYPHS.gem },
  calendar: { art: GLYPHS.calendar },
  hammer: { art: GLYPHS.hammer },
  medal: { art: GLYPHS.medal },
  book: { art: GLYPHS.book },
  brush: { art: GLYPHS.brush },
  shield: { art: GLYPHS.shield },
  compass: { art: FORGE_ICONS.explorer! },
  cash: { art: FORGE_ICONS.purse! },
};

/** Painted art fills less of its box than a font glyph does, so it is drawn a little larger to match. */
const ART_SCALE = 1.2;

type Props = { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> };

const GameIcon = ({ name, size = 16, color, style }: Props) => {
  const painted = PAINTED[name];
  if (!painted) return <Ionicons name={name} size={size} color={color} style={style} />;
  const s = Math.round(size * ART_SCALE);
  return (
    <SpriteImage
      source={painted.art}
      style={[{ width: s, height: s, marginHorizontal: (size - s) / 2, marginVertical: (size - s) / 2 }, painted.faded && { opacity: 0.32 }, style as object]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
};

export default GameIcon;
