import React, { useCallback, useState } from "react";
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
import { chartRuns, trendOf } from "../core/stats/progress";
import { getLocalStats } from "../services/localStats";
import characters from "../data/characters";
import { useT } from "../i18n/useT";
import { heroText } from "../i18n/keys";

type Props = NativeStackScreenProps<RootStackParamList, "ProgressScreen">;

const GOLD = "#F2C14E";
const CHART_HEIGHT = 130;

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

  const runs = chartRuns(stats.history);
  const best = Math.max(1, ...runs.map(r => r.score));
  const trend = trendOf(runs);
  const usable = width - Math.max(insets.left, 8) - Math.max(insets.right, 8) - 16;
  const pageWidth = Math.min(usable, 1000);
  const wide = pageWidth >= 640;

  const tiles: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tint: string }[] = [
    { icon: "game-controller", label: t("progress.runs"), value: String(stats.gamesPlayed), tint: "#90CAF9" },
    { icon: "trophy", label: t("progress.wins"), value: String(stats.victories), tint: GOLD },
    { icon: "diamond", label: t("progress.gems"), value: stats.totalGems.toLocaleString(), tint: "#4FC3F7" },
    { icon: "flame", label: t("progress.embers"), value: stats.lifetimeEmbers.toLocaleString(), tint: "#FFAB40" },
    { icon: "arrow-down-circle", label: t("progress.floor"), value: String(stats.bestLevel), tint: "#CE93D8" },
    { icon: "infinite", label: t("progress.endless"), value: String(stats.bestEndlessFloor), tint: "#B39DDB" },
    { icon: "calendar", label: t("progress.dailies"), value: String(stats.dailyRuns), tint: "#FF9A3C" },
    { icon: "bonfire", label: t("progress.streak"), value: String(stats.streak), tint: "#FF7043" },
  ];

  const maxWins = Math.max(1, ...stats.heroWins);

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(6,4,16,0.88)" }}>
        <ScreenHeader title={t("progress.title")} onBack={() => navigation.goBack()} />
        <ScrollView
          style={{ alignSelf: "center", width: pageWidth }}
          contentContainerStyle={{ padding: 8, paddingBottom: 24 + insets.bottom, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.panel}>
            <Text style={styles.panelTitle} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
              {t("progress.recent").toLocaleUpperCase()}
            </Text>
            {runs.length === 0 ? (
              <Text style={styles.empty} maxFontSizeMultiplier={1.2}>
                {t("progress.recent.empty")}
              </Text>
            ) : (
              <>
                <View style={[styles.chart, { height: CHART_HEIGHT }]} accessible accessibilityLabel={`${t("progress.recent")}: ${runs.map(r => r.score).join(", ")}`}>
                  {runs.map((r, i) => (
                    <View key={i} style={styles.barSlot}>
                      <View
                        style={[
                          styles.bar,
                          { height: Math.max(6, (r.score / best) * (CHART_HEIGHT - 8)), backgroundColor: r.victory ? GOLD : "#6C7BD9" },
                        ]}
                      />
                    </View>
                  ))}
                </View>
                <View style={styles.legend}>
                  <View style={[styles.swatch, { backgroundColor: GOLD }]} />
                  <Text style={styles.legendText} maxFontSizeMultiplier={1.2}>{t("progress.legend.win")}</Text>
                  <View style={[styles.swatch, { backgroundColor: "#6C7BD9" }]} />
                  <Text style={styles.legendText} maxFontSizeMultiplier={1.2}>{t("progress.legend.run")}</Text>
                  <Text style={[styles.legendText, { marginLeft: "auto" }]} maxFontSizeMultiplier={1.2}>
                    {best.toLocaleString()}
                  </Text>
                </View>
                {trend && (
                  <Text style={[styles.trend, trend === "up" && { color: "#9ee37d" }, trend === "down" && { color: "#FF8A80" }]} maxFontSizeMultiplier={1.2}>
                    {t(`progress.trend.${trend}` as "progress.trend.up")}
                  </Text>
                )}
              </>
            )}
          </View>

          <View style={styles.grid}>
            {tiles.map(tile => (
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

          <View style={styles.panel}>
            <Text style={styles.panelTitle} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
              {t("progress.heroes").toLocaleUpperCase()}
            </Text>
            {characters.map((c, i) => (
              <View key={i} style={styles.heroRow} accessible accessibilityLabel={`${heroText(t, i, "name")}: ${stats.heroWins[i] ?? 0}`}>
                <SpriteImage source={c.scoreImage} style={styles.heroIcon} accessibilityIgnoresInvertColors />
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
  empty: { color: "#c9c3e6", fontSize: 14, paddingVertical: 12 },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 4, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  barSlot: { flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" },
  bar: { width: "78%", borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  legend: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legendText: { color: "#a8a2c4", fontSize: 11, fontWeight: "700", marginRight: 8 },
  trend: { color: "#d8d2f0", fontWeight: "700", fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { flexGrow: 1, backgroundColor: "rgba(20,15,40,0.85)", borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", padding: 12, alignItems: "center", gap: 2 },
  tileValue: { color: "#fff", fontWeight: "900", fontSize: 24 },
  tileLabel: { color: "#a8a2c4", fontSize: 11, fontWeight: "700" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.08)" },
  heroName: { color: "#fff", fontWeight: "800", fontSize: 14, width: 70 },
  heroTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  heroFill: { height: "100%", borderRadius: 5, backgroundColor: GOLD },
  heroCount: { color: GOLD, fontWeight: "900", fontSize: 15, minWidth: 28, textAlign: "right" },
});

export default ProgressScreen;
