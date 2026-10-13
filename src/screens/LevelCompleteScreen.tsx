import React, { useEffect, useRef, useMemo, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import characters from "../data/characters";
import { MIN_TOUCH } from "../ui/layout/useGameLayout";
import { emitSound } from "../audio/audioEventBus";
import { formatTime } from "../shared/utils/formatTime";
import { useT } from "../i18n/useT";

type Props = NativeStackScreenProps<RootStackParamList, "LevelCompleteScreen">;

const LevelCompleteScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useT();
  const { score, level, coins, totalCoins, characterIndex, kills = 0, totalEnemies = 0, time = 0 } = route.params;
  const character = characters[characterIndex] ?? characters[0];
  const { width, height } = useWindowDimensions();

  const [animationDone, setAnimationDone] = useState(false);
  const leaving = useRef(false);

  // Animation values
  const cardScale = useRef(new Animated.Value(0)).current;
  const star1 = useRef(new Animated.Value(0)).current;
  const star2 = useRef(new Animated.Value(0)).current;
  const star3 = useRef(new Animated.Value(0)).current;

  // Rating: 1 star = floor cleared, 2 = every gem collected, 3 = every gem + every guardian.
  const starsEarned = useMemo(() => {
    const allCoins = coins === totalCoins;
    const allKilled = kills === totalEnemies;
    if (allCoins && allKilled) return 3;
    if (allCoins) return 2;
    return 1;
  }, [coins, totalCoins, kills, totalEnemies]);

  useEffect(() => {
    Animated.spring(cardScale, { toValue: 1, friction: 6, useNativeDriver: true }).start(() => {
      Animated.sequence([
        Animated.delay(300),
        Animated.spring(star1, { toValue: 1, friction: 3, useNativeDriver: true }),
        Animated.spring(star2, { toValue: 1, friction: 3, useNativeDriver: true }),
        Animated.spring(star3, { toValue: 1, friction: 3, useNativeDriver: true }),
      ]).start(() => setAnimationDone(true));
    });
  }, []);

  // Leaves once, however many taps arrive before the screen unmounts.
  const leave = () => {
    if (leaving.current) return;
    leaving.current = true;
    emitSound("LEVEL_RESUME"); // stop the fanfare and resume the in-game music
    navigation.goBack();
  };

  // Sizes derive from the live window, so the card fits small landscape phones and tablets alike.
  const compact = height < 420;
  const cardWidth = Math.min(width * 0.94, 850);
  const imageHeight = Math.min(Math.max(height * 0.28, 70), 180);
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
          { transform: [{ scale: cardScale }], width: cardWidth, maxHeight: height * 0.94, borderColor: character.arrowColor },
        ]}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={[styles.row, { padding: compact ? 12 : 20 }]}>
            {/* Left column: title, image, stars */}
            <View style={[styles.column, { flex: 1, paddingRight: 10 }]}>
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

              <View style={{ width: "100%", height: imageHeight, marginVertical: 8 }}>
                <Image source={character.winImage} style={styles.winImage} resizeMode="contain" accessibilityIgnoresInvertColors />
              </View>

              <View style={styles.starsContainer} accessible accessibilityLabel={accessibilityStars}>
                <Animated.View style={{ transform: [{ scale: star1 }] }}>
                  <Ionicons name="star" size={starSize} color="#FFD700" />
                </Animated.View>
                <Animated.View style={{ transform: [{ scale: star2 }] }}>
                  <Ionicons
                    name={starsEarned >= 2 ? "star" : "star-outline"}
                    size={starSize * 1.3}
                    color={starsEarned >= 2 ? "#FFD700" : "#777"}
                    style={{ marginHorizontal: 10 }}
                  />
                </Animated.View>
                <Animated.View style={{ transform: [{ scale: star3 }] }}>
                  <Ionicons name={starsEarned >= 3 ? "star" : "star-outline"} size={starSize} color={starsEarned >= 3 ? "#FFD700" : "#777"} />
                </Animated.View>
              </View>

              {!animationDone && (
                <Text style={styles.skipHint} maxFontSizeMultiplier={1.2}>
                  {t("complete.skip").toLocaleUpperCase()}
                </Text>
              )}
            </View>

            {/* Right column: stats and button */}
            <View style={[styles.column, { flex: 1.2, paddingLeft: 10 }]}>
              <View style={styles.statsContainer}>
                {[
                  { label: t("complete.score"), value: score.toLocaleString(), color: "#fff" },
                  { label: t("complete.gems"), value: `${coins} / ${totalCoins}`, color: "#FFD700" },
                  { label: t("complete.kills"), value: `${kills} / ${totalEnemies}`, color: "#FF6E40" },
                  { label: t("complete.time"), value: formatTime(time), color: "#4FC3F7" },
                ].map(stat => (
                  <View key={stat.label} style={styles.statRow} accessible accessibilityLabel={`${stat.label}: ${stat.value}`}>
                    <Text style={styles.statLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                      {stat.label.toLocaleUpperCase()}
                    </Text>
                    <Text style={[styles.statValue, { color: stat.color }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                      {stat.value}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: character.arrowColor }]}
                onPress={leave}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t("complete.next")}
              >
                <Text style={styles.buttonText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
                  {t("complete.next").toLocaleUpperCase()} →
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#111",
    borderRadius: 32,
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 25,
    overflow: "hidden",
  },
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
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 12,
    marginBottom: 14,
  },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5, gap: 8 },
  statLabel: { color: "#a0a0a0", fontWeight: "900", letterSpacing: 1, fontSize: 12 },
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
  buttonText: { color: "#111", fontWeight: "900", letterSpacing: 2, fontSize: 16 },
  skipHint: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: "700", letterSpacing: 2, marginTop: 8, textAlign: "center" },
});

export default LevelCompleteScreen;
