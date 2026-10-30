import React, { useEffect, useMemo, useRef } from "react";
import { Animated, ImageBackground, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import Text from "../ui/components/Text";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { characterWithSkin } from "../data/characterSkins";
import { emitSound } from "../audio/audioEventBus";
import { formatTime } from "../shared/utils/formatTime";
import { useT } from "../i18n/useT";
import SpriteImage from "../ui/components/SpriteImage";
import { PopButton } from "../ui/components/game/popup";
import { useSettingsStore } from "../state/settings/store";

type Props = NativeStackScreenProps<RootStackParamList, "LevelCompleteScreen">;

const STAR = require("../assets/sprites/ui/Icon_Star.png");
const ART: Record<"score" | "gems" | "kills" | "time", ImageSourcePropType> = {
  score: require("../assets/sprites/ui/Icon_Trophy.png"),
  gems: require("../assets/sprites/items/Icon_Gem.png"),
  kills: require("../assets/sprites/ui/Icon_Swords.png"),
  time: require("../assets/sprites/tools/Tool_Undo.png"),
};
/** The expedition's floors, the last one the Grimbur's lair. */
const FLOORS = 10;

/**
 * Floor cleared: the hero celebrating with the floor's stars on the left; on the right what the floor gave, painted, and the
 * way down so far, ten floors to the lair. The card never moves on by itself: "Next floor" (or a tap) when the player is ready.
 */
const LevelCompleteScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t, n } = useT();
  const calm = useSettingsStore(s => s.reduceFlash);
  const { score, level, coins, totalCoins, characterIndex, kills = 0, totalEnemies = 0, time = 0 } = route.params;
  const character = characterWithSkin(characterIndex, route.params.skin);
  const accent = character.arrowColor;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const leaving = useRef(false);

  // Rating: 3 stars = every guardian slain (or none on the floor), 2 = at least half, 1 = floor cleared.
  const starsEarned = useMemo(() => {
    if (totalEnemies === 0 || kills >= totalEnemies) return 3;
    if (kills >= Math.ceil(totalEnemies / 2)) return 2;
    return 1;
  }, [kills, totalEnemies]);

  const card = useRef(new Animated.Value(calm ? 1 : 0)).current;
  const stars = useRef([0, 1, 2].map(() => new Animated.Value(calm ? 1 : 0))).current;
  const tiles = useRef([0, 1, 2, 3].map(() => new Animated.Value(calm ? 1 : 0))).current;
  useEffect(() => {
    if (calm) return;
    Animated.spring(card, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }).start();
    Animated.stagger(90, tiles.map(v => Animated.timing(v, { toValue: 1, duration: 260, delay: 180, useNativeDriver: true }))).start();
    Animated.sequence([
      Animated.delay(320),
      Animated.stagger(180, stars.map(s => Animated.spring(s, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }))),
    ]).start();
  }, [calm, card, stars, tiles]);

  // Leaves once, however many taps arrive. A tap in the first moments is almost always a finger still moving from the board.
  const shownAt = useRef(Date.now());
  const leave = () => {
    if (leaving.current || Date.now() - shownAt.current < 500) return;
    leaving.current = true;
    emitSound("LEVEL_RESUME"); // stop the fanfare and resume the in-game music
    navigation.goBack();
  };

  const avail = { w: width - insets.left - insets.right, h: height - insets.top - insets.bottom };
  const cardW = Math.min(avail.w * 0.94, 820);
  const cardH = Math.min(avail.h * 0.92, 420);
  const stacked = avail.w < 520;
  const hero = Math.min(cardH * 0.52, 200);
  const star = Math.max(30, Math.min(46, cardH * 0.12));

  const stats = [
    { key: "score" as const, label: t("complete.score"), value: n(score), color: "#FFE7A8" },
    { key: "gems" as const, label: t("complete.gems"), value: String(totalCoins || coins), color: "#7FE3FF" },
    { key: "kills" as const, label: t("complete.kills"), value: `${kills}/${totalEnemies}`, color: "#FF9A7A" },
    { key: "time" as const, label: t("complete.time"), value: formatTime(time), color: "#C8B6FF" },
  ];
  const showTrack = level < FLOORS;

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={StyleSheet.absoluteFill} onPress={leave} accessibilityRole="button" accessibilityLabel={t("complete.next")} />

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.card,
          { width: cardW, maxHeight: cardH, borderColor: accent + "AA", shadowColor: accent },
          { opacity: card, transform: [{ scale: card.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] },
        ]}
      >
        <ImageBackground source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={StyleSheet.absoluteFill} resizeMode="cover" imageStyle={{ opacity: 0.35 }} />
        <LinearGradient colors={["rgba(40,28,16,0.75)", "rgba(20,14,9,0.95)"]} style={StyleSheet.absoluteFill} pointerEvents="none" />

        <View style={[styles.body, stacked && { flexDirection: "column" }]} pointerEvents="box-none">
          {/* ── The hero and the floor's stars ─────────────────────────────────────────────── */}
          <View style={[styles.left, stacked && { width: "100%" }]} pointerEvents="none">
            <Text style={[styles.kicker, { color: accent }]} maxFontSizeMultiplier={1.2}>
              {t("complete.floor", { n: level }).toLocaleUpperCase()}
            </Text>
            <Text style={styles.title} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
              {t("complete.title").toLocaleUpperCase()}
            </Text>
            <View style={{ width: hero * 1.2, height: hero, alignItems: "center", justifyContent: "flex-end" }}>
              <View style={[styles.glow, { width: hero, height: hero, borderRadius: hero / 2, backgroundColor: accent }]} />
              <View style={[styles.pedestal, { width: hero * 0.7, backgroundColor: accent + "66" }]} />
              <SpriteImage source={character.winImage} style={{ width: hero * 1.1, height: hero }} resizeMode="contain" accessibilityIgnoresInvertColors />
            </View>
            <View style={styles.stars} accessible accessibilityLabel={`${t("complete.title")} ${starsEarned}/3`}>
              {stars.map((s, i) => {
                const won = i < starsEarned;
                const size = i === 1 ? star * 1.3 : star;
                return (
                  <Animated.View key={i} style={{ transform: [{ scale: s }], marginTop: i === 1 ? -10 : 0 }}>
                    <SpriteImage source={STAR} style={{ width: size, height: size, opacity: won ? 1 : 0.22 }} resizeMode="contain" />
                  </Animated.View>
                );
              })}
            </View>
          </View>

          {/* ── What the floor gave, the way down, and on ─────────────────────────────────── */}
          <View style={[styles.right, stacked && { width: "100%" }]} pointerEvents="box-none">
            <View style={styles.grid} pointerEvents="none">
              {stats.map((s, i) => (
                <Animated.View
                  key={s.key}
                  style={[styles.tile, { opacity: tiles[i], transform: [{ translateY: tiles[i].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}
                  accessible
                  accessibilityLabel={`${s.label}: ${s.value}`}
                >
                  <SpriteImage source={ART[s.key]} style={styles.tileArt} resizeMode="contain" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tileValue, { color: s.color }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.15}>
                      {s.value}
                    </Text>
                    <Text style={styles.tileLabel} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                      {s.label.toLocaleUpperCase()}
                    </Text>
                  </View>
                </Animated.View>
              ))}
            </View>

            {showTrack ? (
              <View style={styles.track} pointerEvents="none" accessible accessibilityLabel={t("complete.track", { n: level, total: FLOORS })}>
                {Array.from({ length: FLOORS }, (_, i) => {
                  const floor = i + 1;
                  const done = floor <= level;
                  const lair = floor === FLOORS;
                  return (
                    <React.Fragment key={floor}>
                      {i > 0 ? <View style={[styles.trackLine, floor <= level && { backgroundColor: accent }]} /> : null}
                      {lair ? (
                        <SpriteImage source={require("../assets/sprites/ui/Icon_Skull.png")} style={styles.trackLair} resizeMode="contain" />
                      ) : (
                        <View style={[styles.trackDot, done && { backgroundColor: accent, borderColor: accent }, floor === level + 1 && styles.trackNext]} />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            ) : null}
            {showTrack ? (
              <Text style={styles.trackText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {t("complete.track", { n: level, total: FLOORS })}
              </Text>
            ) : null}

            <PopButton label={t("complete.next")} icon="arrow-forward" tint={accent} onPress={leave} accessibilityLabel={t("complete.next")} />
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "rgba(10, 7, 4, 0.9)", justifyContent: "center", alignItems: "center" },
  card: { borderRadius: 26, borderWidth: 2.5, overflow: "hidden", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 22, elevation: 20 },
  body: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  left: { flex: 1, alignItems: "center", gap: 2 },
  right: { flex: 1.15, gap: 10 },
  kicker: { fontWeight: "900", fontSize: 13, letterSpacing: 3 },
  title: { color: "#fff", fontWeight: "900", fontSize: 26, letterSpacing: 2, textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  glow: { position: "absolute", top: 0, opacity: 0.16 },
  pedestal: { position: "absolute", bottom: 0, height: 12, borderRadius: 50 },
  stars: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { flexBasis: "47%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(0,0,0,0.35)" },
  tileArt: { width: 36, height: 36 },
  tileValue: { fontWeight: "900", fontSize: 20 },
  tileLabel: { color: "#B99A7C", fontWeight: "900", fontSize: 11, letterSpacing: 1 },
  track: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  trackLine: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.14)" },
  trackDot: { width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: "rgba(255,255,255,0.35)", backgroundColor: "rgba(0,0,0,0.4)" },
  trackNext: { borderColor: "#FFE7A8", width: 16, height: 16, borderRadius: 8 },
  trackLair: { width: 24, height: 24 },
  trackText: { color: "#CAB39C", fontSize: 11.5, fontWeight: "800", textAlign: "center", marginTop: -4 },
});

export default LevelCompleteScreen;
