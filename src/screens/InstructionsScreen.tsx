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
import { coinValue, levelClearBonus } from "../core/engine/scoring";
import type { ShopItem } from "../core/engine/shop";
import { HEROES } from "../core/engine/heroes";
import { RELICS, NORMAL_RELICS, CURSED_RELICS } from "../core/engine/relics";
import type { RelicId } from "../core/engine/relics";
import { UPGRADES } from "../core/stats/forge";
import { FREEZE_EVERY_DAYS, MAX_FREEZES } from "../core/stats/runStats";
import { LESSON_IDS } from "../core/tutorial/lessons";
import { useT } from "../i18n/useT";
import { forgeText, heroText, omenText, relicText, unlockText } from "../i18n/keys";
import SpriteImage from "../ui/components/SpriteImage";
import RelicIcon from "../ui/components/RelicIcon";
import JoystickBase from "../ui/components/JoystickBase";
import { ABILITY_ART, ALTAR_ART, SHOP_ART, TOOL_ART } from "../ui/toolArt";
import { BIOME_ART } from "../ui/biomeArt";
import ScreenHeader from "../ui/components/ScreenHeader";
import { CategoryNav } from "../ui/components/CategoryNav";
import type { NavItem } from "../ui/components/CategoryNav";
import { Art, BORDER, CARD, ClueExample, FactCard, ScoreTable, SubHeading } from "../ui/components/manual/ManualParts";

type Props = NativeStackScreenProps<RootStackParamList, "InstructionsScreen">;

const asKey = (key: string) => key as TranslationKey;

type TopicId =
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

const TOPICS: { id: TopicId; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: "start", icon: "rocket", color: "#FFD54F" },
  { id: "mission", icon: "flag", color: "#ff5252" },
  { id: "controls", icon: "game-controller", color: "#ffd54f" },
  { id: "explore", icon: "map", color: "#4fc3f7" },
  { id: "hazards", icon: "warning", color: "#ffa726" },
  { id: "combat", icon: "flash", color: "#ff5252" },
  { id: "powerups", icon: "shield", color: "#4fc3f7" },
  { id: "heroes", icon: "people", color: "#f48fb1" },
  { id: "relics", icon: "sparkles", color: "#ce93d8" },
  { id: "tools", icon: "construct", color: "#ffd54f" },
  { id: "worlds", icon: "planet", color: "#80cbc4" },
  { id: "modes", icon: "layers", color: "#7986cb" },
  { id: "forge", icon: "flame", color: "#ffab40" },
  { id: "scoring", icon: "trophy", color: "#81c784" },
  { id: "tips", icon: "bulb", color: "#4db6ac" },
];

const TIPS = ["vortex", "shield", "ammo", "route", "wumpus", "flags", "known", "turn", "shop", "forge"];
const START_COLOR = "#FFD54F";

const S = GAME_CONFIG.scoring;
/** Row values that depend on the real game balance, so the copy never drifts from the rules. */
const PARAMS: Params = {
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

const QUICK_STEPS: { image?: ImageSourcePropType; icon?: React.ComponentProps<typeof Ionicons>["name"]; tint?: string }[] = [
  { image: require("../assets/sprites/tiles/Tile_Hidden.png") },
  { icon: "volume-high", tint: "#ffcc80" },
  { image: require("../assets/sprites/items/Icon_Gem.png") },
  { image: require("../assets/sprites/enemies/Wumpus_Boss.png") },
];

const IMG = {
  gem: require("../assets/sprites/items/Icon_Gem.png"),
  shield: require("../assets/sprites/items/Icon_Shield.png"),
  arrows: require("../assets/sprites/items/Icon_Arrows.png"),
  boss: require("../assets/sprites/enemies/Wumpus_Boss.png"),
  guardian: require("../assets/sprites/enemies/Guardian_Enemy.png"),
  stalker: require("../assets/sprites/enemies/Stalker_Enemy.png"),
  sleeper: require("../assets/sprites/enemies/Sleeper_Enemy.png"),
  vortex: require("../assets/sprites/tiles/Danger_Vortex.png"),
  trap: require("../assets/sprites/tiles/Trap_Sprung.png"),
  hidden: require("../assets/sprites/tiles/Tile_Hidden.png"),
  revealed: require("../assets/sprites/tiles/Tile_Revealed.png"),
} as const;

const InstructionsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  // Development only (web): `?cat=hazards` opens that topic, for screenshots.
  const devTopic = __DEV__ && typeof location !== "undefined" ? (new URLSearchParams(location.search).get("cat") as TopicId | null) : null;
  const [topic, setTopic] = useState<TopicId>(devTopic ?? "start");

  const wide = width >= 640;
  const railWidth = Math.min(230, Math.max(180, width * 0.24));

  const topics: NavItem<TopicId>[] = TOPICS.map(x => ({
    id: x.id,
    icon: x.icon,
    tint: x.color,
    label: x.id === "start" ? t("manual.nav.start") : t(asKey(`manual.${x.id}.title`)),
  }));
  const index = topics.findIndex(x => x.id === topic);
  const prev = index > 0 ? topics[index - 1] : null;
  const next = index < topics.length - 1 ? topics[index + 1] : null;
  const current = TOPICS[index];

  /** A card built from the keys `<base>.label|detail|badge`. */
  const fact = (base: string, color: string, art?: React.ReactNode) => {
    const badgeKey = asKey(`${base}.badge`);
    const hasBadge = t(badgeKey, PARAMS) !== badgeKey;
    return <FactCard key={base} label={t(asKey(`${base}.label`), PARAMS)} detail={t(asKey(`${base}.detail`), PARAMS)} badge={hasBadge ? t(badgeKey, PARAMS) : undefined} color={color} art={art} />;
  };

  /** The big heading of a topic: its colour, its icon and where it sits in the guide. */
  const heading = (title: string) => (
    <View style={styles.heading}>
      <View style={[styles.headingChip, { backgroundColor: current.color + "26", borderColor: current.color + "77" }]}>
        <Ionicons name={current.icon} size={30} color={current.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headingTitle, { color: current.color }]} accessibilityRole="header" numberOfLines={2} maxFontSizeMultiplier={1.3}>
          {title.toLocaleUpperCase()}
        </Text>
        <Text style={styles.headingCount} maxFontSizeMultiplier={1.2}>
          {index + 1} / {topics.length}
        </Text>
      </View>
    </View>
  );

  const icon = (name: keyof typeof Ionicons.glyphMap, tint: string) => <Art icon={name} tint={tint} />;
  const image = (source: ImageSourcePropType, tint = "#FFD54F") => <Art image={source} tint={tint} />;
  const tileWith = (source: ImageSourcePropType, glyph: keyof typeof Ionicons.glyphMap, tint: string) => (
    <Art tint={tint}>
      <SpriteImage source={source} style={{ width: 44, height: 44 }} resizeMode="stretch" accessibilityIgnoresInvertColors />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.overlayGlyph}>
          <Ionicons name={glyph} size={24} color={tint} />
        </View>
      </View>
    </Art>
  );

  // ── Start ────────────────────────────────────────────────────────────────────────────────────────────────
  const startPane = (
    <>
      {heading(t("manual.quick.title"))}
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

  // ── Mission ──────────────────────────────────────────────────────────────────────────────────────────────
  const missionPane = (
    <>
      {heading(t("manual.mission.title"))}
      {fact("manual.mission.goal", "#ff5252", image(IMG.gem, "#4fc3f7"))}
      {fact("manual.mission.currency", "#ffab40", icon("flame", "#ffab40"))}
      {fact("manual.mission.survival", "#ef5350", icon("skull", "#ef5350"))}
      {fact("manual.mission.wumpus", "#ff5252", image(IMG.boss, "#ba68c8"))}
      {fact("manual.mission.relics", "#ffd700", <Art tint="#ffd700"><RelicIcon id="lantern" size={44} /></Art>)}
      {fact("manual.mission.heroes", "#f48fb1", image(characters[0].scoreImage, "#f48fb1"))}
    </>
  );

  // ── Controls ─────────────────────────────────────────────────────────────────────────────────────────────
  const controlsPane = (
    <>
      {heading(t("manual.controls.title"))}
      {fact(
        "manual.controls.move",
        "#ffd54f",
        <Art tint="#ffd54f">
          <JoystickBase skin="console" radius={25} thumb={{ x: 9, y: -2 }} active={null} />
        </Art>,
      )}
      {fact(
        "manual.controls.attack",
        "#ff7043",
        <Art tint="#ff7043">
          <View style={styles.attackDot}>
            <Ionicons name="flash" size={22} color="#fff" />
          </View>
        </Art>,
      )}
      {fact("manual.controls.travel", "#4fc3f7", tileWith(IMG.revealed, "footsteps", "#fff"))}
      {fact("manual.controls.flag", "#ef5350", tileWith(IMG.hidden, "flag", "#ff5252"))}
      {fact("manual.controls.ability", "#81c784", image(ABILITY_ART.scout, "#81c784"))}
    </>
  );

  // ── Explore ──────────────────────────────────────────────────────────────────────────────────────────────
  const explorePane = (
    <>
      {heading(t("manual.explore.title"))}
      <View style={styles.visual}>
        <View style={styles.visualComparison}>
          <View style={styles.visualItem}>
            <SpriteImage source={IMG.hidden} style={styles.visualImage} resizeMode="contain" accessibilityIgnoresInvertColors />
            <Text style={styles.visualText}>{t("manual.explore.hidden").toLocaleUpperCase()}</Text>
          </View>
          <Ionicons name="arrow-forward" size={26} color="#888" style={{ marginHorizontal: 22 }} />
          <View style={styles.visualItem}>
            <SpriteImage source={IMG.revealed} style={styles.visualImage} resizeMode="contain" accessibilityIgnoresInvertColors />
            <Text style={styles.visualText}>{t("manual.explore.revealed").toLocaleUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.visualDetail} maxFontSizeMultiplier={1.3}>
          {t("manual.explore.tiles")}
        </Text>
      </View>
      {fact("manual.explore.gems", "#4fc3f7", image(IMG.gem, "#4fc3f7"))}
      {fact("manual.explore.clue", "#ffa726", icon("volume-high", "#ffa726"))}
      <ClueExample hidden={IMG.hidden} revealed={IMG.revealed} caption={t("manual.explore.clue.example")} />
      {fact("manual.explore.pace", "#81c784", icon("footsteps", "#81c784"))}
    </>
  );

  // ── Hazards ──────────────────────────────────────────────────────────────────────────────────────────────
  const hazardsPane = (
    <>
      {heading(t("manual.hazards.title"))}
      <View style={[styles.visual, { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 40 }]}>
        <View style={styles.visualItem}>
          <SpriteImage source={IMG.guardian} style={styles.visualImage} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Text style={styles.visualText}>{t("manual.hazards.guardian").toLocaleUpperCase()}</Text>
          <View style={[styles.hintIconContainer, { backgroundColor: "#ffcc80" }]}>
            <Ionicons name="volume-high" size={16} color="#bf360c" />
          </View>
        </View>
        <View style={styles.visualItem}>
          <SpriteImage source={IMG.vortex} style={styles.visualImage} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Text style={styles.visualText}>{t("manual.hazards.vortex").toLocaleUpperCase()}</Text>
          <View style={[styles.hintIconContainer, { backgroundColor: "#9c27b0" }]}>
            <Ionicons name="infinite" size={16} color="#fff" />
          </View>
        </View>
      </View>
      {fact("manual.hazards.guardianInfo", "#ef5350", image(IMG.guardian, "#ef5350"))}
      {fact("manual.hazards.stalker", "#ba68c8", image(IMG.stalker, "#ba68c8"))}
      {fact("manual.hazards.sleeper", "#90a4ae", image(IMG.sleeper, "#90a4ae"))}
      {fact("manual.hazards.vortexInfo", "#ce93d8", image(IMG.vortex, "#ce93d8"))}
      <Text style={styles.note} maxFontSizeMultiplier={1.3}>
        {t("manual.hazards.note")}
      </Text>
    </>
  );

  // ── Combat ───────────────────────────────────────────────────────────────────────────────────────────────
  const combatPane = (
    <>
      {heading(t("manual.combat.title"))}
      {fact("manual.combat.strike", "#ff5252", image(IMG.arrows, "#ff5252"))}
      {fact("manual.combat.turn", "#ffa726", icon("hourglass", "#ffa726"))}
      {fact("manual.combat.ammo", "#ef5350", image(IMG.arrows, "#ef5350"))}
      {fact("manual.combat.combo", "#ff7043", icon("trending-up", "#ff7043"))}
    </>
  );

  // ── Pickups and traps ────────────────────────────────────────────────────────────────────────────────────
  const powerupsPane = (
    <>
      {heading(t("manual.powerups.title"))}
      {fact("manual.powerups.gem", "#4fc3f7", image(IMG.gem, "#4fc3f7"))}
      {fact("manual.powerups.shield", "#4fc3f7", image(IMG.shield, "#4fc3f7"))}
      {fact("manual.powerups.ammo", "#ffb74d", image(IMG.arrows, "#ffb74d"))}
      {fact("manual.powerups.traps", "#ffb74d", image(IMG.trap, "#ffb74d"))}
    </>
  );

  // ── Heroes ───────────────────────────────────────────────────────────────────────────────────────────────
  const heroesPane = (
    <>
      {heading(t("manual.heroes.title"))}
      {fact("manual.heroes.intro", "#f48fb1", icon("people", "#f48fb1"))}
      {HEROES.map((hero, i) => {
        const ability = hero.perks.ability;
        const lock = unlockText(t, i);
        return (
          <View key={i} style={styles.hero}>
            <View style={styles.heroTop}>
              <SpriteImage source={characters[i].scoreImage} style={styles.heroPortrait} resizeMode="cover" accessibilityIgnoresInvertColors />
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName} maxFontSizeMultiplier={1.3}>
                  {heroText(t, i, "name")}
                </Text>
                <Text style={styles.heroTitle} maxFontSizeMultiplier={1.3}>
                  {heroText(t, i, "title")}
                </Text>
              </View>
              <View style={[styles.lockChip, !lock && styles.lockFree]}>
                <Ionicons name={lock ? "lock-closed" : "checkmark-circle"} size={14} color={lock ? "#ffcc80" : "#a5d6a7"} />
                <Text style={[styles.lockText, !lock && { color: "#a5d6a7" }]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                  {lock || t("skin.tier.free")}
                </Text>
              </View>
            </View>
            <View style={styles.heroLine}>
              <View style={styles.heroTag}>
                <Text style={styles.heroTagText}>{t("manual.heroes.perk").toLocaleUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLineTitle} maxFontSizeMultiplier={1.3}>
                  {heroText(t, i, "perk")}
                </Text>
                <Text style={styles.heroLineBody} maxFontSizeMultiplier={1.3}>
                  {heroText(t, i, "desc")}
                </Text>
              </View>
            </View>
            {ability ? (
              <View style={styles.heroLine}>
                <SpriteImage source={ABILITY_ART[ability]} style={styles.abilityIcon} resizeMode="contain" accessibilityIgnoresInvertColors />
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroLineTitle} maxFontSizeMultiplier={1.3}>
                    {t(asKey(`ability.${ability}.name`))} · {t("manual.heroes.recharge", { n: abilityCooldown(ability) })}
                  </Text>
                  <Text style={styles.heroLineBody} maxFontSizeMultiplier={1.3}>
                    {t(asKey(`ability.${ability}.desc`))}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </>
  );

  // ── Relics and omens ─────────────────────────────────────────────────────────────────────────────────────
  const relicCard = (id: RelicId) => {
    const cursed = RELICS[id].cursed;
    return (
      <View key={id} style={[styles.relic, wide && styles.relicWide, cursed && styles.relicCursed]}>
        <Art size={48} tint={cursed ? "#ef5350" : "#ce93d8"}>
          <RelicIcon id={id} size={38} />
        </Art>
        <View style={{ flex: 1 }}>
          <Text style={styles.relicName} maxFontSizeMultiplier={1.3}>
            {relicText(t, id, "name")}
            {cursed ? `  ·  ${t("relic.cursed").toUpperCase()}` : ""}
          </Text>
          <Text style={styles.relicDesc} maxFontSizeMultiplier={1.3}>
            {relicText(t, id, "desc")}
          </Text>
        </View>
      </View>
    );
  };
  const omenIcons: Record<string, { icon: keyof typeof Ionicons.glyphMap; tint: string }> = {
    bounty: { icon: "cash", tint: "#FFD54F" },
    calm: { icon: "leaf", tint: "#81C784" },
    arsenal: { icon: "flash", tint: "#FF7043" },
  };
  const relicsPane = (
    <>
      {heading(t("manual.relics.title"))}
      {fact("manual.relics.intro", "#ce93d8", <Art tint="#ce93d8"><RelicIcon id="quiver" size={44} /></Art>)}
      <SubHeading text={t("manual.relics.all")} color="#ce93d8" />
      <View style={styles.relicGrid}>{NORMAL_RELICS.map(relicCard)}</View>
      {fact("manual.tools.cursed", "#ef5350", icon("skull", "#ef5350"))}
      <View style={styles.relicGrid}>{CURSED_RELICS.map(relicCard)}</View>
      <SubHeading text={t("manual.relics.omens.label")} color="#ffd54f" />
      {fact("manual.relics.omens", "#ffd54f", icon("partly-sunny", "#ffd54f"))}
      {(["bounty", "calm", "arsenal"] as const).map(id => (
        <FactCard key={id} label={omenText(t, id, "name")} detail={omenText(t, id, "rule")} color={omenIcons[id].tint} art={icon(omenIcons[id].icon, omenIcons[id].tint)} />
      ))}
    </>
  );

  // ── Shop, tools and abilities ────────────────────────────────────────────────────────────────────────────
  const shopItems: ShopItem[] = ["arrows", "shield", "detector", "bomb"];
  const toolsPane = (
    <>
      {heading(t("manual.tools.title"))}
      {fact("manual.tools.shop", "#4fc3f7", icon("cart", "#4fc3f7"))}
      <View style={styles.relicGrid}>
        {shopItems.map(item => (
          <View key={item} style={[styles.relic, wide && styles.relicWide]}>
            <Art size={48} tint="#4fc3f7" image={SHOP_ART[item]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.relicName} maxFontSizeMultiplier={1.3}>
                {t(asKey(`shop.${item}.name`))}
              </Text>
              <Text style={styles.relicDesc} maxFontSizeMultiplier={1.3}>
                {t(asKey(`shop.${item}.desc`))}
              </Text>
            </View>
          </View>
        ))}
      </View>
      {fact("manual.tools.doors", "#ffd54f", icon("git-branch", "#ffd54f"))}
      {fact("manual.tools.altar", "#ce93d8", image(ALTAR_ART, "#ce93d8"))}
      {fact("manual.tools.ability", "#81c784", image(ABILITY_ART.volley, "#81c784"))}
      {fact("manual.tools.items", "#ffb74d", image(TOOL_ART.detector, "#ffb74d"))}
      {fact("manual.tools.undo", "#ba68c8", image(TOOL_ART.undo, "#ba68c8"))}
    </>
  );

  // ── Caves and the Wumpus ─────────────────────────────────────────────────────────────────────────────────
  const worldsPane = (
    <>
      {heading(t("manual.worlds.title"))}
      {fact("manual.worlds.intro", "#80cbc4", icon("planet", "#80cbc4"))}
      {fact("manual.worlds.cave", "#a1887f", image(BIOME_ART.cave.tileRevealed, "#a1887f"))}
      {fact("manual.worlds.crystal", "#4fc3f7", image(BIOME_ART.crystal.tileRevealed, "#4fc3f7"))}
      {fact("manual.worlds.magma", "#ff7043", image(BIOME_ART.magma.tileRevealed, "#ff7043"))}
      {fact("manual.worlds.lair", "#ba68c8", image(BIOME_ART.lair.tileRevealed, "#ba68c8"))}
      {fact("manual.worlds.boss", "#ff5252", image(IMG.boss, "#ff5252"))}
      {fact("manual.worlds.fury", "#ff7043", icon("flame", "#ff7043"))}
      {fact("manual.worlds.calls", "#ba68c8", image(IMG.stalker, "#ba68c8"))}
    </>
  );

  // ── Modes ────────────────────────────────────────────────────────────────────────────────────────────────
  const modesPane = (
    <>
      {heading(t("manual.modes.title"))}
      {fact("manual.modes.expedition", "#7986cb", icon("map", "#7986cb"))}
      {fact("manual.modes.daily", "#4fc3f7", icon("calendar", "#4fc3f7"))}
      {fact("manual.modes.streak", "#ffab40", icon("flame", "#ffab40"))}
      {fact("manual.modes.endless", "#ce93d8", icon("infinite", "#ce93d8"))}
      {fact("manual.modes.depth", "#ef5350", icon("speedometer", "#ef5350"))}
      <View style={{ gap: 8 }}>
        {Array.from({ length: MAX_ASCENSION }, (_, k) => k + 1).map(n => (
          <View key={n} style={styles.depthRow}>
            <View style={styles.depthNumber}>
              <Text style={styles.depthNumberText}>{n}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLineTitle} maxFontSizeMultiplier={1.3}>
                {t(asKey(`ascension.label.${n}`))}
              </Text>
              <Text style={styles.heroLineBody} maxFontSizeMultiplier={1.3}>
                {t(asKey(`ascension.${n}`))}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );

  // ── Forge and rewards ────────────────────────────────────────────────────────────────────────────────────
  const upgradeGroups = [
    { id: "power", label: t("forge.cat.power"), color: "#ff7043" },
    { id: "economy", label: t("forge.cat.economy"), color: "#ffd54f" },
    { id: "relics", label: t("forge.cat.relics"), color: "#ce93d8" },
  ] as const;
  const forgePane = (
    <>
      {heading(t("manual.forge.title"))}
      {fact("manual.forge.embers", "#ffab40", icon("flame", "#ffab40"))}
      {fact("manual.forge.upgrades", "#ffd54f", icon("hammer", "#ffd54f"))}
      <SubHeading text={t("manual.forge.all")} color="#ffd54f" />
      {upgradeGroups.map(group => (
        <View key={group.id} style={{ gap: 8 }}>
          <Text style={[styles.groupTitle, { color: group.color }]} maxFontSizeMultiplier={1.2}>
            {group.label.toLocaleUpperCase()}
          </Text>
          <View style={styles.relicGrid}>
            {UPGRADES.filter(u => u.category === group.id).map(u => (
              <View key={u.id} style={[styles.relic, wide && styles.relicWide]}>
                <Art size={44} tint={group.color}>
                  {u.relic ? <RelicIcon id={u.relic} size={34} /> : <Text style={styles.upgradeEmoji}>{u.icon}</Text>}
                </Art>
                <View style={{ flex: 1 }}>
                  <Text style={styles.relicName} maxFontSizeMultiplier={1.3}>
                    {forgeText(t, u.id, "name")}
                  </Text>
                  <Text style={styles.relicDesc} maxFontSizeMultiplier={1.3}>
                    {forgeText(t, u.id, "desc")}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
      {fact("manual.forge.daily", "#4fc3f7", icon("calendar", "#4fc3f7"))}
      {fact("manual.forge.collection", "#f48fb1", icon("shirt", "#f48fb1"))}
      {fact("manual.forge.achievements", "#81c784", icon("ribbon", "#81c784"))}
    </>
  );

  // ── Score and ranking ────────────────────────────────────────────────────────────────────────────────────
  const scoringPane = (
    <>
      {heading(t("manual.scoring.title"))}
      {fact("manual.scoring.points", "#81c784", icon("star", "#81c784"))}
      <ScoreTable
        rows={[
          { label: t("manual.score.tile"), value: `+${S.newTile}`, good: true },
          { label: t("manual.score.gem"), value: `+${coinValue(1)}`, good: true, note: t("manual.score.gemValue", { top: coinValue(GAME_CONFIG.expedition.floors) }) },
          { label: t("manual.score.kill"), value: `+${S.killEnemy}`, good: true, note: t("manual.score.killValue", { max: S.killEnemy * GAME_CONFIG.multipliers.maxCombo }) },
          { label: t("manual.score.pickup"), value: `+${S.pickup}`, good: true },
          { label: t("manual.score.clear"), value: `+${levelClearBonus(1)}`, good: true, note: t("manual.score.clearValue", { top: levelClearBonus(GAME_CONFIG.expedition.floors - 1) }) },
          { label: t("manual.score.bossHit"), value: `+${GAME_CONFIG.boss.hitScore}`, good: true },
          { label: t("manual.score.bossKill"), value: `+${GAME_CONFIG.boss.killScore}`, good: true },
          { label: t("manual.score.step"), value: `${S.stepCost}`, good: false },
          { label: t("manual.score.miss"), value: `${S.missPenalty}`, good: false },
          { label: t("manual.score.trap"), value: `${S.trapPenalty}`, good: false },
        ]}
      />
      {fact("manual.scoring.board", "#ffd54f", icon("podium", "#ffd54f"))}
      {fact("manual.scoring.pause", "#90a4ae", icon("pause-circle", "#90a4ae"))}
    </>
  );

  // ── Tips ─────────────────────────────────────────────────────────────────────────────────────────────────
  const tipsPane = (
    <>
      {heading(t("manual.tips.title"))}
      {TIPS.map(tip => (
        <View key={tip} style={styles.tip}>
          <View style={styles.tipIcon}>
            <Ionicons name="bulb" size={18} color="#4db6ac" />
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

  const panes: Record<TopicId, React.ReactNode> = {
    start: startPane,
    mission: missionPane,
    controls: controlsPane,
    explore: explorePane,
    hazards: hazardsPane,
    combat: combatPane,
    powerups: powerupsPane,
    heroes: heroesPane,
    relics: relicsPane,
    tools: toolsPane,
    worlds: worldsPane,
    modes: modesPane,
    forge: forgePane,
    scoring: scoringPane,
    tips: tipsPane,
  };

  const paneBody = (
    <ScrollView key={topic} contentContainerStyle={styles.paneContent} showsVerticalScrollIndicator={false}>
      <View style={styles.paneInner}>
        {panes[topic]}
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
  paneContent: { paddingHorizontal: 14, paddingVertical: 14, alignItems: "center" },
  paneInner: { width: "100%", maxWidth: 720, gap: 14 },
  heading: { flexDirection: "row", alignItems: "center", gap: 14 },
  headingChip: { width: 60, height: 60, borderRadius: 18, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  headingTitle: { fontWeight: "900", fontSize: 22, letterSpacing: 1.5 },
  headingCount: { color: "#8f8aab", fontWeight: "800", fontSize: 12, letterSpacing: 1.5, marginTop: 2 },
  factDetail: { color: "#c3bedb", fontSize: 14.5, lineHeight: 21 },
  visual: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, alignItems: "center" },
  visualComparison: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  visualItem: { alignItems: "center", justifyContent: "center" },
  visualImage: { width: 64, height: 64 },
  visualText: { color: "#b0b0b0", fontSize: 11, fontWeight: "900", marginTop: 6, letterSpacing: 1 },
  visualDetail: { color: "#c4c4c4", textAlign: "center", lineHeight: 21, fontSize: 14.5 },
  hintIconContainer: { marginTop: 6, padding: 4, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  note: { color: "#a9a9a9", fontStyle: "italic", fontSize: 13.5, paddingHorizontal: 4 },
  overlayGlyph: { flex: 1, alignItems: "center", justifyContent: "center" },
  attackDot: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#E6194B", borderWidth: 2, borderColor: "rgba(255,255,255,0.5)", alignItems: "center", justifyContent: "center" },
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
  hero: { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 14, gap: 12 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroPortrait: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: "rgba(255,255,255,0.25)" },
  heroName: { color: "#fff", fontWeight: "900", fontSize: 20, letterSpacing: 1 },
  heroTitle: { color: "#a9a3c6", fontWeight: "800", fontSize: 12.5, letterSpacing: 1, marginTop: 1 },
  lockChip: { maxWidth: 130, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: "rgba(255,204,128,0.12)", borderWidth: 1, borderColor: "rgba(255,204,128,0.5)" },
  lockFree: { backgroundColor: "rgba(165,214,167,0.12)", borderColor: "rgba(165,214,167,0.5)" },
  lockText: { flexShrink: 1, color: "#ffcc80", fontWeight: "800", fontSize: 11 },
  heroLine: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 10 },
  heroTag: { minWidth: 50, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8, backgroundColor: "rgba(244,143,177,0.2)", alignItems: "center" },
  heroTagText: { color: "#f48fb1", fontWeight: "900", fontSize: 10, letterSpacing: 1 },
  abilityIcon: { width: 44, height: 44 },
  heroLineTitle: { color: "#fff", fontWeight: "900", fontSize: 14.5 },
  heroLineBody: { color: "#b9b4d4", fontSize: 13.5, lineHeight: 19, marginTop: 1 },
  relicGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  relic: { flexBasis: "100%", flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 12 },
  relicWide: { flexBasis: "48.5%", flexGrow: 1 },
  relicCursed: { borderColor: "rgba(239,83,80,0.6)", backgroundColor: "rgba(239,83,80,0.07)" },
  relicName: { color: "#fff", fontWeight: "900", fontSize: 14.5 },
  relicDesc: { color: "#b9b4d4", fontSize: 13, lineHeight: 18, marginTop: 2 },
  upgradeEmoji: { fontSize: 24 },
  groupTitle: { fontWeight: "900", fontSize: 12.5, letterSpacing: 2, marginLeft: 4 },
  depthRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(239,83,80,0.07)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(239,83,80,0.3)", padding: 10 },
  depthNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(239,83,80,0.25)", alignItems: "center", justifyContent: "center" },
  depthNumberText: { color: "#ef9a9a", fontWeight: "900", fontSize: 16 },
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
