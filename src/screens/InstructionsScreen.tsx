import React, { useState } from "react";
import { BestiaryPane } from "./manual/BestiaryPane";
import { RelicBookPane } from "./manual/RelicBookPane";
import { ChroniclePane } from "./manual/ChroniclePane";
import { EncountersPane } from "./manual/EncountersPane";
import { View, StyleSheet, ScrollView, TouchableOpacity, ImageBackground } from "react-native";
import type { ImageSourcePropType } from "react-native";
import characters from "../data/characters";
import { useWindowDimensions } from "../ui/layout/scaledWindow";
import Text from "../ui/components/Text";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { MIN_TOUCH } from "../ui/layout/useGameLayout";
import { Ionicons } from "@expo/vector-icons";
import GameIcon from "../ui/components/GameIcon";
import { useT } from "../i18n/useT";
import ScreenHeader from "../ui/components/ScreenHeader";
import SpriteImage from "../ui/components/SpriteImage";
import { CategoryNav } from "../ui/components/CategoryNav";
import type { NavItem } from "../ui/components/CategoryNav";
import { BORDER, CARD } from "../ui/components/manual/ManualParts";
import { asKey, buildKit } from "./manual/kit";
import type { TopicId } from "./manual/kit";
import { StartPane } from "./manual/StartPane";
import { TechniquesPane } from "./manual/TechniquesPane";
import { CombatPane, ControlsPane, ExplorePane, HazardsPane, MissionPane, PowerupsPane } from "./manual/BasicsPanes";
import { HeroesPane, RelicsPane, ToolsPane } from "./manual/CollectionPanes";
import { ForgePane, ModesPane, ScoringPane, TipsPane, WorldsPane } from "./manual/ProgressPanes";

type Props = NativeStackScreenProps<RootStackParamList, "InstructionsScreen">;

/** Every topic wears a piece of the game's own painted art, so the guide looks like the game it explains. */
const TOPICS: { id: TopicId; icon: keyof typeof Ionicons.glyphMap; color: string; art: ImageSourcePropType }[] = [
  { id: "start", icon: "rocket", color: "#C9A55A", art: require("../assets/sprites/ui/Icon_Flag.webp") },
  { id: "mission", icon: "flag", color: "#B5524A", art: require("../assets/sprites/enemies/Grimbur_Boss.webp") },
  { id: "controls", icon: "game-controller", color: "#C9A55A", art: require("../assets/sprites/ui/Attack_Ready.webp") },
  { id: "explore", icon: "map", color: "#7FAFC6", art: require("../assets/sprites/tiles/Tile_Hidden.webp") },
  { id: "hazards", icon: "warning", color: "#D49242", art: require("../assets/sprites/tiles/Danger_Vortex.png") },
  { id: "techniques", icon: "bulb", color: "#6CB0B9", art: require("../assets/sprites/ui/Icon_Riddle.webp") },
  { id: "bestiary", icon: "paw", color: "#8EB7B0", art: require("../assets/sprites/enemies/Mimic_Enemy.webp") },
  { id: "combat", icon: "flash", color: "#B5524A", art: require("../assets/sprites/items/Icon_Arrows.webp") },
  { id: "powerups", icon: "shield", color: "#7FAFC6", art: require("../assets/sprites/items/Icon_Shield.webp") },
  { id: "heroes", icon: "people", color: "#C98FA3", art: characters[0].scoreImage },
  { id: "relics", icon: "sparkles", color: "#B08DBE", art: require("../assets/sprites/relics/phoenix.webp") },
  { id: "relicbook", icon: "book", color: "#D6AA48", art: require("../assets/sprites/relics/lantern.webp") },
  { id: "chronicle", icon: "document-text", color: "#e8c07d", art: require("../assets/sprites/ui/Icon_Book.webp") },
  { id: "encounters", icon: "compass", color: "#A3BF7C", art: require("../assets/sprites/encounters/Encounter_Scout.webp") },
  { id: "tools", icon: "construct", color: "#C9A55A", art: require("../assets/sprites/tools/Tool_Bomb.webp") },
  { id: "worlds", icon: "planet", color: "#8EB7B0", art: require("../assets/sprites/achievements/Ach_Depth.webp") },
  { id: "modes", icon: "layers", color: "#7E87B0", art: require("../assets/sprites/achievements/Ach_Endless.webp") },
  { id: "forge", icon: "flame", color: "#C48B4E", art: require("../assets/sprites/ui/Icon_Hammer.webp") },
  { id: "scoring", icon: "trophy", color: "#8EAE7C", art: require("../assets/sprites/ui/Icon_Trophy.webp") },
  { id: "tips", icon: "bulb", color: "#6FA39C", art: require("../assets/sprites/ui/Icon_Star.webp") },
];

const InstructionsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  // Development only (web): `?cat=hazards` opens that topic, for screenshots.
  const devTopic = __DEV__ && typeof location !== "undefined" ? (new URLSearchParams(location.search).get("cat") as TopicId | null) : null;
  const [topic, setTopic] = useState<TopicId>(devTopic ?? route.params?.topic ?? "start");

  const wide = width >= 640;
  const railWidth = Math.min(230, Math.max(180, width * 0.24));

  const topics: NavItem<TopicId>[] = TOPICS.map(x => ({
    id: x.id,
    icon: x.icon,
    tint: x.color,
    art: x.art,
    label: x.id === "start" ? t("manual.nav.start") : t(asKey(`manual.${x.id}.title`)),
  }));
  const index = topics.findIndex(x => x.id === topic);
  const prev = index > 0 ? topics[index - 1] : null;
  const next = index < topics.length - 1 ? topics[index + 1] : null;
  const current = TOPICS[index];

  const kit = buildKit({ t, wide, navigation, current, index, total: topics.length });
  const panes: Record<TopicId, React.ReactNode> = {
    start: <StartPane kit={kit} />,
    mission: <MissionPane kit={kit} />,
    controls: <ControlsPane kit={kit} />,
    explore: <ExplorePane kit={kit} />,
    hazards: <HazardsPane kit={kit} />,
    techniques: <TechniquesPane kit={kit} />,
    bestiary: <BestiaryPane kit={kit} />,
    relicbook: <RelicBookPane kit={kit} />,
    chronicle: <ChroniclePane kit={kit} />,
    encounters: <EncountersPane kit={kit} />,
    combat: <CombatPane kit={kit} />,
    powerups: <PowerupsPane kit={kit} />,
    heroes: <HeroesPane kit={kit} />,
    relics: <RelicsPane kit={kit} />,
    tools: <ToolsPane kit={kit} />,
    worlds: <WorldsPane kit={kit} />,
    modes: <ModesPane kit={kit} />,
    forge: <ForgePane kit={kit} />,
    scoring: <ScoringPane kit={kit} />,
    tips: <TipsPane kit={kit} />,
  };

  const paneBody = (
    <ScrollView key={topic} contentContainerStyle={styles.paneContent} showsVerticalScrollIndicator={false}>
      <View style={styles.paneInner}>
        {panes[topic]}
        {/* Previous / next topic: the guide can be read straight through */}
        <View style={styles.pager}>
          {prev ? (
            <TouchableOpacity style={styles.pagerButton} onPress={() => setTopic(prev.id)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`${t("manual.prev")}: ${prev.label}`}>
              <GameIcon name="chevron-back" size={18} color={prev.tint} />
              {prev.art ? <SpriteImage source={prev.art} style={styles.pagerArt} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.pagerHint} maxFontSizeMultiplier={1.2}>
                  {t("manual.prev").toLocaleUpperCase()}
                </Text>
                <Text style={styles.pagerLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {prev.label}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {next ? (
            <TouchableOpacity style={[styles.pagerButton, styles.pagerNext]} onPress={() => setTopic(next.id)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`${t("manual.next")}: ${next.label}`}>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={styles.pagerHint} maxFontSizeMultiplier={1.2}>
                  {t("manual.next").toLocaleUpperCase()}
                </Text>
                <Text style={styles.pagerLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {next.label}
                </Text>
              </View>
              {next.art ? <SpriteImage source={next.art} style={styles.pagerArt} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
              <GameIcon name="chevron-forward" size={18} color={next.tint} />
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.jpg")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(13, 10, 7,0.9)" }}>
        <ScreenHeader title={t("manual.title")} subtitle={topics[index]?.label} onBack={() => navigation.goBack()} />
        {wide ? (
          <View style={styles.body}>
            <CategoryNav items={topics} value={topic} onChange={setTopic} wide railWidth={railWidth} />
            <View style={{ flex: 1 }}>{paneBody}</View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <CategoryNav items={topics} value={topic} onChange={setTopic} wide={false} />
            {paneBody}
          </View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  body: { flex: 1, flexDirection: "row" },
  paneContent: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 20, alignItems: "center" },
  paneInner: { width: "100%", maxWidth: 720, gap: 14 },
  pager: { flexDirection: "row", gap: 10, marginTop: 6 },
  pagerButton: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: MIN_TOUCH + 8, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  pagerNext: { justifyContent: "flex-end" },
  pagerArt: { width: 30, height: 30 },
  pagerHint: { color: "#B99A7C", fontWeight: "900", fontSize: 11, letterSpacing: 1.2 },
  pagerLabel: { color: "#F3EADB", fontWeight: "800", fontSize: 14 },
});

export default InstructionsScreen;
