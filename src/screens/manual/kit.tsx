import React from "react";
import { ImageSourcePropType, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import { Art, FactCard } from "../../ui/components/manual/ManualParts";
import { GAME_CONFIG } from "../../config/gameConfig";
import { MAX_ASCENSION } from "../../core/engine/ascension";
import { abilityCooldown, MAX_ITEMS } from "../../core/engine/shop";
import { FREEZE_EVERY_DAYS, MAX_FREEZES } from "../../core/stats/runStats";
import type { RootStackParamList } from "../../navigation/types";
import type { TranslationKey } from "../../i18n/en";
import type { Params } from "../../i18n/translate";
import type { useT } from "../../i18n/useT";
import { manualStyles as styles } from "./styles";

export const asKey = (key: string) => key as TranslationKey;

export type TopicId =
  | "start"
  | "mission"
  | "controls"
  | "explore"
  | "hazards"
  | "combat"
  | "powerups"
  | "heroes"
  | "relics"
  | "tools"
  | "worlds"
  | "modes"
  | "forge"
  | "scoring"
  | "tips";

export const S = GAME_CONFIG.scoring;
/** Row values that depend on the real game balance, so the copy never drifts from the rules. */
export const PARAMS: Params = {
  floors: GAME_CONFIG.expedition.floors,
  hearts: GAME_CONFIG.boss.hp,
  moves: GAME_CONFIG.boss.moveEvery,
  calls: GAME_CONFIG.boss.maxCalls,
  combo: GAME_CONFIG.multipliers.maxCombo,
  ammo: GAME_CONFIG.pickups.ammoAmount,
  carry: GAME_CONFIG.arrows.carryOverCap,
  trap: Math.abs(S.trapPenalty),
  miss: Math.abs(S.missPenalty),
  step: Math.abs(S.stepCost),
  newTile: S.newTile,
  pickup: S.pickup,
  maxDepth: MAX_ASCENSION,
  stalkerFloor: GAME_CONFIG.stalker.earlyFloor,
  stalkerMoves: GAME_CONFIG.stalker.moveEvery,
  sleeperFloor: GAME_CONFIG.sleeper.minFloor,
  sleeperWake: GAME_CONFIG.sleeper.wakeDistance,
  cooldown: `${abilityCooldown("scout")}-${abilityCooldown("brace")}`,
  maxItems: MAX_ITEMS,
  days: FREEZE_EVERY_DAYS,
  max: MAX_FREEZES,
};

export const IMG = {
  gem: require("../../assets/sprites/items/Icon_Gem.png"),
  shield: require("../../assets/sprites/items/Icon_Shield.png"),
  arrows: require("../../assets/sprites/items/Icon_Arrows.png"),
  boss: require("../../assets/sprites/enemies/Grimbur_Boss.png"),
  guardian: require("../../assets/sprites/enemies/Guardian_Enemy.png"),
  stalker: require("../../assets/sprites/enemies/Stalker_Enemy.png"),
  sleeper: require("../../assets/sprites/enemies/Sleeper_Enemy.png"),
  vortex: require("../../assets/sprites/tiles/Danger_Vortex.png"),
  trap: require("../../assets/sprites/tiles/Trap_Sprung.png"),
  hidden: require("../../assets/sprites/tiles/Tile_Hidden.png"),
  revealed: require("../../assets/sprites/tiles/Tile_Revealed.png"),
} as const;

/** What every topic of the guide is handed: the translator, the layout and the helpers that build its cards. */
export type Kit = {
  t: ReturnType<typeof useT>["t"];
  /** The screen is wide enough for two columns of cards. */
  wide: boolean;
  navigation: NativeStackScreenProps<RootStackParamList, "InstructionsScreen">["navigation"];
  /** The big heading of a topic: its colour, its icon and where it sits in the guide. */
  heading: (title: string) => React.ReactNode;
  /** A card built from the keys `<base>.label|detail|badge`. */
  fact: (base: string, color: string, art?: React.ReactNode) => React.ReactNode;
  icon: (name: keyof typeof Ionicons.glyphMap, tint: string) => React.ReactNode;
  image: (source: ImageSourcePropType, tint?: string) => React.ReactNode;
  tileWith: (source: ImageSourcePropType, glyph: keyof typeof Ionicons.glyphMap, tint: string) => React.ReactNode;
};

type Frame = {
  t: Kit["t"];
  wide: boolean;
  navigation: Kit["navigation"];
  /** The topic being shown: its icon and colour. */
  current: { icon: keyof typeof Ionicons.glyphMap; color: string; art?: ImageSourcePropType };
  /** Its place in the guide (0-based) and how many topics there are. */
  index: number;
  total: number;
};

export function buildKit({ t, wide, navigation, current, index, total }: Frame): Kit {
  const fact: Kit["fact"] = (base, color, art) => {
    const badgeKey = asKey(`${base}.badge`);
    const hasBadge = t(badgeKey, PARAMS) !== badgeKey;
    return <FactCard key={base} label={t(asKey(`${base}.label`), PARAMS)} detail={t(asKey(`${base}.detail`), PARAMS)} badge={hasBadge ? t(badgeKey, PARAMS) : undefined} color={color} art={art} />;
  };
  const heading: Kit["heading"] = title => (
    <View style={frame.heading}>
      {current.art ? (
        <View style={frame.headingArt}>
          <View style={[frame.headingGlow, { backgroundColor: current.color }]} />
          <SpriteImage source={current.art} style={{ width: 56, height: 56 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
      ) : (
        <View style={[frame.headingChip, { backgroundColor: current.color + "26", borderColor: current.color + "77" }]}>
          <Ionicons name={current.icon} size={30} color={current.color} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[frame.headingTitle, { color: current.color }]} accessibilityRole="header" numberOfLines={2} maxFontSizeMultiplier={1.3}>
          {title.toLocaleUpperCase()}
        </Text>
        <Text style={frame.headingCount} maxFontSizeMultiplier={1.2}>
          {index + 1} / {total}
        </Text>
      </View>
    </View>
  );
  const icon: Kit["icon"] = (name, tint) => <Art icon={name} tint={tint} />;
  const image: Kit["image"] = (source, tint = "#FFD54F") => <Art image={source} tint={tint} />;
  const tileWith: Kit["tileWith"] = (source, glyph, tint) => (
    <Art tint={tint}>
      <SpriteImage source={source} style={{ width: 44, height: 44 }} resizeMode="stretch" accessibilityIgnoresInvertColors />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.overlayGlyph}>
          <Ionicons name={glyph} size={24} color={tint} />
        </View>
      </View>
    </Art>
  );
  return { t, wide, navigation, heading, fact, icon, image, tileWith };
}

const frame = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "center", gap: 14 },
  headingChip: { width: 60, height: 60, borderRadius: 18, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  headingArt: { width: 60, height: 60, alignItems: "center", justifyContent: "center" },
  headingGlow: { position: "absolute", width: 56, height: 56, borderRadius: 28, opacity: 0.16 },
  headingTitle: { fontWeight: "900", fontSize: 22, letterSpacing: 1.5 },
  headingCount: { color: "#B99A7C", fontWeight: "800", fontSize: 12, letterSpacing: 1.5, marginTop: 2 },
});
