import React, { useCallback, useMemo, useState } from "react";
import { ImageBackground, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Text from "../ui/components/Text";
import SpriteImage from "../ui/components/SpriteImage";
import ScreenHeader from "../ui/components/ScreenHeader";
import { RootStackParamList } from "../navigation/types";
import { useGameLayout } from "../ui/layout/useGameLayout";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { chartRuns, playedDays, recentList, trendOf, winRate } from "../core/stats/progress";
import { ACHIEVEMENTS } from "../core/stats/achievements";
import { dailyKey } from "../core/engine/seed";
import { getLocalStats } from "../services/localStats";
import characters from "../data/characters";
import { useT } from "../i18n/useT";
import { achievementText, heroText } from "../i18n/keys";

type Props = NativeStackScreenProps<RootStackParamList, "ProgressScreen">;

const GOLD = "#F2C14E";
const CHART_HEIGHT = 120;
/** A trend chart says nothing with fewer runs than this. */
const CHART_MIN_RUNS = 5;

const ProgressScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const { insets } = useGameLayout();
  const [stats, setStats] = useState<LocalStats>(EMPTY_STATS);

  useFocusEffect(
    useCallback(() => {
      getLocalStats().then(setStats).catch(() => {});
    }, []),
  );

  const today = dailyKey();
  const runs = chartRuns(stats.history);
  const best = Math.max(0, ...runs.map(r => r.score));
  const trend = trendOf(runs);
  const list = recentList(stats.history, 8);
  const days = playedDays(stats.history, today, 14);
  const stored = stats.history.length;
  const olderGames = Math.max(0, stats.gamesPlayed - stored);
  const firstStored = stats.history[0]?.day;

  // The achievement that is closest to done: a real, honest next target.
  const next = useMemo(() => {
    const open = ACHIEVEMENTS.filter(a => !(a.id in stats.achievements) && a.progress)
      .map(a => ({ a, p: a.progress!(stats) }))
      .filter(x => x.p.current < x.p.target)
      .sort((x, y) => y.p.current / y.p.target - x.p.current / x.p.target);
    return open[0];
  }, [stats]);

  const usable = width - Math.max(insets.left, 8) - Math.max(insets.right, 8) - 16;
  const pageWidth = Math.min(usable, 1000);
  const wide = pageWidth >= 640;
  const maxWins = Math.max(1, ...stats.heroWins);

  const lifetime: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tint: string }[] = [
    { icon: "game-controller", label: t("progress.runs"), value: String(stats.gamesPlayed), tint: "#90CAF9" },
    { icon: "trophy", label: t("progress.wins"), value: String(stats.victories), tint: GOLD },
    { icon: "stats-chart", label: t("progress.winRate"), value: `${winRate(stats.victories, stats.gamesPlayed)}%`, tint: "#9ee37d" },
    { icon: "ribbon", label: t("progress.bestScore"), value: stats.bestScore.toLocaleString(), tint: "#FFAB40" },
    { icon: "arrow-down-circle", label: t("progress.floor"), value: String(stats.bestLevel), tint: "#CE93D8" },
    { icon: "infinite", label: t("progress.endless"), value: String(stats.bestEndlessFloor), tint: "#B39DDB" },
    { icon: "diamond", label: t("progress.gems"), value: stats.totalGems.toLocaleString(), tint: "#4FC3F7" },
    { icon: "bonfire", label: t("progress.streak"), value: String(stats.streak), tint: "#FF7043" },
  ];

  const heroOf = (i: number) => characters[i] ?? characters[0];

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(6,4,16,0.88)" }}>
        <ScreenHeader title={t("progress.title")} onBack={() => navigation.goBack()} />
        <ScrollView
          style={{ alignSelf: "center", width: pageWidth }}
          contentContainerStyle={{ padding: 8, paddingBottom: 24 + insets.bottom, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Lifetime numbers: exact for every game ever played, so they lead */}
          <View style={styles.grid}>
            {lifetime.map(tile => (
              <View key={tile.label} style={[styles.tile, { flexBasis: wide ? "23%" : "47%" }]} accessible accessibilityLabel={`${tile.label}: ${tile.value}`}>
                <Ionicons name={tile.icon} size={20} color={tile.tint} />
                <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                  {tile.value}
                </Text>
                <Text style={styles.tileLabel} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                  {tile.label}
                </Text>
              </View>
            ))}
          </View>

          {/* 2. Next goal */}
          {next && (
            <View style={styles.next} accessible accessibilityLabel={`${achievementText(t, next.a.id, "name")}. ${next.p.current}/${next.p.target}`}>
              <Text style={styles.nextIcon}>{next.a.icon}</Text>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.nextKicker} maxFontSizeMultiplier={1.1}>
                  {t("progress.next").toLocaleUpperCase()}
                </Text>
                <Text style={styles.nextName} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {achievementText(t, next.a.id, "name")}
                </Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round((next.p.current / next.p.target) * 100)}%` }]} />
                </View>
              </View>
              <Text style={styles.nextCount} maxFontSizeMultiplier={1.1}>
                {next.p.current}/{next.p.target}
              </Text>
            </View>
          )}

          {/* 3. The runs themselves */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
              {t("progress.recent").toLocaleUpperCase()}
            </Text>
            {list.length === 0 ? (
              <Text style={styles.empty} maxFontSizeMultiplier={1.2}>
                {t("progress.recent.empty")}
              </Text>
            ) : (
              list.map((r, i) => {
                const modeIcon = r.mode === "daily" ? "calendar" : r.mode === "endless" ? "infinite" : "compass";
                return (
                  <View key={i} style={styles.runRow} accessible accessibilityLabel={`${r.day}. ${r.victory ? t("progress.legend.win") : t("progress.legend.run")}. ${t("scores.floorShort", { n: r.level })}. ${r.score}`}>
                    <View style={[styles.result, r.victory ? styles.resultWin : styles.resultLoss]}>
                      <Ionicons name={r.victory ? "trophy" : "close"} size={16} color={r.victory ? "#1a1030" : "#d8d2f0"} />
                    </View>
                    <Ionicons name={modeIcon} size={16} color="#a8a2c4" />
                    <Text style={styles.runFloor} maxFontSizeMultiplier={1.2}>
                      {t("scores.floorShort", { n: r.level })}
                    </Text>
                    <Text style={styles.runDay} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                      {r.day}
                    </Text>
                    <View style={{ flex: 1 }} />
                    {r.best && <Ionicons name="star" size={16} color={GOLD} />}
                    <Text style={[styles.runScore, r.best && { color: GOLD }]} maxFontSizeMultiplier={1.2}>
                      {r.mode === "endless" ? "∞" : r.score.toLocaleString()}
                    </Text>
                  </View>
                );
              })
            )}
            {/* Honest about what is stored */}
            {olderGames > 0 && stored > 0 && (
              <Text style={styles.note} maxFontSizeMultiplier={1.2}>
                {t("progress.since", { date: firstStored ?? today, count: olderGames })}
              </Text>
            )}
            {olderGames > 0 && stored === 0 && (
              <Text style={styles.note} maxFontSizeMultiplier={1.2}>
                {t("progress.earlier", { count: olderGames })}
              </Text>
            )}
          </View>

          {/* 4. Days played (fixed slots; untracked days stay blank) */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
              {t("progress.calendar").toLocaleUpperCase()}
            </Text>
            <View style={styles.calendar} accessible accessibilityLabel={`${t("progress.calendar")}: ${days.filter(d => d.played).length}/${days.length}`}>
              {days.map(d => (
                <View key={d.day} style={[styles.day, d.played && styles.dayOn, d.day === today && styles.dayToday]} />
              ))}
            </View>
          </View>

          {/* 5. Trend: only with enough runs to mean something, from zero, with the best as a reference */}
          {runs.length >= CHART_MIN_RUNS && best > 0 ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
                {t("progress.trend").toLocaleUpperCase()}
              </Text>
              <View style={[styles.chart, { height: CHART_HEIGHT }]} accessible accessibilityLabel={`${t("progress.trend")}: ${runs.map(r => r.score).join(", ")}`}>
                <View style={styles.bestLine} pointerEvents="none" />
                {runs.map((r, i) => (
                  <View key={i} style={styles.barSlot}>
                    <View style={[styles.bar, { height: Math.max(6, (r.score / best) * (CHART_HEIGHT - 8)), backgroundColor: r.victory ? GOLD : "#6C7BD9" }]} />
                  </View>
                ))}
              </View>
              <View style={styles.legend}>
                <View style={[styles.swatch, { backgroundColor: GOLD }]} />
                <Text style={styles.legendText} maxFontSizeMultiplier={1.2}>{t("progress.legend.win")}</Text>
                <View style={[styles.swatch, { backgroundColor: "#6C7BD9" }]} />
                <Text style={styles.legendText} maxFontSizeMultiplier={1.2}>{t("progress.legend.run")}</Text>
                <Text style={[styles.legendText, { marginLeft: "auto" }]} maxFontSizeMultiplier={1.2}>
                  {t("progress.bestOfLast", { count: runs.length, score: best.toLocaleString() })}
                </Text>
              </View>
              {trend && (
                <Text style={[styles.trend, trend === "up" && { color: "#9ee37d" }, trend === "down" && { color: "#FF8A80" }]} maxFontSizeMultiplier={1.2}>
                  {t(`progress.trend.${trend}` as "progress.trend.up")}
                </Text>
              )}
            </View>
          ) : stored > 0 ? (
            <Text style={styles.note} maxFontSizeMultiplier={1.2}>
              {t("progress.chartSoon", { count: CHART_MIN_RUNS - runs.length })}
            </Text>
          ) : null}

          {/* 6. Heroes */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
              {t("progress.heroes").toLocaleUpperCase()}
            </Text>
            {characters.map((_, i) => (
              <View key={i} style={styles.heroRow} accessible accessibilityLabel={`${heroText(t, i, "name")}: ${stats.heroWins[i] ?? 0}`}>
                <SpriteImage source={heroOf(i).scoreImage} style={styles.heroIcon} accessibilityIgnoresInvertColors />
                <Text style={styles.heroName} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {heroText(t, i, "name")}
                </Text>
                <View style={styles.heroTrack}>
                  <View style={[styles.heroFill, { width: `${Math.round(((stats.heroWins[i] ?? 0) / maxWins) * 100)}%` }]} />
                </View>
                <Text style={styles.heroCount} maxFontSizeMultiplier={1.2}>
                  {stats.heroWins[i] ?? 0}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  panel: { borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(20,15,40,0.85)", padding: 14, gap: 8 },
  panelTitle: { color: GOLD, fontWeight: "800", letterSpacing: 2, fontSize: 12 },
  empty: { color: "#c9c3e6", fontSize: 14, paddingVertical: 8 },
  note: { color: "#a8a2c4", fontSize: 12, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { flexGrow: 1, backgroundColor: "rgba(20,15,40,0.85)", borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", padding: 12, alignItems: "center", gap: 2 },
  tileValue: { color: "#fff", fontWeight: "900", fontSize: 24 },
  tileLabel: { color: "#a8a2c4", fontSize: 11, fontWeight: "700" },
  next: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(144,202,249,0.45)", backgroundColor: "rgba(144,202,249,0.1)", padding: 12 },
  nextIcon: { fontSize: 28 },
  nextKicker: { color: "#90CAF9", fontWeight: "800", letterSpacing: 2, fontSize: 10 },
  nextName: { color: "#fff", fontWeight: "800", fontSize: 15 },
  nextCount: { color: "#b8c7e6", fontWeight: "800", fontSize: 13 },
  track: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4, backgroundColor: "#90CAF9" },
  runRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 40, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.06)", paddingVertical: 2 },
  result: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  resultWin: { backgroundColor: GOLD },
  resultLoss: { backgroundColor: "rgba(255,255,255,0.1)" },
  runFloor: { color: "#fff", fontWeight: "800", fontSize: 15, minWidth: 36 },
  runDay: { color: "#8f8aa8", fontSize: 12 },
  runScore: { color: "#d8d2f0", fontWeight: "900", fontSize: 16, minWidth: 64, textAlign: "right" },
  // Two even rows of seven, whatever the width.
  calendar: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 6 },
  day: { width: "12.5%", aspectRatio: 1.4, maxHeight: 26, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.08)" },
  dayOn: { backgroundColor: "#FF9A3C" },
  dayToday: { borderWidth: 2, borderColor: "#fff" },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 8, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  bestLine: { position: "absolute", left: 0, right: 0, top: 0, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(242,193,78,0.6)" },
  barSlot: { width: 26, alignItems: "center", justifyContent: "flex-end", height: "100%" },
  bar: { width: 22, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  legend: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legendText: { color: "#a8a2c4", fontSize: 11, fontWeight: "700", marginRight: 8 },
  trend: { color: "#d8d2f0", fontWeight: "700", fontSize: 13 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.08)" },
  heroName: { color: "#fff", fontWeight: "800", fontSize: 14, width: 70 },
  heroTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  heroFill: { height: "100%", borderRadius: 5, backgroundColor: GOLD },
  heroCount: { color: GOLD, fontWeight: "900", fontSize: 15, minWidth: 28, textAlign: "right" },
});

export default ProgressScreen;
