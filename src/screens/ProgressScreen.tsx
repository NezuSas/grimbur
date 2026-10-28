import React, { useCallback, useMemo, useState } from "react";
import { ImageBackground, ScrollView, StyleSheet, View } from "react-native";
import { useWindowDimensions } from "../ui/layout/scaledWindow";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Text from "../ui/components/Text";
import SpriteImage from "../ui/components/SpriteImage";
import ScreenHeader from "../ui/components/ScreenHeader";
import { RootStackParamList } from "../navigation/types";
import { useGameLayout } from "../ui/layout/useGameLayout";
import { EMPTY_STATS, LocalStats, streakStatus } from "../core/stats/runStats";
import { chartRuns, playedDays, recentList, trendOf, winRate } from "../core/stats/progress";
import { ACHIEVEMENTS, AchievementTier } from "../core/stats/achievements";
import { UPGRADES } from "../core/stats/forge";
import { MAX_ASCENSION } from "../core/engine/ascension";
import { GAME_CONFIG } from "../config/gameConfig";
import { dailyKey } from "../core/engine/seed";
import { getLocalStats, peekLocalStats } from "../services/localStats";
import characters from "../data/characters";
import { useT } from "../i18n/useT";
import { achievementText, heroText } from "../i18n/keys";
import type { TranslationKey } from "../i18n/en";

type Props = NativeStackScreenProps<RootStackParamList, "ProgressScreen">;

const GOLD = "#F2C14E";
const TIER_COLOR: Record<AchievementTier, string> = { easy: "#A5D6A7", medium: "#90CAF9", hard: "#FFAB91", legend: "#CE93D8" };
const TIERS: AchievementTier[] = ["easy", "medium", "hard", "legend"];
const CHART_HEIGHT = 110;
/** A trend chart says nothing with fewer runs than this. */
const CHART_MIN_RUNS = 5;

/** A framed block with an icon, a title and a big number: the building piece of this screen. */
const Card = ({
  icon,
  tint,
  title,
  value,
  caption,
  basis,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  title: string;
  value?: string;
  caption?: string;
  basis: string;
  children?: React.ReactNode;
}) => (
  <View style={[styles.card, { flexBasis: basis as `${number}%` }]} accessible accessibilityLabel={`${title}${value ? `: ${value}` : ""}${caption ? `. ${caption}` : ""}`}>
    <View style={styles.cardHead}>
      <View style={[styles.cardIcon, { backgroundColor: tint + "26", borderColor: tint + "99" }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={styles.cardTitle} numberOfLines={1} maxFontSizeMultiplier={1.15}>
        {title.toLocaleUpperCase()}
      </Text>
    </View>
    {value ? (
      <Text style={styles.cardValue} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.15}>
        {value}
      </Text>
    ) : null}
    {children}
    {caption ? (
      <Text style={styles.cardCaption} numberOfLines={2} maxFontSizeMultiplier={1.15}>
        {caption}
      </Text>
    ) : null}
  </View>
);

/** A row of steps, the first `filled` of them lit. */
const Steps = ({ total, filled, color }: { total: number; filled: number; color: string }) => (
  <View style={styles.steps}>
    {Array.from({ length: total }, (_, i) => (
      <View key={i} style={[styles.step, i < filled && { backgroundColor: color }]} />
    ))}
  </View>
);

const ProgressScreen: React.FC<Props> = ({ navigation }) => {
  const { t, n } = useT();
  const { width } = useWindowDimensions();
  const { insets } = useGameLayout();
  const [stats, setStats] = useState<LocalStats>(() => peekLocalStats() ?? EMPTY_STATS);

  useFocusEffect(
    useCallback(() => {
      getLocalStats().then(setStats).catch(() => {});
    }, []),
  );

  const today = dailyKey();
  const streak = streakStatus(stats, today);
  const runs = chartRuns(stats.history);
  const best = Math.max(0, ...runs.map(r => r.score));
  const trend = trendOf(runs);
  const list = recentList(stats.history, 6);
  const days = playedDays(stats.history, today, 14);
  const stored = stats.history.length;
  const olderGames = Math.max(0, stats.gamesPlayed - stored);

  const floors = GAME_CONFIG.expedition.floors;
  const unlocked = Object.keys(stats.achievements).length;
  const forgeTotal = UPGRADES.reduce((n, u) => n + u.costs.length, 0);
  const forgeBought = Object.values(stats.forge).reduce((n, l) => n + l, 0);
  const tierCounts = TIERS.map(tier => ({
    tier,
    total: ACHIEVEMENTS.filter(a => a.tier === tier).length,
    done: ACHIEVEMENTS.filter(a => a.tier === tier && a.id in stats.achievements).length,
  }));

  const next = useMemo(() => {
    const open = ACHIEVEMENTS.filter(a => !(a.id in stats.achievements) && a.progress)
      .map(a => ({ a, p: a.progress!(stats) }))
      .filter(x => x.p.current < x.p.target)
      .sort((x, y) => y.p.current / y.p.target - x.p.current / x.p.target);
    return open[0];
  }, [stats]);

  const usable = width - Math.max(insets.left, 8) - Math.max(insets.right, 8) - 16;
  const pageWidth = Math.min(usable, 1000);
  const cols = pageWidth >= 760 ? 3 : pageWidth >= 480 ? 2 : 1;
  const basis = cols === 3 ? "32%" : cols === 2 ? "48.5%" : "100%";
  // Six heroes share one row: the portraits shrink on a narrow card rather than overflow it.
  const heroSize = Math.max(34, Math.min(58, Math.floor((pageWidth - 16 - 40 - 8 * (characters.length - 1)) / characters.length)));
  const maxWins = Math.max(1, ...stats.heroWins);

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(6,4,16,0.88)" }}>
        <ScreenHeader title={t("progress.title")} onBack={() => navigation.goBack()} />
        <ScrollView
          style={{ alignSelf: "center", width: pageWidth }}
          contentContainerStyle={{ padding: 8, paddingBottom: 24 + insets.bottom, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {/* The goal first: what to do next */}
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

          {/* Everything below fills from the lifetime counters, so it is never empty or misleading */}
          <View style={styles.grid}>
            <Card icon="arrow-down-circle" tint="#CE93D8" title={t("progress.floor")} value={`${stats.bestLevel}/${floors}`} basis={basis} caption={t("progress.floorCaption")}>
              <Steps total={floors} filled={Math.min(stats.bestLevel, floors)} color="#CE93D8" />
            </Card>

            <Card icon="trophy" tint={GOLD} title={t("progress.wins")} value={String(stats.victories)} basis={basis} caption={t("progress.winRateCaption", { rate: winRate(stats.victories, stats.gamesPlayed), runs: stats.gamesPlayed })}>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${winRate(stats.victories, stats.gamesPlayed)}%`, backgroundColor: GOLD }]} />
              </View>
            </Card>

            <Card icon="flame" tint="#FF9A5C" title={t("difficulty.title")} value={t(`ascension.label.${stats.maxAscension}` as TranslationKey)} basis={basis} caption={t("progress.difficultyCaption", { n: stats.maxAscension + 1, max: MAX_ASCENSION + 1 })}>
              <Steps total={MAX_ASCENSION + 1} filled={stats.maxAscension + 1} color="#FF9A5C" />
            </Card>

            <Card icon="ribbon" tint="#90CAF9" title={t("ach.title")} value={`${unlocked}/${ACHIEVEMENTS.length}`} basis={basis}>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round((unlocked / ACHIEVEMENTS.length) * 100)}%` }]} />
              </View>
              <View style={styles.tiers}>
                {tierCounts.map(c => (
                  <View key={c.tier} style={styles.tierItem}>
                    <View style={[styles.tierDot, { backgroundColor: TIER_COLOR[c.tier] }]} />
                    <Text style={styles.tierText} maxFontSizeMultiplier={1.1}>
                      {c.done}/{c.total}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>

            <Card icon="hammer" tint="#FFAB40" title={t("cover.forge")} value={`${forgeBought}/${forgeTotal}`} basis={basis} caption={t("progress.forgeCaption", { embers: stats.lifetimeEmbers })}>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round((forgeBought / forgeTotal) * 100)}%`, backgroundColor: "#FFAB40" }]} />
              </View>
            </Card>

            <Card icon="bonfire" tint="#FF7043" title={t("progress.streak")} value={String(streak.current)} basis={basis} caption={streak.lost > 0 ? t("cover.streak.lost", { best: streak.best }) : t("progress.calendar")}>
              <View style={styles.calendar}>
                {days.map(d => (
                  <View key={d.day} style={[styles.day, d.played && styles.dayOn, d.day === today && styles.dayToday]} />
                ))}
              </View>
            </Card>

            <Card icon="people" tint="#9ee37d" title={t("progress.heroes")} basis="100%">
              <View style={styles.heroes}>
                {characters.map((c, i) => {
                  const wins = stats.heroWins[i] ?? 0;
                  const used = stats.heroesUsed.includes(i);
                  return (
                    <View key={i} style={styles.hero} accessible accessibilityLabel={`${heroText(t, i, "name")}: ${wins}`}>
                      <View style={[styles.heroFrame, { width: heroSize, height: heroSize, borderRadius: heroSize / 2 }, wins > 0 && { borderColor: GOLD }, !used && { opacity: 0.35 }]}>
                        <SpriteImage source={c.scoreImage} style={[styles.heroIcon, { width: heroSize - 8, height: heroSize - 8, borderRadius: (heroSize - 8) / 2 }]} accessibilityIgnoresInvertColors />
                        {wins > 0 && (
                          <View style={styles.heroBadge}>
                            <Text style={styles.heroBadgeText} maxFontSizeMultiplier={1.1}>
                              {wins}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.heroName} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                        {heroText(t, i, "name")}
                      </Text>
                      <View style={styles.heroTrack}>
                        <View style={[styles.heroFill, { width: `${Math.round((wins / maxWins) * 100)}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          </View>

          {/* Run by run: this is the part that only fills as runs are recorded */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
              {t("progress.recent").toLocaleUpperCase()}
            </Text>
            {list.length === 0 ? (
              <Text style={styles.empty} maxFontSizeMultiplier={1.2}>
                {olderGames > 0 ? t("progress.earlier", { count: olderGames }) : t("progress.recent.empty")}
              </Text>
            ) : (
              <>
                {list.map((r, i) => {
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
                        {r.mode === "endless" ? "∞" : n(r.score)}
                      </Text>
                    </View>
                  );
                })}
                {olderGames > 0 && (
                  <Text style={styles.note} maxFontSizeMultiplier={1.2}>
                    {t("progress.since", { date: stats.history[0]?.day ?? today, count: olderGames })}
                  </Text>
                )}
              </>
            )}

            {runs.length >= CHART_MIN_RUNS && best > 0 ? (
              <>
                <Text style={[styles.panelTitle, { marginTop: 8 }]} maxFontSizeMultiplier={1.2}>
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
                {trend && (
                  <Text style={[styles.trend, trend === "up" && { color: "#9ee37d" }, trend === "down" && { color: "#FF8A80" }]} maxFontSizeMultiplier={1.2}>
                    {t(`progress.trend.${trend}` as "progress.trend.up")}
                  </Text>
                )}
              </>
            ) : (
              <View style={styles.soon}>
                <Ionicons name="bar-chart" size={18} color="#8f8aa8" />
                <Text style={styles.soonText} maxFontSizeMultiplier={1.2}>
                  {t("progress.chartSoon", { count: Math.max(1, CHART_MIN_RUNS - runs.length) })}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  card: { flexGrow: 1, borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(20,15,40,0.88)", padding: 14, gap: 8 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIcon: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: "#c9c3e6", fontWeight: "800", letterSpacing: 1.5, fontSize: 12, flex: 1 },
  cardValue: { color: "#fff", fontWeight: "900", fontSize: 34 },
  cardCaption: { color: "#9f9abb", fontSize: 12, fontWeight: "600" },
  steps: { flexDirection: "row", gap: 4 },
  step: { flex: 1, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.12)" },
  track: { height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 5, backgroundColor: "#90CAF9" },
  tiers: { flexDirection: "row", justifyContent: "space-between" },
  tierItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  tierDot: { width: 9, height: 9, borderRadius: 5 },
  tierText: { color: "#d8d2f0", fontSize: 12, fontWeight: "800" },
  next: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(144,202,249,0.45)", backgroundColor: "rgba(144,202,249,0.1)", padding: 12 },
  nextIcon: { fontSize: 28 },
  nextKicker: { color: "#90CAF9", fontWeight: "800", letterSpacing: 2, fontSize: 10 },
  nextName: { color: "#fff", fontWeight: "800", fontSize: 15 },
  nextCount: { color: "#b8c7e6", fontWeight: "800", fontSize: 13 },
  // Fourteen even slots in one row, whatever the card width.
  calendar: { flexDirection: "row", gap: 3 },
  day: { flex: 1, height: 22, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.1)" },
  dayOn: { backgroundColor: "#FF9A3C" },
  dayToday: { borderWidth: 2, borderColor: "#fff" },
  heroes: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  hero: { flex: 1, minWidth: 0, alignItems: "center", gap: 6 },
  heroFrame: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  heroIcon: { width: 50, height: 50, borderRadius: 25 },
  heroBadge: { position: "absolute", right: -4, bottom: -4, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: GOLD, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  heroBadgeText: { color: "#1a1030", fontWeight: "900", fontSize: 12 },
  heroName: { color: "#fff", fontWeight: "800", fontSize: 13 },
  heroTrack: { width: "80%", height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  heroFill: { height: "100%", backgroundColor: GOLD },
  panel: { borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(20,15,40,0.88)", padding: 14, gap: 8 },
  panelTitle: { color: GOLD, fontWeight: "800", letterSpacing: 2, fontSize: 12 },
  empty: { color: "#c9c3e6", fontSize: 14, paddingVertical: 4 },
  note: { color: "#a8a2c4", fontSize: 12, fontWeight: "600" },
  runRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 40, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.06)", paddingVertical: 2 },
  result: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  resultWin: { backgroundColor: GOLD },
  resultLoss: { backgroundColor: "rgba(255,255,255,0.1)" },
  runFloor: { color: "#fff", fontWeight: "800", fontSize: 15, minWidth: 36 },
  runDay: { color: "#8f8aa8", fontSize: 12 },
  runScore: { color: "#d8d2f0", fontWeight: "900", fontSize: 16, minWidth: 64, textAlign: "right" },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 4, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  bestLine: { position: "absolute", left: 0, right: 0, top: 0, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(242,193,78,0.6)" },
  // Up to 14 bars share whatever width the card has (fixed 26px slots overflowed narrow phones).
  barSlot: { flex: 1, maxWidth: 26, alignItems: "center", justifyContent: "flex-end", height: "100%" },
  bar: { width: "85%", maxWidth: 22, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  trend: { color: "#d8d2f0", fontWeight: "700", fontSize: 13 },
  soon: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.2)" },
  soonText: { color: "#a8a2c4", fontSize: 12, fontWeight: "700", flex: 1 },
});

export default ProgressScreen;
