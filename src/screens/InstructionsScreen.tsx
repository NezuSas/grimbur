import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  ImageSourcePropType,
  useWindowDimensions,
} from "react-native";
import Text from "../ui/components/Text";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { MIN_TOUCH, useGameLayout } from "../ui/layout/useGameLayout";
import { Ionicons } from "@expo/vector-icons";
import characters from "../data/characters";
import { GAME_CONFIG } from "../config/gameConfig";
import { MAX_ASCENSION } from "../core/engine/ascension";
import type { TranslationKey } from "../i18n/en";
import type { Params } from "../i18n/translate";
import { useT } from "../i18n/useT";
import SpriteImage from "../ui/components/SpriteImage";
import ScreenHeader from "../ui/components/ScreenHeader";

type Props = NativeStackScreenProps<RootStackParamList, "InstructionsScreen">;

type Row = {
  key: string; // `manual.<key>.label|detail|badge`
  badgeColor?: string;
};

type Section = {
  id: string;
  color: string;
  icon?: string;
  image?: ImageSourcePropType;
  visual?: "tiles" | "hazards";
  rows: Row[];
};

const asKey = (key: string) => key as TranslationKey;

const SECTIONS: Section[] = [
  {
    id: "mission",
    color: "#ff5252",
    image: require("../assets/sprites/items/Icon_Gem.png"),
    rows: [
      { key: "manual.mission.goal" },
      { key: "manual.mission.wumpus", badgeColor: "#ff5252" },
      { key: "manual.mission.relics", badgeColor: "#ffd700" },
      { key: "manual.mission.heroes" },
      { key: "manual.mission.depth", badgeColor: "#ff7043" },
      { key: "manual.mission.survival" },
    ],
  },
  {
    id: "controls",
    color: "#ffd54f",
    icon: "🎮",
    rows: [
      { key: "manual.controls.move" },
      { key: "manual.controls.attack" },
      { key: "manual.controls.travel" },
      { key: "manual.controls.flag" },
    ],
  },
  {
    id: "explore",
    color: "#4fc3f7",
    icon: "🗺️",
    visual: "tiles",
    rows: [{ key: "manual.explore.pace" }],
  },
  {
    id: "hazards",
    color: "#ffa726",
    icon: "📡",
    visual: "hazards",
    rows: [
      { key: "manual.hazards.clues" },
      { key: "manual.hazards.stalker", badgeColor: "#ba68c8" },
      { key: "manual.hazards.vortexInfo", badgeColor: "#ce93d8" },
    ],
  },
  {
    id: "combat",
    color: "#ff5252",
    icon: "⚔️",
    rows: [
      { key: "manual.combat.strike" },
      { key: "manual.combat.ammo", badgeColor: "#ef5350" },
      { key: "manual.combat.combo", badgeColor: "#ff7043" },
    ],
  },
  {
    id: "powerups",
    color: "#4fc3f7",
    icon: "🛡️",
    rows: [
      { key: "manual.powerups.shield" },
      { key: "manual.powerups.ammo", badgeColor: "#ffb74d" },
      { key: "manual.powerups.traps", badgeColor: "#ffb74d" },
    ],
  },
  {
    id: "scoring",
    color: "#81c784",
    icon: "🏆",
    rows: [
      { key: "manual.scoring.points" },
      { key: "manual.scoring.board" },
      { key: "manual.scoring.daily", badgeColor: "#4fc3f7" },
      { key: "manual.scoring.pause" },
    ],
  },
];

const TIPS = ["vortex", "shield", "ammo", "route", "wumpus"];

/** Row values that depend on the real game balance, so the copy never drifts from the rules. */
const PARAMS: Params = {
  floors: GAME_CONFIG.expedition.floors,
  hearts: GAME_CONFIG.boss.hp,
  moves: GAME_CONFIG.boss.moveEvery,
  combo: GAME_CONFIG.multipliers.maxCombo,
  ammo: GAME_CONFIG.pickups.ammoAmount,
  trap: Math.abs(GAME_CONFIG.scoring.trapPenalty),
  maxDepth: MAX_ASCENSION,
  stalkerFloor: GAME_CONFIG.stalker.minFloor,
  stalkerMoves: GAME_CONFIG.stalker.moveEvery,
};

const SectionHeader = ({
  title,
  icon,
  image,
  color,
  size,
  open,
  onToggle,
}: {
  title: string;
  icon?: string;
  image?: ImageSourcePropType;
  color: string;
  size: number;
  open: boolean;
  onToggle: () => void;
}) => (
  <TouchableOpacity
    style={styles.sectionHeader}
    onPress={onToggle}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityState={{ expanded: open }}
    accessibilityLabel={title}
  >
    <View style={[styles.iconContainer, { backgroundColor: color + "22" }]}>
      {image ? (
        <SpriteImage source={image} style={styles.sectionImage} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : (
        <Text style={styles.sectionIcon}>{icon}</Text>
      )}
    </View>
    <Text style={[styles.sectionTitle, { fontSize: size, color }]} maxFontSizeMultiplier={1.3} numberOfLines={2}>
      {title.toLocaleUpperCase()}
    </Text>
    <Ionicons name={open ? "chevron-up" : "chevron-down"} size={22} color={color} />
  </TouchableOpacity>
);

const QUICK_STEPS: { image?: ImageSourcePropType; icon?: React.ComponentProps<typeof Ionicons>["name"]; tint?: string }[] = [
  { image: require("../assets/sprites/tiles/Tile_Hidden.png") },
  { icon: "volume-high", tint: "#ffcc80" },
  { image: require("../assets/sprites/items/Icon_Gem.png") },
  { image: require("../assets/sprites/enemies/Wumpus_Boss.png") },
];

const InstructionRow = ({
  label,
  detail,
  badge,
  badgeColor,
  size,
}: {
  label: string;
  detail: string;
  badge?: string;
  badgeColor?: string;
  size: number;
}) => (
  <View style={styles.row}>
    <View style={styles.rowTextContainer}>
      <Text style={[styles.rowLabel, { fontSize: size + 3 }]} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
      <Text style={[styles.rowDetail, { fontSize: size }]} maxFontSizeMultiplier={1.3}>
        {detail}
      </Text>
    </View>
    {badge ? (
      <View style={[styles.valueBadge, { backgroundColor: badgeColor ?? "#81c784" }]}>
        <Text style={styles.valueText} maxFontSizeMultiplier={1.2} numberOfLines={2}>
          {badge.toLocaleUpperCase()}
        </Text>
      </View>
    ) : null}
  </View>
);

const InstructionsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const { spacing, fontSize, insets } = useGameLayout();
  const [open, setOpen] = useState<Record<string, boolean>>({ mission: true, controls: true });
  const toggle = (id: string) => setOpen(prev => ({ ...prev, [id]: !prev[id] }));

  const cardWidth = Math.min(width - Math.max(insets.left, 8) - Math.max(insets.right, 8) - 16, 1000);
  const body = Math.max(13, Math.min(fontSize(15), 17));
  const sectionSize = Math.max(16, Math.min(fontSize(20), 24));

  const tiles = (
    <View style={styles.visualRow}>
      <View style={styles.visualComparison}>
        <View style={styles.visualItem}>
          <SpriteImage source={require("../assets/sprites/tiles/Tile_Hidden.png")} style={styles.visualImage} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Text style={styles.visualText}>{t("manual.explore.hidden").toLocaleUpperCase()}</Text>
        </View>
        <Ionicons name="arrow-forward" size={26} color="#888" style={{ marginHorizontal: 22 }} />
        <View style={styles.visualItem}>
          <SpriteImage source={require("../assets/sprites/tiles/Tile_Revealed.png")} style={styles.visualImage} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Text style={styles.visualText}>{t("manual.explore.revealed").toLocaleUpperCase()}</Text>
        </View>
      </View>
      <Text style={[styles.visualDetail, { fontSize: body }]} maxFontSizeMultiplier={1.3}>
        {t("manual.explore.tiles")}
      </Text>
    </View>
  );

  const hazards = (
    <View style={styles.hazardVisual}>
      <View style={styles.visualItem}>
        <SpriteImage source={require("../assets/sprites/enemies/Guardian_Enemy.png")} style={styles.hazardImage} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Text style={styles.visualText}>{t("manual.hazards.guardian").toLocaleUpperCase()}</Text>
        <View style={[styles.hintIconContainer, { backgroundColor: "#ffcc80" }]}>
          <Ionicons name="volume-high" size={16} color="#bf360c" />
        </View>
      </View>
      <View style={[styles.visualItem, { marginLeft: 40 }]}>
        <SpriteImage source={require("../assets/sprites/tiles/Danger_Vortex.png")} style={styles.hazardImage} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Text style={styles.visualText}>{t("manual.hazards.vortex").toLocaleUpperCase()}</Text>
        <View style={[styles.hintIconContainer, { backgroundColor: "#9c27b0" }]}>
          <Ionicons name="infinite" size={16} color="#fff" />
        </View>
      </View>
    </View>
  );

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)" }}>
        <View style={{ flex: 1, alignItems: "center" }}>
          <ScreenHeader title={t("manual.title")} onBack={() => navigation.goBack()} />

          <View style={[styles.mainCard, { width: cardWidth }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: spacing(50) + insets.bottom }}>
              <Text style={[styles.quickTitle, { fontSize: sectionSize }]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
                {t("manual.quick.title").toLocaleUpperCase()}
              </Text>
              <View style={styles.quickRow}>
                {QUICK_STEPS.map((step, i) => (
                  <View key={i} style={styles.quickStep} accessible accessibilityLabel={`${i + 1}. ${t(asKey(`manual.quick.${i + 1}`))}`}>
                    <View style={styles.quickBadge}>
                      <Text style={styles.quickNumber}>{i + 1}</Text>
                    </View>
                    <View style={styles.quickArt}>
                      {step.image ? (
                        <SpriteImage source={step.image} style={styles.quickImage} resizeMode="contain" accessibilityIgnoresInvertColors />
                      ) : (
                        <View style={[styles.quickIcon, { backgroundColor: step.tint }]}>
                          <Ionicons name={step.icon!} size={24} color="#bf360c" />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.quickText, { fontSize: Math.max(12, body - 2) }]} maxFontSizeMultiplier={1.2}>
                      {t(asKey(`manual.quick.${i + 1}`))}
                    </Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.tutorialButton}
                onPress={() => navigation.navigate("TutorialScreen", { characterIndex: 0, replay: true })}
                accessibilityRole="button"
                accessibilityLabel={t("manual.replayTutorial")}
              >
                <Ionicons name="school-outline" size={20} color="#000" />
                <Text style={styles.tutorialText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
                  {t("manual.replayTutorial").toLocaleUpperCase()}
                </Text>
              </TouchableOpacity>
              <View style={styles.separator} />

              {SECTIONS.map((section, sectionIndex) => (
                <View key={section.id}>
                  {sectionIndex > 0 && <View style={styles.separator} />}
                  <SectionHeader
                    open={!!open[section.id]}
                    onToggle={() => toggle(section.id)}
                    title={t(asKey(`manual.${section.id}.title`))}
                    icon={section.icon}
                    image={section.image}
                    color={section.color}
                    size={sectionSize}
                  />
                  {open[section.id] && section.visual === "tiles" && tiles}
                  {open[section.id] && section.visual === "hazards" && hazards}
                  {open[section.id] && section.rows.map(row => {
                    const badgeKey = asKey(`${row.key}.badge`);
                    const hasBadge = Boolean(t(badgeKey, PARAMS) !== badgeKey);
                    return (
                      <InstructionRow
                        key={row.key}
                        label={t(asKey(`${row.key}.label`), PARAMS)}
                        detail={t(asKey(`${row.key}.detail`), PARAMS)}
                        badge={hasBadge ? t(badgeKey, PARAMS) : undefined}
                        badgeColor={row.badgeColor}
                        size={body}
                      />
                    );
                  })}
                  {open[section.id] && section.id === "hazards" && (
                    <Text style={[styles.note, { fontSize: body - 1 }]} maxFontSizeMultiplier={1.3}>
                      {t("manual.hazards.note")}
                    </Text>
                  )}
                </View>
              ))}

              <View style={styles.separator} />
              <SectionHeader title={t("manual.tips.title")} icon="💡" color="#4db6ac" size={sectionSize} open={!!open.tips} onToggle={() => toggle("tips")} />
              {open.tips && (
              <View style={styles.tipBox}>
                {TIPS.map(tip => (
                  <Text key={tip} style={[styles.tipText, { fontSize: body }]} maxFontSizeMultiplier={1.3}>
                    • <Text style={styles.tipTitle}>{t(asKey(`manual.tips.${tip}.title`))}: </Text>
                    {t(asKey(`manual.tips.${tip}.body`))}
                  </Text>
                ))}
              </View>
              )}

              <SpriteImage source={characters[1].winImage} style={styles.footerImage} resizeMode="contain" accessibilityIgnoresInvertColors />
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  backButton: {
    position: "absolute",
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: MIN_TOUCH / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { color: "#fff", fontWeight: "900", textAlign: "center", letterSpacing: 4 },
  mainCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    marginTop: 12,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 12,
    overflow: "hidden",
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 14, minHeight: MIN_TOUCH + 10 },
  iconContainer: { width: 56, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  sectionImage: { width: 42, height: 42 },
  sectionIcon: { fontSize: 26 },
  sectionTitle: { fontWeight: "900", letterSpacing: 1.5, flexShrink: 1 },
  visualRow: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  visualComparison: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  visualItem: { alignItems: "center", justifyContent: "center" },
  visualImage: { width: 56, height: 56 },
  visualText: { color: "#b0b0b0", fontSize: 11, fontWeight: "900", marginTop: 6, letterSpacing: 1 },
  visualDetail: { color: "#c4c4c4", textAlign: "center", lineHeight: 20 },
  hazardVisual: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
  },
  hazardImage: { width: 56, height: 56 },
  hintIconContainer: {
    marginTop: 6,
    padding: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  note: { color: "#a9a9a9", fontStyle: "italic", marginTop: 2 },
  tipBox: {
    backgroundColor: "rgba(77, 182, 172, 0.06)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(77, 182, 172, 0.2)",
    gap: 10,
  },
  tipText: { color: "#d4d4d4", lineHeight: 22 },
  tipTitle: { fontWeight: "900", color: "#80cbc4" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 10 },
  rowTextContainer: { flex: 1 },
  rowLabel: { color: "#fff", fontWeight: "800" },
  rowDetail: { color: "#b8b8b8", fontWeight: "500", marginTop: 4, lineHeight: 21 },
  valueBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, maxWidth: 110, alignSelf: "flex-start" },
  valueText: { color: "#000", fontWeight: "900", fontSize: 11, textAlign: "center" },
  separator: { height: 1, backgroundColor: "rgba(255, 255, 255, 0.05)", marginVertical: 22 },
  quickTitle: { color: "#FFD54F", fontWeight: "900", letterSpacing: 1.5, marginBottom: 12 },
  quickRow: { flexDirection: "row", gap: 8 },
  quickStep: { flex: 1, alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  quickBadge: { position: "absolute", top: 6, left: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFD54F", alignItems: "center", justifyContent: "center" },
  quickNumber: { color: "#1a1030", fontWeight: "900", fontSize: 12 },
  quickArt: { height: 64, alignItems: "center", justifyContent: "center" },
  quickImage: { width: 60, height: 60 },
  quickIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#ef6c00" },
  quickText: { color: "#e4e0f4", textAlign: "center", fontWeight: "700" },
  tutorialButton: {
    marginTop: 14,
    minHeight: MIN_TOUCH,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFD700",
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  tutorialText: { color: "#000", fontWeight: "900", letterSpacing: 1 },
  footerImage: { width: 80, height: 80, alignSelf: "center", opacity: 0.8, marginTop: 20 },
});

export default InstructionsScreen;
