// src/screens/CharactersScreen.tsx
import React, { memo, useCallback, useState } from "react";
import {
  Image,
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

type Props = NativeStackScreenProps<RootStackParamList, "CharactersScreen">;

type CardProps = {
  hero: Character;
  heroIndex: number;
  cardWidth: number;
  portraitSize: number;
  locked: boolean;
  onSelect: (heroIndex: number) => void;
};

/** One hero card. Defined at module level so the list never remounts it on state changes. */
const HeroCard = memo(({ hero, heroIndex, cardWidth, portraitSize, locked, onSelect }: CardProps) => {
  const { t } = useT();
  const { fontSize, spacing } = useGameLayout();
  const name = heroText(t, heroIndex, "name");
  const perk = heroText(t, heroIndex, "perk");
  const description = heroText(t, heroIndex, "desc");
  const requirement = unlockText(t, heroIndex);

  return (
    <View style={[styles.itemWrapper, { width: cardWidth }]}>
      <ScrollView
        style={[styles.card, { borderColor: hero.arrowColor }]}
        contentContainerStyle={styles.cardContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.imageContainer,
            { width: portraitSize, height: portraitSize, borderRadius: portraitSize / 2, borderColor: hero.arrowColor + "66" },
          ]}
        >
          <Image
            source={hero.playerImage}
            style={{ width: portraitSize * 0.75, height: portraitSize * 0.75, opacity: locked ? 0.3 : 1 }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          {locked && <Ionicons name="lock-closed" size={portraitSize * 0.4} color="#fff" style={styles.lock} />}
        </View>

        <Text
          style={[styles.heroName, { fontSize: fontSize(24), textShadowColor: hero.arrowColor }]}
          accessibilityRole="header"
          maxFontSizeMultiplier={1.3}
        >
          {name.toLocaleUpperCase()}
        </Text>
        <View style={[styles.underline, { backgroundColor: hero.arrowColor }]} />

        <Text style={[styles.perkName, { color: hero.arrowColor, fontSize: fontSize(15) }]} maxFontSizeMultiplier={1.3}>
          {perk.toLocaleUpperCase()}
        </Text>
        <Text style={[styles.perkDesc, { fontSize: fontSize(13) }]} maxFontSizeMultiplier={1.3}>
          {description}
        </Text>

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
          <Text style={[styles.selectText, { fontSize: fontSize(locked ? 13 : 15) }]} numberOfLines={2} maxFontSizeMultiplier={1.3}>
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

  // Cards adapt to the window: wide enough to read, never wider than the screen minus its margins.
  const cardWidth = Math.min(Math.max(width * 0.3, 200), 290, width - 48);
  const itemMargin = 12;
  const itemLength = cardWidth + itemMargin * 2;
  const portraitSize = Math.min(Math.max(height * 0.22, 56), 110);

  useFocusEffect(
    useCallback(() => {
      emitSound("SELECTION_SCREEN_START");
      getLocalStats().then(setStats).catch(() => {});
      return () => emitSound("SELECTION_SCREEN_STOP");
    }, []),
  );

  const isLocked = (heroIndex: number) =>
    !GAME_CONFIG.dev.unlockAllHeroes && !isHeroUnlocked(heroIndex, stats);

  const handleSelect = useCallback(
    (heroIndex: number) => {
      // First-time players get the guided tutorial before their first expedition.
      if (!tutorialSeen && mode === "expedition") {
        navigation.navigate("TutorialScreen", { characterIndex: heroIndex });
        return;
      }
      navigation.navigate("GameScreen", { characterIndex: heroIndex, mode });
      emitSound("GAME_MUSIC_START");
    },
    [navigation, mode, tutorialSeen],
  );

  return (
    <ImageBackground source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
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

          <FlatList
            data={characters}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={itemLength}
            decelerationRate="fast"
            keyExtractor={(_, i) => String(i)}
            style={styles.list}
            contentContainerStyle={{
              paddingHorizontal: Math.max((width - itemLength) / 2, 12),
              alignItems: "stretch",
              paddingVertical: 8,
            }}
            ItemSeparatorComponent={() => <View style={{ width: itemMargin * 2 }} />}
            renderItem={({ item, index }) => (
              <HeroCard
                hero={item}
                heroIndex={index}
                cardWidth={cardWidth}
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
  list: { flex: 1 },
  itemWrapper: { flex: 1 },
  card: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    borderRadius: 26,
    borderWidth: 3,
  },
  cardContent: { alignItems: "center", padding: 14, gap: 6 },
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
