// src/screens/CharactersScreen.tsx
import React, { memo, useCallback, useRef, useState } from "react";
import {
  StatusBar,
  StyleSheet,
  View,
  FlatList,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import Text from "../ui/components/Text";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import characters, { type Character } from "../data/characters";
import { RootStackParamList } from "../navigation/types";
import { useFocusEffect } from "@react-navigation/native";
import { emitSound } from "../audio/audioEventBus";
import { SafeAreaView } from "react-native-safe-area-context";
import { GAME_CONFIG } from "../config/gameConfig";
import { getLocalStats } from "../services/localStats";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { isHeroUnlocked } from "../core/stats/heroUnlocks";
import { useGameLayout, MIN_TOUCH } from "../ui/layout/useGameLayout";
import { Ionicons } from "@expo/vector-icons";
import { useT } from "../i18n/useT";
import { heroText, unlockText } from "../i18n/keys";
import { useSettingsStore } from "../state/settings/store";
import { MAX_ASCENSION, ascensionRuleKey } from "../core/engine/ascension";
import { metaEffects } from "../core/stats/forge";
import { dailyKey } from "../core/engine/seed";
import type { TranslationKey } from "../i18n/en";
import SpriteImage from "../ui/components/SpriteImage";

type Props = NativeStackScreenProps<RootStackParamList, "CharactersScreen">;

/** Accent per hero, in the same hue as the character but softer than a pure screen colour. */
const HERO_ACCENT = ["#69C3DE", "#E5737E", "#97C46E", "#E8BA52"] as const;
const accentOf = (heroIndex: number) => HERO_ACCENT[heroIndex] ?? "#E8BA52";

type CardProps = {
  hero: Character;
  heroIndex: number;
  cardWidth: number;
  cardHeight: number;
  locked: boolean;
  onSelect: (heroIndex: number) => void;
};

/** One hero card. Defined at module level so the list never remounts it on state changes. */
const HeroCard = memo(({ hero, heroIndex, cardWidth, cardHeight, locked, onSelect }: CardProps) => {
  const { t } = useT();
  const compact = cardHeight < 300;
  // Short windows: shrink the body so the select button is never pushed out of the card.
  const tight = cardHeight < 240;
  const cramped = cardHeight < 190;
  const accent = accentOf(heroIndex);
  // Everything scales with the card: on a tablet the art and the text grow instead of leaving empty bands.
  const nameSize = compact ? 18 : Math.max(22, Math.min(cardWidth * 0.12, 36));
  const titleSize = compact ? 11 : Math.max(12, Math.min(cardWidth * 0.052, 16));
  const perkSize = compact ? 13 : Math.max(15, Math.min(cardWidth * 0.066, 21));
  const descSize = compact ? 12 : Math.max(14, Math.min(cardWidth * 0.058, 19));
  const name = heroText(t, heroIndex, "name");
  const title = heroText(t, heroIndex, "title");
  const perk = heroText(t, heroIndex, "perk");
  const description = heroText(t, heroIndex, "desc");
  const requirement = unlockText(t, heroIndex);

  return (
    <View style={[styles.itemWrapper, { width: cardWidth, height: cardHeight }]}>
      <View style={[styles.card, { borderColor: accent + "CC", shadowColor: accent }]}>
        {/* Portrait: takes whatever height the name, power and button leave over */}
        <View style={[styles.portraitArea, tight && { minHeight: 36 }, { backgroundColor: accent + "1F" }]}>
          <SpriteImage
            source={hero.playerImage}
            style={{ width: "86%", height: "92%", opacity: locked ? 0.3 : 1 }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          {locked && <Ionicons name="lock-closed" size={44} color="#fff" style={styles.lock} />}
        </View>

        <View style={[styles.cardBody, tight && { padding: 8, gap: 2 }]}>
          <Text style={[styles.heroName, { fontSize: nameSize }]} numberOfLines={1} adjustsFontSizeToFit accessibilityRole="header" maxFontSizeMultiplier={1.2}>
            {name}
          </Text>
          {!cramped && (
            <Text style={[styles.heroTitle, { color: accent, fontSize: titleSize }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
              {title.toLocaleUpperCase()}
            </Text>
          )}

          <View style={[styles.perkBox, { borderColor: accent + "55" }, tight && { paddingVertical: 4, marginTop: 2 }]}>
            <Text style={[styles.perkName, { color: accent, fontSize: perkSize }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
              {perk}
            </Text>
            {!cramped && (
              <Text style={[styles.perkDesc, { fontSize: descSize }]} numberOfLines={tight ? 2 : compact ? 3 : 4} maxFontSizeMultiplier={1.2}>
                {description}
              </Text>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={locked}
            onPress={() => onSelect(heroIndex)}
            accessibilityRole="button"
            accessibilityLabel={locked ? `${name}. ${t("heroes.locked")}. ${requirement}` : `${t("heroes.select")}: ${name}`}
            accessibilityState={{ disabled: locked }}
            style={[styles.selectButton, { backgroundColor: locked ? "rgba(255,255,255,0.14)" : accent }, !locked && styles.selectGlow, tight && { marginTop: 4 }]}
          >
            <Text style={[styles.selectText, locked && { color: "#d8d2f0" }, { fontSize: Math.max(13, perkSize - 1) }]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
              {(locked ? requirement : t("heroes.select")).toLocaleUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const CharactersScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useT();
  const { width, height } = useWindowDimensions();
  const { fontSize, insets } = useGameLayout();
  const mode = route.params?.mode ?? "expedition";
  const tutorialSeen = useSettingsStore(s => s.tutorialSeen);
  const [stats, setStats] = useState<LocalStats>(EMPTY_STATS);
  // Until the saved stats arrive, every hero looks locked and the depth and Forge bonuses are unknown.
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [depth, setDepth] = useState(0);
  // Height of the area the cards live in (what is left under the title and the depth picker).
  const [listHeight, setListHeight] = useState(Math.max(200, height * 0.6));
  const depthInitialised = useRef(false);

  // Cards adapt to the window. When all of them fit side by side they are shown in one centred row (no scrolling
  // and no dead space around them); otherwise they scroll, one big card at a time. Either way a card is as tall
  // as the area allows, so its content is spread out instead of huddling at the top.
  const itemMargin = 12;
  const gap = itemMargin * 2;
  // The SafeAreaView already removes the notch insets, so the window the cards live in is narrower than `width`.
  const innerWidth = width - insets.left - insets.right;
  const sidePadding = 24;
  const usableWidth = innerWidth - sidePadding * 2;
  const fitWidth = (usableWidth - gap * (characters.length - 1)) / characters.length;
  const fitsAll = fitWidth >= 190;
  const cardWidth = fitsAll ? Math.min(fitWidth, 320) : Math.min(Math.max(innerWidth * 0.3, 200), 290, innerWidth - 48);
  const itemLength = cardWidth + gap;
  const cardHeight = Math.max(170, Math.min(listHeight - 16, 620));

  useFocusEffect(
    useCallback(() => {
      emitSound("SELECTION_SCREEN_START");
      getLocalStats()
        .then(loaded => {
          setStats(loaded);
          setStatsLoaded(true);
          // Start on the deepest unlocked depth the first time; the player can lower it.
          if (!depthInitialised.current) {
            depthInitialised.current = true;
            setDepth(GAME_CONFIG.dev.unlockAllHeroes ? 0 : loaded.maxAscension);
          }
        })
        .catch(() => setStatsLoaded(true)); // unreadable storage: play with the defaults
      return () => emitSound("SELECTION_SCREEN_STOP");
    }, []),
  );

  const compactScreen = height < 460;
  const modeTitle = t(`heroes.mode.${mode}` as TranslationKey);
  const modeRule = t(`heroes.mode.${mode}.rule` as TranslationKey) + (mode === "daily" ? `  ${dailyKey()}` : "");
  const modeTint = mode === "daily" ? "#FF9A3C" : mode === "endless" ? "#B39DDB" : "#E8BA52";

  const maxDepth = GAME_CONFIG.dev.unlockAllHeroes ? MAX_ASCENSION : stats.maxAscension;
  // Always shown for expeditions: the locked levels teach that winning opens harder ones.
  const showDepth = mode === "expedition";
  // Short windows put the title and the depth picker side by side so the hero cards keep the height.
  const compactTop = compactScreen && showDepth;

  const isLocked = (heroIndex: number) =>
    !GAME_CONFIG.dev.unlockAllHeroes && !isHeroUnlocked(heroIndex, stats);

  const handleSelect = useCallback(
    (heroIndex: number) => {
      if (!statsLoaded) return;
      // First-time players get the guided tutorial before their first expedition.
      if (!tutorialSeen && mode === "expedition") {
        navigation.navigate("TutorialScreen", { characterIndex: heroIndex, ascension: depth, meta: metaEffects(stats.forge) });
        return;
      }
      navigation.navigate("GameScreen", { characterIndex: heroIndex, mode, ascension: mode === "expedition" ? depth : 0, meta: metaEffects(stats.forge) });
      emitSound("GAME_MUSIC_START");
    },
    [navigation, mode, tutorialSeen, depth, stats.forge, statsLoaded],
  );

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <StatusBar hidden />
      <View style={styles.contentLayer}>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right", "bottom"]}>
          <TouchableOpacity
            style={[styles.backButton, { left: 20 }]}
            onPress={() => navigation.goBack()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("a11y.back")}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={compactTop ? styles.topRowCompact : undefined}>
          <View style={[styles.header, compactTop && styles.headerCompact]}>
            <Text style={[styles.modeKicker, { color: modeTint }]} maxFontSizeMultiplier={1.2}>
              {modeTitle.toLocaleUpperCase()}
            </Text>
            <Text style={[styles.title, { fontSize: Math.min(fontSize(28), 32) }]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
              {t("heroes.title").toLocaleUpperCase()}
            </Text>
            {!(compactScreen && showDepth) && (
              <>
                <View style={styles.titleUnderline} />
                <Text style={styles.modeRule} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                  {modeRule}
                </Text>
              </>
            )}
          </View>

          {showDepth && (
            <View style={[styles.depthRow, compactTop && styles.depthRowCompact]}>
              <TouchableOpacity
                style={[styles.depthButton, depth <= 0 && { opacity: 0.35 }]}
                onPress={() => setDepth(d => Math.max(0, d - 1))}
                disabled={depth <= 0}
                accessibilityRole="button"
                accessibilityLabel={t("a11y.depthLower")}
              >
                <Ionicons name="remove" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.depthText} accessible accessibilityLabel={`${t("difficulty.title")}: ${t(`ascension.label.${depth}` as TranslationKey)}. ${t(ascensionRuleKey(depth) as TranslationKey)}`}>
                {!compactScreen && (
                  <Text style={styles.depthKicker} maxFontSizeMultiplier={1.2}>
                    {t("difficulty.title").toLocaleUpperCase()}
                  </Text>
                )}
                <Text style={styles.depthName} maxFontSizeMultiplier={1.2}>
                  🔥 {compactScreen ? `${t("difficulty.title")}: ` : ""}{t(`ascension.label.${depth}` as TranslationKey).toLocaleUpperCase()}
                </Text>
                {!compactTop && (
                  <Text style={styles.depthRule} numberOfLines={compactScreen ? 1 : 2} maxFontSizeMultiplier={1.2}>
                    {t(ascensionRuleKey(depth) as TranslationKey)}
                  </Text>
                )}
                {/* All six levels: open ones filled, the selected one outlined, locked ones dark with a lock */}
                <View style={styles.depthPips}>
                  {Array.from({ length: MAX_ASCENSION + 1 }, (_, i) => (
                    <View key={i} style={[styles.depthPip, i <= maxDepth && styles.depthPipOpen, i === depth && styles.depthPipSelected]}>
                      {i > maxDepth ? <Ionicons name="lock-closed" size={8} color="#b8b3d0" /> : null}
                    </View>
                  ))}
                </View>
                {!compactTop && depth >= maxDepth && maxDepth < MAX_ASCENSION && (
                  <Text style={styles.depthLock} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                    🔒 {t("difficulty.unlock", { from: t(`ascension.label.${maxDepth}` as TranslationKey), to: t(`ascension.label.${maxDepth + 1}` as TranslationKey) })}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.depthButton, depth >= maxDepth && { opacity: 0.35 }]}
                onPress={() => setDepth(d => Math.min(maxDepth, d + 1))}
                disabled={depth >= maxDepth}
                accessibilityRole="button"
                accessibilityLabel={t("a11y.depthRaise")}
              >
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          </View>

          <FlatList
            data={characters}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={fitsAll ? undefined : itemLength}
            decelerationRate="fast"
            keyExtractor={(_, i) => String(i)}
            style={styles.list}
            onLayout={e => setListHeight(e.nativeEvent.layout.height)}
            scrollEnabled={!fitsAll}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingHorizontal: fitsAll ? sidePadding : Math.max((innerWidth - itemLength) / 2, 12),
              alignItems: "center",
              paddingVertical: 8,
            }}
            ItemSeparatorComponent={() => <View style={{ width: gap }} />}
            renderItem={({ item, index }) => (
              <HeroCard
                hero={item}
                heroIndex={index}
                cardWidth={cardWidth}
                cardHeight={cardHeight}
                locked={isLocked(index)}
                onSelect={handleSelect}
              />
            )}
          />
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  contentLayer: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  backButton: {
    position: "absolute",
    top: 12,
    zIndex: 100,
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: MIN_TOUCH / 2,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  header: { alignItems: "center", marginTop: 2, paddingHorizontal: MIN_TOUCH + 28 },
  topRowCompact: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 16, minHeight: MIN_TOUCH + 12 },
  headerCompact: { flex: 1, marginTop: 0, paddingHorizontal: 0, marginLeft: MIN_TOUCH + 32 },
  modeKicker: { fontWeight: "800", letterSpacing: 3, fontSize: 12 },
  modeRule: { color: "#d6d0ee", fontSize: 12, textAlign: "center", marginTop: 4 },
  title: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 3,
    textShadowColor: "#000",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
    textAlign: "center",
  },
  titleUnderline: { height: 4, width: 60, backgroundColor: "#FFD700", marginTop: 4, borderRadius: 2 },
  depthRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 8,
    maxWidth: 560,
  },
  depthRowCompact: { marginTop: 0, alignSelf: "center", flexShrink: 0 },
  depthButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: "rgba(255,112,67,0.35)",
    borderWidth: 1,
    borderColor: "#FF7043",
    justifyContent: "center",
    alignItems: "center",
  },
  depthText: { flexShrink: 1, alignItems: "center", minWidth: 140 },
  depthPips: { flexDirection: "row", gap: 6, marginTop: 4 },
  depthPip: { width: 22, height: 12, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  depthPipOpen: { backgroundColor: "#FF9A5C" },
  depthPipSelected: { borderWidth: 2, borderColor: "#fff" },
  depthLock: { color: "#c9c3e6", fontSize: 11, fontWeight: "700", textAlign: "center", marginTop: 2 },
  depthKicker: { color: "#9a95b8", fontWeight: "800", letterSpacing: 2, fontSize: 10 },
  depthName: { color: "#FF9A5C", fontWeight: "900", letterSpacing: 1.5, fontSize: 15 },
  depthRule: { color: "#e0e0e0", fontSize: 12, textAlign: "center" },
  list: { flex: 1 },
  itemWrapper: {},
  card: {
    flex: 1,
    backgroundColor: "rgba(16, 12, 32, 0.92)",
    borderRadius: 26,
    borderWidth: 2.5,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  portraitArea: { flex: 1, minHeight: 56, alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 12, gap: 4 },
  heroTitle: { fontWeight: "700", letterSpacing: 2, textAlign: "center" },
  perkBox: {
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 2,
  },
  selectGlow: { borderBottomWidth: 4, borderBottomColor: "rgba(0,0,0,0.3)" },
  lock: { position: "absolute" },
  heroName: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  underline: { height: 2, width: 30, borderRadius: 1 },
  perkName: { fontWeight: "900", letterSpacing: 1, textAlign: "center" },
  perkDesc: { color: "#d4d4d4", textAlign: "center" },
  selectButton: {
    minHeight: MIN_TOUCH,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "rgba(0,0,0,0.3)",
    marginTop: 8,
    alignSelf: "stretch",
  },
  selectText: { color: "#111", fontWeight: "900", letterSpacing: 1, textAlign: "center" },
});

export default CharactersScreen;
