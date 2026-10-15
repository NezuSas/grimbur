import React, { useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, ImageSourcePropType, useWindowDimensions } from "react-native";
import Text from "../ui/components/Text";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { MIN_TOUCH } from "../ui/layout/useGameLayout";
import { Ionicons } from "@expo/vector-icons";
import characters from "../data/characters";
import { GAME_CONFIG } from "../config/gameConfig";
import { MAX_ASCENSION } from "../core/engine/ascension";
import type { TranslationKey } from "../i18n/en";
import type { Params } from "../i18n/translate";
import { abilityCooldown, MAX_ITEMS } from "../core/engine/shop";
import { LESSON_IDS } from "../core/tutorial/lessons";
import { useT } from "../i18n/useT";
import SpriteImage from "../ui/components/SpriteImage";
import { TOOL_ART } from "../ui/toolArt";
import ScreenHeader from "../ui/components/ScreenHeader";
import { CategoryNav } from "../ui/components/CategoryNav";
import type { NavItem } from "../ui/components/CategoryNav";

type Props = NativeStackScreenProps<RootStackParamList, "InstructionsScreen">;

type Row = {
  key: string; // `manual.<key>.label|detail|badge`
  badgeColor?: string;
};

type Section = {
  id: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  image?: ImageSourcePropType;
  visual?: "tiles" | "hazards";
  rows: Row[];
};

const asKey = (key: string) => key as TranslationKey;

const SECTIONS: Section[] = [
  {
    id: "mission",
    color: "#ff5252",
    icon: "flag",
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
    icon: "game-controller",
    rows: [{ key: "manual.controls.move" }, { key: "manual.controls.attack" }, { key: "manual.controls.travel" }, { key: "manual.controls.flag" }],
  },
  {
    id: "explore",
    color: "#4fc3f7",
    icon: "map",
    visual: "tiles",
    rows: [{ key: "manual.explore.pace" }],
  },
  {
    id: "hazards",
    color: "#ffa726",
    icon: "warning",
    visual: "hazards",
    rows: [
      { key: "manual.hazards.clues" },
      { key: "manual.hazards.stalker", badgeColor: "#ba68c8" },
      { key: "manual.hazards.sleeper", badgeColor: "#90a4ae" },
      { key: "manual.hazards.vortexInfo", badgeColor: "#ce93d8" },
    ],
  },
  {
    id: "combat",
    color: "#ff5252",
    icon: "flash",
    rows: [{ key: "manual.combat.strike" }, { key: "manual.combat.ammo", badgeColor: "#ef5350" }, { key: "manual.combat.combo", badgeColor: "#ff7043" }],
  },
  {
    id: "powerups",
    color: "#4fc3f7",
    icon: "shield",
    rows: [{ key: "manual.powerups.shield" }, { key: "manual.powerups.ammo", badgeColor: "#ffb74d" }, { key: "manual.powerups.traps", badgeColor: "#ffb74d" }],
  },
  {
    id: "tools",
    color: "#ffd54f",
    icon: "construct",
    image: TOOL_ART.detector,
    rows: [
      { key: "manual.tools.shop", badgeColor: "#4fc3f7" },
      { key: "manual.tools.ability", badgeColor: "#81c784" },
      { key: "manual.tools.items", badgeColor: "#ffb74d" },
      { key: "manual.tools.undo", badgeColor: "#ba68c8" },
      { key: "manual.tools.cursed", badgeColor: "#ef5350" },
      { key: "manual.tools.caves", badgeColor: "#4dd0e1" },
    ],
  },
  {
    id: "forge",
    color: "#ffab40",
    icon: "flame",
    rows: [
      { key: "manual.forge.embers", badgeColor: "#ffab40" },
      { key: "manual.forge.upgrades", badgeColor: "#ffd54f" },
      { key: "manual.forge.relics" },
      { key: "manual.forge.daily", badgeColor: "#4fc3f7" },
    ],
  },
  {
    id: "scoring",
    color: "#81c784",
    icon: "trophy",
    rows: [{ key: "manual.scoring.points" }, { key: "manual.scoring.board" }, { key: "manual.scoring.daily", badgeColor: "#4fc3f7" }, { key: "manual.scoring.pause" }],
  },
];

const TIPS = ["vortex", "shield", "ammo", "route", "wumpus"];
const START_COLOR = "#FFD54F";
const TIPS_COLOR = "#4db6ac";

/** Row values that depend on the real game balance, so the copy never drifts from the rules. */
const PARAMS: Params = {
  floors: GAME_CONFIG.expedition.floors,
  hearts: GAME_CONFIG.boss.hp,
  moves: GAME_CONFIG.boss.moveEvery,
  combo: GAME_CONFIG.multipliers.maxCombo,
  ammo: GAME_CONFIG.pickups.ammoAmount,
  trap: Math.abs(GAME_CONFIG.scoring.trapPenalty),
  maxDepth: MAX_ASCENSION,
  stalkerFloor: GAME_CONFIG.stalker.earlyFloor,
  stalkerMoves: GAME_CONFIG.stalker.moveEvery,
  sleeperFloor: GAME_CONFIG.sleeper.minFloor,
  sleeperWake: GAME_CONFIG.sleeper.wakeDistance,
  cooldown: `${abilityCooldown("scout")}-${abilityCooldown("brace")}`,
  maxItems: MAX_ITEMS,
};

const QUICK_STEPS: { image?: ImageSourcePropType; icon?: React.ComponentProps<typeof Ionicons>["name"]; tint?: string }[] = [
  { image: require("../assets/sprites/tiles/Tile_Hidden.png") },
  { icon: "volume-high", tint: "#ffcc80" },
  { image: require("../assets/sprites/items/Icon_Gem.png") },
  { image: require("../assets/sprites/enemies/Wumpus_Boss.png") },
];

type TopicId = "start" | (typeof SECTIONS)[number]["id"] | "tips";

/** One fact of a topic: a card with an accent bar, a short title, the explanation and, sometimes, a coloured tag. */
const FactCard = ({ label, detail, badge, color }: { label: string; detail: string; badge?: string; color: string }) => (
  <View style={styles.fact}>
    <View style={[styles.factBar, { backgroundColor: color }]} />
    <View style={styles.factBody}>
      <View style={styles.factHead}>
        <Text style={styles.factLabel} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
        {badge ? (
          <View style={[styles.tag, { backgroundColor: color + "2E", borderColor: color + "AA" }]}>
            <Text style={[styles.tagText, { color }]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
              {badge.toLocaleUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.factDetail} maxFontSizeMultiplier={1.3}>
        {detail}
      </Text>
    </View>
  </View>
);

const InstructionsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  // Development only (web): `?cat=hazards` opens that topic, for screenshots.
  const devTopic = __DEV__ && typeof location !== "undefined" ? (new URLSearchParams(location.search).get("cat") as TopicId | null) : null;
  const [topic, setTopic] = useState<TopicId>(devTopic ?? "start");

  const wide = width >= 640;
  const railWidth = Math.min(230, Math.max(180, width * 0.24));

  const topics: (NavItem<TopicId> & { image?: ImageSourcePropType })[] = [
    { id: "start", icon: "rocket", tint: START_COLOR, label: t("manual.nav.start") },
    ...SECTIONS.map(s => ({ id: s.id as TopicId, icon: s.icon, tint: s.color, label: t(asKey(`manual.${s.id}.title`)) })),
    { id: "tips", icon: "bulb", tint: TIPS_COLOR, label: t("manual.tips.title") },
  ];
  const index = topics.findIndex(x => x.id === topic);
  const prev = index > 0 ? topics[index - 1] : null;
  const next = index < topics.length - 1 ? topics[index + 1] : null;
  const current = topics[index];

  const tiles = (
    <View style={styles.visual}>
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
      <Text style={styles.visualDetail} maxFontSizeMultiplier={1.3}>
        {t("manual.explore.tiles")}
      </Text>
    </View>
  );

  const hazards = (
    <View style={[styles.visual, { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 40 }]}>
      <View style={styles.visualItem}>
        <SpriteImage source={require("../assets/sprites/enemies/Guardian_Enemy.png")} style={styles.visualImage} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Text style={styles.visualText}>{t("manual.hazards.guardian").toLocaleUpperCase()}</Text>
        <View style={[styles.hintIconContainer, { backgroundColor: "#ffcc80" }]}>
          <Ionicons name="volume-high" size={16} color="#bf360c" />
        </View>
      </View>
      <View style={styles.visualItem}>
        <SpriteImage source={require("../assets/sprites/tiles/Danger_Vortex.png")} style={styles.visualImage} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Text style={styles.visualText}>{t("manual.hazards.vortex").toLocaleUpperCase()}</Text>
        <View style={[styles.hintIconContainer, { backgroundColor: "#9c27b0" }]}>
          <Ionicons name="infinite" size={16} color="#fff" />
        </View>
      </View>
    </View>
  );

  /** The big heading of a topic: its colour, its icon and where it sits in the guide. */
  const heading = (color: string, icon: keyof typeof Ionicons.glyphMap, image: ImageSourcePropType | undefined, title: string) => (
    <View style={styles.heading}>
      <View style={[styles.headingChip, { backgroundColor: color + "26", borderColor: color + "77" }]}>
        {image ? <SpriteImage source={image} style={{ width: 40, height: 40 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : <Ionicons name={icon} size={30} color={color} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headingTitle, { color }]} accessibilityRole="header" numberOfLines={2} maxFontSizeMultiplier={1.3}>
          {title.toLocaleUpperCase()}
        </Text>
        <Text style={styles.headingCount} maxFontSizeMultiplier={1.2}>
          {index + 1} / {topics.length}
        </Text>
      </View>
    </View>
  );

  const startPane = (
    <>
      {heading(START_COLOR, "rocket", undefined, t("manual.quick.title"))}
      <View style={styles.steps}>
        {QUICK_STEPS.map((step, i) => (
          <View key={i} style={[styles.step, !wide && styles.stepNarrow]} accessible accessibilityLabel={`${i + 1}. ${t(asKey(`manual.quick.${i + 1}`))}`}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{i + 1}</Text>
            </View>
            <View style={styles.stepArt}>
              {step.image ? (
                <SpriteImage source={step.image} style={{ width: 58, height: 58 }} resizeMode="contain" accessibilityIgnoresInvertColors />
              ) : (
                <View style={[styles.stepIcon, { backgroundColor: step.tint }]}>
                  <Ionicons name={step.icon!} size={24} color="#bf360c" />
                </View>
              )}
            </View>
            <Text style={styles.stepText} maxFontSizeMultiplier={1.2}>
              {t(asKey(`manual.quick.${i + 1}`))}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.cta}
        onPress={() => navigation.navigate("TutorialScreen", { characterIndex: 0, replay: true })}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t("manual.replayTutorial")}
      >
        <Ionicons name="school" size={22} color="#1a1200" />
        <Text style={styles.ctaText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
          {t("manual.replayTutorial").toLocaleUpperCase()}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#1a1200" />
      </TouchableOpacity>

      <View>
        <Text style={styles.lessonsTitle} maxFontSizeMultiplier={1.2}>
          {t("manual.lessons").toLocaleUpperCase()}
        </Text>
        <Text style={styles.lessonsHint} maxFontSizeMultiplier={1.2}>
          {t("manual.lessons.hint")}
        </Text>
        <View style={styles.lessons}>
          {LESSON_IDS.map(id => (
            <TouchableOpacity
              key={id}
              style={[styles.lesson, wide && styles.lessonWide]}
              onPress={() => navigation.navigate("LessonScreen", { lesson: id })}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${t(asKey(`lesson.${id}.title`))}. ${t(asKey(`lesson.${id}.desc`))}`}
            >
              <View style={styles.lessonPlay}>
                <Ionicons name="play" size={18} color="#1a1200" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lessonName} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {t(asKey(`lesson.${id}.title`))}
                </Text>
                <Text style={styles.lessonDesc} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                  {t(asKey(`lesson.${id}.desc`))}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <SpriteImage source={characters[1].winImage} style={styles.footerImage} resizeMode="contain" accessibilityIgnoresInvertColors />
    </>
  );

  const section = SECTIONS.find(s => s.id === topic);
  const sectionPane = section ? (
    <>
      {heading(section.color, section.icon, section.image, t(asKey(`manual.${section.id}.title`)))}
      {section.visual === "tiles" && tiles}
      {section.visual === "hazards" && hazards}
      {section.rows.map(row => {
        const badgeKey = asKey(`${row.key}.badge`);
        const hasBadge = Boolean(t(badgeKey, PARAMS) !== badgeKey);
        return (
          <FactCard
            key={row.key}
            label={t(asKey(`${row.key}.label`), PARAMS)}
            detail={t(asKey(`${row.key}.detail`), PARAMS)}
            badge={hasBadge ? t(badgeKey, PARAMS) : undefined}
            color={row.badgeColor ?? section.color}
          />
        );
      })}
      {section.id === "hazards" && (
        <Text style={styles.note} maxFontSizeMultiplier={1.3}>
          {t("manual.hazards.note")}
        </Text>
      )}
    </>
  ) : null;

  const tipsPane = (
    <>
      {heading(TIPS_COLOR, "bulb", undefined, t("manual.tips.title"))}
      {TIPS.map(tip => (
        <View key={tip} style={styles.tip}>
          <View style={styles.tipIcon}>
            <Ionicons name="bulb" size={18} color={TIPS_COLOR} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle} maxFontSizeMultiplier={1.3}>
              {t(asKey(`manual.tips.${tip}.title`))}
            </Text>
            <Text style={styles.factDetail} maxFontSizeMultiplier={1.3}>
              {t(asKey(`manual.tips.${tip}.body`))}
            </Text>
          </View>
        </View>
      ))}
    </>
  );

  const pane = topic === "start" ? startPane : topic === "tips" ? tipsPane : sectionPane;

  const paneBody = (
    <ScrollView contentContainerStyle={styles.paneContent} showsVerticalScrollIndicator={false}>
      <View style={styles.paneInner}>
        {pane}
        {/* Previous / next topic: the guide can be read straight through */}
        <View style={styles.pager}>
          {prev ? (
            <TouchableOpacity style={styles.pagerButton} onPress={() => setTopic(prev.id)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`${t("manual.prev")}: ${prev.label}`}>
              <Ionicons name="chevron-back" size={18} color={prev.tint} />
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
              <Ionicons name="chevron-forward" size={18} color={next.tint} />
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(6,4,16,0.9)" }}>
        <ScreenHeader title={t("manual.title")} subtitle={current ? current.label : undefined} onBack={() => navigation.goBack()} />
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

const CARD = "rgba(18,14,38,0.9)";
const BORDER = "rgba(255,255,255,0.09)";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  body: { flex: 1, flexDirection: "row" },
  paneContent: { paddingHorizontal: 14, paddingVertical: 14, alignItems: "center" },
  paneInner: { width: "100%", maxWidth: 720, gap: 14 },
  heading: { flexDirection: "row", alignItems: "center", gap: 14 },
  headingChip: { width: 60, height: 60, borderRadius: 18, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  headingTitle: { fontWeight: "900", fontSize: 22, letterSpacing: 1.5 },
  headingCount: { color: "#8f8aab", fontWeight: "800", fontSize: 12, letterSpacing: 1.5, marginTop: 2 },
  fact: { flexDirection: "row", backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },
  factBar: { width: 5 },
  factBody: { flex: 1, padding: 14, gap: 6 },
  factHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  factLabel: { flex: 1, color: "#fff", fontWeight: "900", fontSize: 16 },
  factDetail: { color: "#c3bedb", fontSize: 14.5, lineHeight: 21 },
  tag: { maxWidth: 140, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  tagText: { fontWeight: "900", fontSize: 10.5, letterSpacing: 0.8, textAlign: "center" },
  visual: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, alignItems: "center" },
  visualComparison: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  visualItem: { alignItems: "center", justifyContent: "center" },
  visualImage: { width: 64, height: 64 },
  visualText: { color: "#b0b0b0", fontSize: 11, fontWeight: "900", marginTop: 6, letterSpacing: 1 },
  visualDetail: { color: "#c4c4c4", textAlign: "center", lineHeight: 21, fontSize: 14.5 },
  hintIconContainer: { marginTop: 6, padding: 4, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  note: { color: "#a9a9a9", fontStyle: "italic", fontSize: 13.5, paddingHorizontal: 4 },
  steps: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  step: { flex: 1, minWidth: 120, alignItems: "center", gap: 8, backgroundColor: CARD, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: BORDER },
  stepNarrow: { flexBasis: "46%", flexGrow: 1 },
  stepNumber: { position: "absolute", top: 8, left: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: START_COLOR, alignItems: "center", justifyContent: "center" },
  stepNumberText: { color: "#1a1030", fontWeight: "900", fontSize: 13 },
  stepArt: { height: 66, alignItems: "center", justifyContent: "center" },
  stepIcon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#ef6c00" },
  stepText: { color: "#e4e0f4", textAlign: "center", fontWeight: "800", fontSize: 13.5, lineHeight: 18 },
  cta: { minHeight: MIN_TOUCH + 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: START_COLOR, borderRadius: 18, paddingHorizontal: 18, borderBottomWidth: 4, borderBottomColor: "rgba(0,0,0,0.3)" },
  ctaText: { color: "#1a1200", fontWeight: "900", letterSpacing: 1.5, fontSize: 15, flexShrink: 1 },
  lessonsTitle: { color: START_COLOR, fontWeight: "900", letterSpacing: 2, fontSize: 13 },
  lessonsHint: { color: "#a9a3c6", fontSize: 13, marginTop: 2 },
  lessons: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  lesson: { flexBasis: "100%", flexDirection: "row", alignItems: "center", gap: 12, minHeight: MIN_TOUCH + 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  lessonWide: { flexBasis: "48.5%", flexGrow: 1 },
  lessonPlay: { width: 38, height: 38, borderRadius: 19, backgroundColor: START_COLOR, alignItems: "center", justifyContent: "center" },
  lessonName: { color: "#fff", fontWeight: "900", fontSize: 14.5 },
  lessonDesc: { color: "#b4aed0", fontSize: 12.5, marginTop: 1 },
  footerImage: { width: 84, height: 84, alignSelf: "center", opacity: 0.85 },
  tip: { flexDirection: "row", gap: 12, backgroundColor: "rgba(77,182,172,0.08)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(77,182,172,0.28)", padding: 14 },
  tipIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(77,182,172,0.18)", alignItems: "center", justifyContent: "center" },
  tipTitle: { color: "#80cbc4", fontWeight: "900", fontSize: 15, marginBottom: 2 },
  pager: { flexDirection: "row", gap: 10, marginTop: 6 },
  pagerButton: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: MIN_TOUCH + 8, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  pagerNext: { justifyContent: "flex-end" },
  pagerHint: { color: "#8f8aab", fontWeight: "900", fontSize: 10.5, letterSpacing: 1.5 },
  pagerLabel: { color: "#fff", fontWeight: "800", fontSize: 14 },
});

export default InstructionsScreen;
