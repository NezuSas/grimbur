import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ImageBackground, ScrollView, StyleSheet, View } from "react-native";
import { useWindowDimensions } from "../ui/layout/scaledWindow";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Text from "../ui/components/Text";
import SpriteImage from "../ui/components/SpriteImage";
import ScreenHeader from "../ui/components/ScreenHeader";
import PressScale from "../ui/components/PressScale";
import EmberIcon from "../ui/components/EmberIcon";
import { RootStackParamList } from "../navigation/types";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { getLocalStats, peekLocalStats } from "../services/localStats";
import { PUZZLE_COUNT, PUZZLE_TIERS, PUZZLES_PER_TIER, dailyPuzzleTier } from "../core/puzzles/puzzles";
import { DAILY_PUZZLE_EMBERS, EMBERS_PER_STAR, MAX_STARS, dailyPuzzleStars, dailyPuzzleStreak, isPuzzleOpen, nextPuzzle, puzzleStarsAt, totalPuzzleStars } from "../core/stats/puzzleProgress";
import { dailyKey, msUntilNextDay } from "../core/engine/seed";
import { formatCountdown } from "../core/stats/countdown";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/en";
import { analytics } from "../services/analytics";

type Props = NativeStackScreenProps<RootStackParamList, "PuzzlesScreen">;

const TINT = "#4DD0E1";
const GOLD = "#FFD54F";
const STAR = require("../assets/sprites/ui/Icon_Star.png");
const TIER_TINTS = ["#9EE37D", "#4FC3F7", "#B39DDB", "#FF9A3C", "#FF5252"];

const Stars = ({ n, size }: { n: number; size: number }) => (
  <View style={styles.starRow}>
    {Array.from({ length: MAX_STARS }, (_, i) => (
      <SpriteImage key={i} source={STAR} style={{ width: size, height: size, opacity: i < n ? 1 : 0.16 }} resizeMode="contain" />
    ))}
  </View>
);

/**
 * The cave's puzzles: the day's puzzle (the same for everyone) and a path of numbered ones in five levels, each opening once the
 * one before it is solved. Stars say how cleanly each was solved; embers pay every new star.
 */
export default function PuzzlesScreen({ navigation }: Props) {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const [stats, setStats] = useState<LocalStats>(() => peekLocalStats() ?? EMPTY_STATS);
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void getLocalStats().then(s => alive && setStats(s));
      setNow(new Date());
      return () => {
        alive = false;
      };
    }, []),
  );
  useEffect(() => {
    analytics.track("screen_view", { screen: "puzzles" });
  }, []);

  const today = dailyKey(now);
  const puzzles = stats.puzzles;
  const dailyStars = dailyPuzzleStars(puzzles, today);
  const dailyTier = dailyPuzzleTier(today);
  const streak = dailyPuzzleStreak(puzzles, today);
  const next = nextPuzzle(puzzles);
  const stars = totalPuzzleStars(puzzles);
  const wide = width >= 720;
  const tile = Math.max(46, Math.min(64, Math.floor(((wide ? width * 0.62 : width) - 64 - 5 * 8) / PUZZLES_PER_TIER)));

  const daily = (
    <PressScale
      onPress={() => navigation.navigate("PuzzleScreen", { target: "daily" })}
      style={[styles.daily, wide && styles.dailyWide]}
      accessibilityRole="button"
      accessibilityLabel={`${t("puzzle.daily")}. ${t(`puzzle.tier.${dailyTier}` as TranslationKey)}. ${dailyStars > 0 ? t("puzzle.stars", { n: dailyStars }) : t("puzzle.dailyReward", { n: DAILY_PUZZLE_EMBERS })}`}
    >
      <View style={styles.dailyHead}>
        <Ionicons name="calendar" size={16} color={TINT} />
        <Text style={styles.dailyKicker} numberOfLines={1} maxFontSizeMultiplier={1.15}>
          {t("puzzle.daily").toLocaleUpperCase()}
        </Text>
        {streak > 0 ? (
          <View style={styles.streak} accessible accessibilityLabel={streak === 1 ? t("puzzle.streak1") : t("puzzle.streak", { n: streak })}>
            <Text style={styles.streakText} maxFontSizeMultiplier={1.15}>{`🔥 ${streak}`}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.dailyTier, { color: TIER_TINTS[dailyTier] }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
        {t(`puzzle.tier.${dailyTier}` as TranslationKey)}
      </Text>
      {dailyStars > 0 ? (
        <>
          <Stars n={dailyStars} size={22} />
          <Text style={styles.dailyNote} numberOfLines={2} maxFontSizeMultiplier={1.15}>
            {t("puzzle.dailyDone", { time: formatCountdown(msUntilNextDay(now)) })}
          </Text>
        </>
      ) : (
        <View style={styles.dailyReward}>
          <EmberIcon size={14} />
          <Text style={styles.dailyRewardText} maxFontSizeMultiplier={1.15}>
            {t("puzzle.dailyReward", { n: DAILY_PUZZLE_EMBERS })}
          </Text>
        </View>
      )}
      <View style={styles.dailyButton}>
        <Text style={styles.dailyButtonText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.15}>
          {(dailyStars > 0 ? (dailyStars < MAX_STARS ? t("puzzle.improve") : t("puzzle.replay")) : t("puzzle.solve")).toLocaleUpperCase()}
        </Text>
      </View>
    </PressScale>
  );

  const path = useMemo(
    () =>
      PUZZLE_TIERS.map((_, tier) => (
        <View key={tier} style={styles.tier}>
          <View style={styles.tierHead}>
            <Text style={[styles.tierName, { color: TIER_TINTS[tier] }]} maxFontSizeMultiplier={1.15}>
              {t(`puzzle.tier.${tier}` as TranslationKey).toLocaleUpperCase()}
            </Text>
            <Text style={styles.tierSize} maxFontSizeMultiplier={1.15}>
              {`${PUZZLE_TIERS[tier].rows}×${PUZZLE_TIERS[tier].cols}`}
            </Text>
          </View>
          <View style={styles.tiles}>
            {Array.from({ length: PUZZLES_PER_TIER }, (_, k) => {
              const i = tier * PUZZLES_PER_TIER + k;
              const open = isPuzzleOpen(puzzles, i);
              const got = puzzleStarsAt(puzzles, i);
              const current = i === next && got === 0;
              return (
                <PressScale
                  key={i}
                  disabled={!open}
                  onPress={() => navigation.navigate("PuzzleScreen", { target: i })}
                  style={[
                    styles.tile,
                    { width: tile, height: tile + 10, borderColor: open ? TIER_TINTS[tier] + (current ? "FF" : "77") : "rgba(255,255,255,0.12)" },
                    current && { backgroundColor: TIER_TINTS[tier] + "33" },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !open }}
                  accessibilityLabel={`${t("puzzle.number", { n: i + 1 })}. ${open ? (got > 0 ? t("puzzle.stars", { n: got }) : t("puzzle.unsolved")) : t("puzzle.locked")}`}
                >
                  {open ? (
                    <>
                      <Text style={[styles.tileNumber, current && { color: "#fff" }]} maxFontSizeMultiplier={1.1}>
                        {i + 1}
                      </Text>
                      <Stars n={got} size={Math.round(tile / 4.6)} />
                    </>
                  ) : (
                    <Ionicons name="lock-closed" size={16} color="#8d8178" />
                  )}
                </PressScale>
              );
            })}
          </View>
        </View>
      )),
    [puzzles, next, tile, t, navigation],
  );

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(10, 13, 16, 0.88)" }} edges={["top", "left", "right"]}>
        <ScreenHeader
          title={t("puzzle.title")}
          subtitle={t("puzzle.subtitle")}
          onBack={() => navigation.goBack()}
          right={
            <View style={styles.total} accessible accessibilityLabel={t("puzzle.totalStars", { n: stars, total: PUZZLE_COUNT * MAX_STARS })}>
              <SpriteImage source={STAR} style={{ width: 18, height: 18 }} resizeMode="contain" />
              <Text style={styles.totalText} maxFontSizeMultiplier={1.15}>
                {`${stars}/${PUZZLE_COUNT * MAX_STARS}`}
              </Text>
            </View>
          }
        />
        <View style={[styles.body, wide && styles.bodyWide]}>
          {wide ? daily : null}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.pathContent} showsVerticalScrollIndicator={false}>
            {!wide ? daily : null}
            <Text style={styles.pathNote} maxFontSizeMultiplier={1.15}>
              {t("puzzle.pathNote", { n: EMBERS_PER_STAR })}
            </Text>
            {path}
          </ScrollView>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  body: { flex: 1, paddingHorizontal: 16 },
  bodyWide: { flexDirection: "row", gap: 16, paddingBottom: 12 },
  pathContent: { gap: 10, paddingBottom: 24, alignItems: "center" },
  pathNote: { color: "#bfb3a6", fontSize: 12, textAlign: "center" },
  daily: {
    alignSelf: "stretch",
    gap: 4,
    padding: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: TINT + "AA",
    backgroundColor: "rgba(20, 40, 46, 0.9)",
    alignItems: "center",
  },
  dailyWide: { width: 220, alignSelf: "flex-start", marginTop: 4 },
  dailyHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  streak: { marginLeft: "auto", paddingHorizontal: 7, paddingVertical: 1, borderRadius: 9, backgroundColor: "rgba(255,138,101,0.18)", borderWidth: 1, borderColor: "#FF8A6588" },
  streakText: { color: "#FFCCBC", fontWeight: "900", fontSize: 12 },
  dailyKicker: { color: TINT, fontWeight: "900", letterSpacing: 2, fontSize: 12 },
  dailyTier: { fontWeight: "900", fontSize: 20 },
  dailyNote: { color: "#cfe9ee", fontSize: 12, textAlign: "center" },
  dailyReward: { flexDirection: "row", alignItems: "center", gap: 4 },
  dailyRewardText: { color: "#FFCC80", fontWeight: "800", fontSize: 12 },
  dailyButton: { marginTop: 4, alignSelf: "stretch", minHeight: 40, borderRadius: 14, backgroundColor: TINT, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, borderBottomWidth: 3, borderBottomColor: "#00838F" },
  dailyButtonText: { color: "#06262B", fontWeight: "900", letterSpacing: 1, fontSize: 14 },
  tier: { gap: 6, alignItems: "center" },
  tierHead: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  tierName: { fontWeight: "900", letterSpacing: 2, fontSize: 13 },
  tierSize: { color: "#8d8178", fontSize: 11, fontWeight: "700" },
  tiles: { flexDirection: "row", gap: 8 },
  tile: { borderRadius: 14, borderWidth: 2, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", gap: 3 },
  tileNumber: { color: "#E6D6C2", fontWeight: "900", fontSize: 18 },
  starRow: { flexDirection: "row", gap: 1 },
  total: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.4)", borderWidth: 1, borderColor: GOLD + "66" },
  totalText: { color: GOLD, fontWeight: "900", fontSize: 13 },
});
