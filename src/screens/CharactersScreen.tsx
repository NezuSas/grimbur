// src/screens/CharactersScreen.tsx
import React, { memo, useCallback, useRef, useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  View,
  FlatList,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
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
import type { TranslationKey } from "../i18n/en";
import SpriteImage from "../ui/components/SpriteImage";

type Props = NativeStackScreenProps<RootStackParamList, "CharactersScreen">;

type CardProps = {
  hero: Character;
  heroIndex: number;
  cardWidth: number;
  cardHeight: number;
  portraitSize: number;
  locked: boolean;
  onSelect: (heroIndex: number) => void;
};

/** One hero card. Defined at module level so the list never remounts it on state changes. */
const HeroCard = memo(({ hero, heroIndex, cardWidth, cardHeight, portraitSize, locked, onSelect }: CardProps) => {
  const { t } = useT();
  const { spacing } = useGameLayout();
  // Short windows (phones in landscape) get a compact card: one-line name, two-line description.
  const compact = cardHeight < 300;
  const nameSize = compact ? 16 : Math.max(16, Math.min(cardWidth * 0.095, 28));
  const perkSize = compact ? 12 : Math.max(13, Math.min(cardWidth * 0.058, 17));
  const descSize = compact ? 11 : Math.max(12, Math.min(cardWidth * 0.052, 16));
  const name = heroText(t, heroIndex, "name");
  const perk = heroText(t, heroIndex, "perk");
  const description = heroText(t, heroIndex, "desc");
  const requirement = unlockText(t, heroIndex);

  return (
    <View style={[styles.itemWrapper, { width: cardWidth, height: cardHeight }]}>
      <ScrollView
        style={[styles.card, { borderColor: hero.arrowColor }]}
        contentContainerStyle={styles.cardContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardTop}>
        <View
          style={[
            styles.imageContainer,
            { width: portraitSize, height: portraitSize, borderRadius: portraitSize / 2, borderColor: hero.arrowColor + "66" },
          ]}
        >
          <SpriteImage
            source={hero.playerImage}
            style={{ width: portraitSize * 0.75, height: portraitSize * 0.75, opacity: locked ? 0.3 : 1 }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          {locked && <Ionicons name="lock-closed" size={portraitSize * 0.4} color="#fff" style={styles.lock} />}
        </View>

        <Text
          style={[styles.heroName, { fontSize: nameSize, textShadowColor: hero.arrowColor }]}
          numberOfLines={compact ? 1 : 2}
          adjustsFontSizeToFit={compact}
          accessibilityRole="header"
          maxFontSizeMultiplier={1.3}
        >
          {name.toLocaleUpperCase()}
        </Text>
        <View style={[styles.underline, { backgroundColor: hero.arrowColor }]} />
        </View>

        <View style={styles.cardMiddle}>
          <Text style={[styles.perkName, { color: hero.arrowColor, fontSize: perkSize }]} maxFontSizeMultiplier={1.3}>
            {perk.toLocaleUpperCase()}
          </Text>
          <Text style={[styles.perkDesc, { fontSize: descSize }]} numberOfLines={compact ? 3 : undefined} maxFontSizeMultiplier={1.3}>
            {description}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={locked}
          onPress={() => onSelect(heroIndex)}
          accessibilityRole="button"
          accessibilityLabel={locked ? `${name}. ${t("heroes.locked")}. ${requirement}` : `${t("heroes.select")}: ${name}`}
          accessibilityState={{ disabled: locked }}
          style={[
            styles.selectButton,
            { backgroundColor: hero.arrowColor, paddingHorizontal: spacing(24) },
            locked && { opacity: 0.55 },
          ]}
        >
          <Text style={[styles.selectText, { fontSize: Math.max(13, perkSize * (locked ? 0.9 : 1)) }]} numberOfLines={2} maxFontSizeMultiplier={1.3}>
            {(locked ? requirement : t("heroes.select")).toLocaleUpperCase()}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  const sidePadding = Math.max(insets.left, insets.right, 12) + 12;
  const usableWidth = width - sidePadding * 2;
  const fitWidth = (usableWidth - gap * (characters.length - 1)) / characters.length;
  const fitsAll = fitWidth >= 190;
  const cardWidth = fitsAll ? Math.min(fitWidth, 320) : Math.min(Math.max(width * 0.3, 200), 290, width - 48);
  const itemLength = cardWidth + gap;
  const cardHeight = Math.max(170, Math.min(listHeight - 16, 620));
  const portraitSize = cardHeight < 300 ? 48 : Math.max(56, Math.min(cardWidth * 0.72, cardHeight * 0.36));

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

  const maxDepth = GAME_CONFIG.dev.unlockAllHeroes ? MAX_ASCENSION : stats.maxAscension;
  const showDepth = mode === "expedition" && maxDepth > 0;

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
            style={[styles.backButton, { left: Math.max(insets.left, 12) + 8 }]}
            onPress={() => navigation.goBack()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("a11y.back")}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={[styles.title, { fontSize: fontSize(30) }]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
              {t("heroes.title").toLocaleUpperCase()}
            </Text>
            <View style={styles.titleUnderline} />
          </View>

          {showDepth && (
            <View style={styles.depthRow}>
              <TouchableOpacity
                style={[styles.depthButton, depth <= 0 && { opacity: 0.35 }]}
                onPress={() => setDepth(d => Math.max(0, d - 1))}
                disabled={depth <= 0}
                accessibilityRole="button"
                accessibilityLabel={t("a11y.depthLower")}
              >
                <Ionicons name="remove" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.depthText} accessible accessibilityLabel={`${t("ascension.name", { n: depth })}. ${t(ascensionRuleKey(depth) as TranslationKey)}`}>
                <Text style={styles.depthName} maxFontSizeMultiplier={1.2}>
                  🔥 {t("ascension.name", { n: depth }).toLocaleUpperCase()}
                </Text>
                <Text style={styles.depthRule} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                  {t(ascensionRuleKey(depth) as TranslationKey)}
                </Text>
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
              paddingHorizontal: fitsAll ? sidePadding : Math.max((width - itemLength) / 2, 12),
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
                portraitSize={portraitSize}
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
  header: { alignItems: "center", marginTop: 8 },
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
  depthName: { color: "#FF7043", fontWeight: "900", letterSpacing: 1.5, fontSize: 14 },
  depthRule: { color: "#e0e0e0", fontSize: 12, textAlign: "center" },
  list: { flex: 1 },
  itemWrapper: {},
  card: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    borderRadius: 26,
    borderWidth: 3,
  },
  cardContent: { flexGrow: 1, alignItems: "center", justifyContent: "space-between", padding: 10, gap: 4 },
  cardTop: { alignItems: "center", gap: 6 },
  cardMiddle: { alignItems: "center", gap: 6, flexShrink: 1 },
  imageContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
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
