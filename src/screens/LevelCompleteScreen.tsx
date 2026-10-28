import React, { useEffect, useRef, useMemo, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Text from "../ui/components/Text";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { characterWithSkin } from "../data/characterSkins";
import { MIN_TOUCH } from "../ui/layout/useGameLayout";
import { emitSound } from "../audio/audioEventBus";
import { formatTime } from "../shared/utils/formatTime";
import { useT } from "../i18n/useT";
import SpriteImage from "../ui/components/SpriteImage";
import { PopButton } from "../ui/components/game/popup";

type Props = NativeStackScreenProps<RootStackParamList, "LevelCompleteScreen">;

const LevelCompleteScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useT();
  const { score, level, coins, totalCoins, characterIndex, kills = 0, totalEnemies = 0, time = 0 } = route.params;
  const character = characterWithSkin(characterIndex, route.params.skin);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [animationDone, setAnimationDone] = useState(false);
  const leaving = useRef(false);

  // Animation values
  const cardScale = useRef(new Animated.Value(0)).current;
  const star1 = useRef(new Animated.Value(0)).current;
  const star2 = useRef(new Animated.Value(0)).current;
  const star3 = useRef(new Animated.Value(0)).current;

  // Rating: 3 stars = every guardian slain (or none on the floor), 2 = at least half, 1 = floor cleared.
  // Every gem is always collected when a floor clears, so gems do not affect the rating.
  const starsEarned = useMemo(() => {
    if (totalEnemies === 0 || kills >= totalEnemies) return 3;
    if (kills >= Math.ceil(totalEnemies / 2)) return 2;
    return 1;
  }, [kills, totalEnemies]);

  useEffect(() => {
    Animated.spring(cardScale, { toValue: 1, friction: 6, useNativeDriver: true }).start(() => {
      // The stars pop one after another, a little apart, each with a small bounce (not one full bounce after the other).
      Animated.sequence([
        Animated.delay(150),
        Animated.stagger(170, [star1, star2, star3].map(star => Animated.spring(star, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }))),
      ]).start(() => setAnimationDone(true));
    });
  }, []);

  // Leaves once, however many taps arrive before the screen unmounts.
  // A tap in the first moments is almost always a finger still moving from the board: it must not skip the card.
  const shownAt = useRef(Date.now());
  const leave = () => {
    if (leaving.current || Date.now() - shownAt.current < 500) return;
    leaving.current = true;
    emitSound("LEVEL_RESUME"); // stop the fanfare and resume the in-game music
    navigation.goBack();
  };

  // The card never moves on by itself: the player reads the result and presses "Next floor" (or taps) when ready.

  // Sizes derive from the live window, so the card fits small landscape phones and tablets alike.
  const compact = height < 420;
  // Narrow windows (portrait, split-screen) stack the two columns; the card fits inside the safe area.
  const stacked = width < 520;
  const cardWidth = Math.min((width - insets.left - insets.right) * 0.94, 850);
  const imageHeight = Math.min(Math.max(height * 0.36, 84), 210);
  const starSize = compact ? 30 : 40;
  const accessibilityStars = t("complete.title") + ` ${starsEarned}/3`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Tap anywhere to continue */}
      <Pressable style={StyleSheet.absoluteFill} onPress={leave} accessibilityRole="button" accessibilityLabel={t("complete.next")} />

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.card,
          { transform: [{ scale: cardScale }], width: cardWidth, maxHeight: (height - insets.top - insets.bottom) * 0.94, borderColor: character.arrowColor, shadowColor: character.arrowColor },
        ]}
      >
        <LinearGradient colors={["#2B2050", "#181031", "#0F0A22"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={styles.lit} pointerEvents="none" />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={[styles.row, { padding: compact ? 12 : 20 }, stacked && { flexDirection: "column", gap: 12 }]}>
            {/* Left column: title, image, stars */}
            <View style={[styles.column, stacked ? { width: "100%" } : { flex: 1, paddingRight: 10 }]}>
              <Text
                style={[styles.title, { color: character.arrowColor }]}
                accessibilityRole="header"
                numberOfLines={2}
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1.3}
              >
                {t("complete.title").toLocaleUpperCase()}
              </Text>
              <Text style={styles.levelText} maxFontSizeMultiplier={1.3}>
                {t("complete.floor", { n: level })}
              </Text>

              <View style={{ width: "100%", height: imageHeight, marginVertical: 8, alignItems: "center", justifyContent: "center" }}>
                <View style={[styles.halo, { width: imageHeight * 1.05, height: imageHeight * 1.05, borderRadius: imageHeight * 0.525, backgroundColor: character.arrowColor + "22", borderColor: character.arrowColor + "55" }]} />
                <SpriteImage source={character.winImage} style={styles.winImage} resizeMode="contain" accessibilityIgnoresInvertColors />
              </View>

              <View style={styles.starsContainer} accessible accessibilityLabel={accessibilityStars}>
                <Animated.View style={{ transform: [{ scale: star1 }] }}>
                  <Ionicons name="star" size={starSize} color="#FFD54F" />
                </Animated.View>
                <Animated.View style={{ transform: [{ scale: star2 }] }}>
                  <Ionicons
                    name={starsEarned >= 2 ? "star" : "star-outline"}
                    size={starSize * 1.3}
                    color={starsEarned >= 2 ? "#FFD54F" : "#777"}
                    style={{ marginHorizontal: 10 }}
                  />
                </Animated.View>
                <Animated.View style={{ transform: [{ scale: star3 }] }}>
                  <Ionicons name={starsEarned >= 3 ? "star" : "star-outline"} size={starSize} color={starsEarned >= 3 ? "#FFD54F" : "#777"} />
                </Animated.View>
              </View>

              {!animationDone && (
                <Text style={styles.skipHint} maxFontSizeMultiplier={1.2}>
                  {t("complete.skip").toLocaleUpperCase()}
                </Text>
              )}
            </View>

            {/* Right column: stats and button */}
            <View style={[styles.column, stacked ? { width: "100%" } : { flex: 1.2, paddingLeft: 10 }]}>
              <View style={styles.statsContainer}>
                {[
                  { label: t("complete.score"), value: score.toLocaleString(), color: "#fff", icon: "star" as const },
                  { label: t("complete.gems"), value: String(totalCoins || coins), color: "#FFD54F", icon: "diamond" as const },
                  { label: t("complete.kills"), value: `${kills} / ${totalEnemies}`, color: "#FF8A65", icon: "skull" as const },
                  { label: t("complete.time"), value: formatTime(time), color: "#4FC3F7", icon: "time" as const },
                ].map(stat => (
                  <View key={stat.label} style={styles.statRow} accessible accessibilityLabel={`${stat.label}: ${stat.value}`}>
                    <Ionicons name={stat.icon} size={16} color={stat.color} />
                    <Text style={styles.statLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                      {stat.label.toLocaleUpperCase()}
                    </Text>
                    <Text style={[styles.statValue, { color: stat.color }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                      {stat.value}
                    </Text>
                  </View>
                ))}
              </View>

              <PopButton label={t("complete.next")} icon="arrow-forward" tint={character.arrowColor} onPress={leave} accessibilityLabel={t("complete.next")} />
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "rgba(6,4,16,0.94)", justifyContent: "center", alignItems: "center" },
  card: {
    borderRadius: 32,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 25,
    overflow: "hidden",
  },
  lit: { position: "absolute", top: 0, left: 36, right: 36, height: 2, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.25)", zIndex: 2 },
  halo: { position: "absolute", borderWidth: 2 },
  scrollContent: { flexGrow: 1, justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  column: { justifyContent: "center", alignItems: "center" },
  title: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  levelText: { color: "#bdbdbd", fontWeight: "bold", fontSize: 15, letterSpacing: 1, textAlign: "center" },
  winImage: { height: "100%", width: "100%" },
  starsContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  statsContainer: {
    width: "100%",
    backgroundColor: "rgba(10,6,26,0.55)",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 12,
    marginBottom: 14,
  },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5, gap: 8 },
  statLabel: { color: "#b9b4d4", fontWeight: "900", letterSpacing: 1, fontSize: 12, flex: 1 },
  statValue: { fontWeight: "900", letterSpacing: 1, fontSize: 18, flexShrink: 1 },
  button: {
    minHeight: MIN_TOUCH,
    borderRadius: 20,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 4,
    borderBottomColor: "rgba(0,0,0,0.3)",
  },
  skipHint: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: "700", letterSpacing: 2, marginTop: 8, textAlign: "center" },
});

export default LevelCompleteScreen;
