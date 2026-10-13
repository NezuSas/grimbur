import React, { useCallback, useMemo, useState } from "react";
import { FlatList, ImageBackground, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Text from "../ui/components/Text";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "../navigation/types";
import { useGameLayout } from "../ui/layout/useGameLayout";
import { ACHIEVEMENTS, ACHIEVEMENT_REWARD, TIER_ORDER, AchievementTier } from "../core/stats/achievements";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { getLocalStats } from "../services/localStats";
import { useT } from "../i18n/useT";
import { achievementText } from "../i18n/keys";
import type { TranslationKey } from "../i18n/en";
import ScreenHeader from "../ui/components/ScreenHeader";

type Props = NativeStackScreenProps<RootStackParamList, "AchievementsScreen">;

const GOLD = "#F2C14E";

const TIER_COLOR: Record<AchievementTier, string> = { easy: "#A5D6A7", medium: "#90CAF9", hard: "#FFAB91", legend: "#CE93D8" };

const AchievementsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const { insets } = useGameLayout();
  const [stats, setStats] = useState<LocalStats>(EMPTY_STATS);
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");

  useFocusEffect(
    useCallback(() => {
      getLocalStats().then(setStats).catch(() => {});
    }, []),
  );

  // Earned ones first (newest first), then the ones still to chase in their normal order.
  const ordered = useMemo(() => {
    const earned = ACHIEVEMENTS.filter(a => a.id in stats.achievements).sort((a, b) =>
      stats.achievements[b.id].localeCompare(stats.achievements[a.id]),
    );
    // Still to chase: the nearest first (closest to done), then by tier, so the next goal is always on top.
    const open = ACHIEVEMENTS.filter(a => !(a.id in stats.achievements)).sort((x, y) => {
      const px = x.progress ? x.progress(stats) : null;
      const py = y.progress ? y.progress(stats) : null;
      const rx = px ? px.current / px.target : 0;
      const ry = py ? py.current / py.target : 0;
      return TIER_ORDER[x.tier] - TIER_ORDER[y.tier] || ry - rx;
    });
    return [...earned, ...open];
  }, [stats]);

  const done = ACHIEVEMENTS.length - ordered.filter(a => !(a.id in stats.achievements)).length;
  const total = ACHIEVEMENTS.length;
  const visible = ordered.filter(a => filter === "all" || (filter === "done") === (a.id in stats.achievements));

  // The three goals closest to being finished: a reason to play one more run.
  const nextGoals = useMemo(
    () =>
      ACHIEVEMENTS.filter(a => !(a.id in stats.achievements) && a.progress)
        .map(a => ({ a, p: a.progress!(stats) }))
        .filter(x => x.p.current > 0 && x.p.current < x.p.target)
        .sort((x, y) => y.p.current / y.p.target - x.p.current / x.p.target)
        .slice(0, 3),
    [stats],
  );
  const pending = ACHIEVEMENTS.filter(a => !(a.id in stats.achievements)).reduce((sum, a) => sum + ACHIEVEMENT_REWARD[a.tier], 0);
  const usable = width - Math.max(insets.left, 8) - Math.max(insets.right, 8) - 16;
  const cardWidth = Math.min(usable, 1100);
  const columns = cardWidth >= 900 ? 3 : cardWidth >= 560 ? 2 : 1;

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(6,4,16,0.88)" }}>
        <ScreenHeader title={t("ach.title")} subtitle={t("ach.progress", { done, total })} onBack={() => navigation.goBack()} />

        <FlatList
          key={columns}
          data={visible}
          numColumns={columns}
          keyExtractor={a => a.id}
          style={{ alignSelf: "center", width: cardWidth }}
          contentContainerStyle={{ padding: 8, paddingBottom: 24 + insets.bottom, gap: 10 }}
          columnWrapperStyle={columns > 1 ? { gap: 10 } : undefined}
          ListHeaderComponent={
            <View style={{ gap: 10, marginBottom: 2 }}>
              <View style={styles.overall} accessible accessibilityLabel={t("ach.progress", { done, total })}>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round((done / total) * 100)}%` }]} />
                </View>
                <Text style={styles.overallText} maxFontSizeMultiplier={1.2}>
                  {done}/{total}
                </Text>
              </View>
              <Text style={styles.pending} maxFontSizeMultiplier={1.2}>
                {t("ach.pending", { embers: pending })}
              </Text>

              {nextGoals.length > 0 && filter !== "done" && (
                <View style={styles.goals}>
                  <Text style={styles.goalsTitle} maxFontSizeMultiplier={1.2}>
                    {t("ach.next").toLocaleUpperCase()}
                  </Text>
                  <View style={styles.goalsRow}>
                    {nextGoals.map(({ a: g, p }) => (
                      <View key={g.id} style={styles.goal} accessible accessibilityLabel={`${achievementText(t, g.id, "name")}. ${p.current}/${p.target}`}>
                        <Text style={styles.goalIcon}>{g.icon}</Text>
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text style={styles.goalName} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                            {achievementText(t, g.id, "name")}
                          </Text>
                          <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${Math.round((p.current / p.target) * 100)}%` }]} />
                          </View>
                        </View>
                        <Text style={styles.goalCount} maxFontSizeMultiplier={1.1}>
                          {p.current}/{p.target}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.chips}>
                {(["all", "todo", "done"] as const).map(key => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setFilter(key)}
                    style={[styles.chip, filter === key && styles.chipOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: filter === key }}
                    accessibilityLabel={t(`ach.filter.${key}` as TranslationKey)}
                  >
                    <Text style={[styles.chipText, filter === key && { color: "#1a1030" }]} maxFontSizeMultiplier={1.1}>
                      {t(`ach.filter.${key}` as TranslationKey).toLocaleUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const unlockedOn = stats.achievements[item.id];
            const name = achievementText(t, item.id, "name");
            const description = achievementText(t, item.id, "desc");
            return (
              <View
                style={[styles.card, unlockedOn ? styles.cardUnlocked : styles.cardLocked, columns > 1 && { flex: 1 }]}
                accessible
                accessibilityLabel={`${name}. ${description}. ${unlockedOn ? t("ach.unlockedOn", { date: unlockedOn }) : t("ach.locked")}`}
              >
                <View style={[styles.badge, unlockedOn ? styles.badgeUnlocked : styles.badgeLocked]}>
                  <Text style={[styles.icon, !unlockedOn && { opacity: 0.4 }]}>{item.icon}</Text>
                  {!unlockedOn && (
                    <View style={styles.lock}>
                      <Ionicons name="lock-closed" size={13} color="#d8d2f0" />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, !unlockedOn && { color: "#cfcbe6" }]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                      {name}
                    </Text>
                    <View style={[styles.reward, !unlockedOn && styles.rewardOpen]}>
                      <Text style={styles.rewardText} maxFontSizeMultiplier={1.1}>
                        🔥 {unlockedOn ? "✓" : `+${ACHIEVEMENT_REWARD[item.tier]}`}
                      </Text>
                    </View>
                    <View style={[styles.tier, { borderColor: TIER_COLOR[item.tier] + "99" }]}>
                      <Text style={[styles.tierText, { color: TIER_COLOR[item.tier] }]} maxFontSizeMultiplier={1.1}>
                        {t(`ach.tier.${item.tier}` as TranslationKey).toLocaleUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.desc} maxFontSizeMultiplier={1.2}>
                    {description}
                  </Text>
                  {!unlockedOn && item.progress ? (
                    <View style={styles.progressRow}>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${Math.round((item.progress(stats).current / item.progress(stats).target) * 100)}%` }]} />
                      </View>
                      <Text style={styles.progressText} maxFontSizeMultiplier={1.1}>
                        {item.progress(stats).current}/{item.progress(stats).target}
                      </Text>
                    </View>
                  ) : null}
                  {unlockedOn ? (
                    <View style={styles.dateChip}>
                      <Ionicons name="checkmark-circle" size={14} color="#76FF03" />
                      <Text style={styles.date} maxFontSizeMultiplier={1.2}>
                        {unlockedOn}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  overall: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2, paddingHorizontal: 4 },
  track: { flex: 1, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 5, backgroundColor: GOLD },
  overallText: { color: GOLD, fontWeight: "900", fontSize: 14, minWidth: 44, textAlign: "right" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 12,
    minHeight: 84,
  },
  cardUnlocked: { backgroundColor: "rgba(255, 213, 79, 0.1)", borderColor: "rgba(255, 213, 79, 0.55)" },
  cardLocked: { backgroundColor: "rgba(20, 15, 40, 0.8)", borderColor: "rgba(255,255,255,0.1)" },
  badge: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  badgeUnlocked: { backgroundColor: "rgba(255,213,79,0.18)", borderColor: GOLD },
  badgeLocked: { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.16)" },
  icon: { fontSize: 28 },
  lock: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2a2440",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  pending: { color: "#FFAB40", fontWeight: "800", fontSize: 13, textAlign: "center" },
  goals: { gap: 6 },
  goalsTitle: { color: "#F2C14E", fontWeight: "800", letterSpacing: 2, fontSize: 12 },
  goalsRow: { gap: 6 },
  goal: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(144,202,249,0.1)", borderWidth: 1, borderColor: "rgba(144,202,249,0.4)", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  goalIcon: { fontSize: 22 },
  goalName: { color: "#fff", fontWeight: "700", fontSize: 13 },
  goalCount: { color: "#b8c7e6", fontWeight: "800", fontSize: 12 },
  chips: { flexDirection: "row", gap: 8, justifyContent: "center" },
  chip: { minHeight: 36, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: "#F2C14E", borderColor: "#F2C14E" },
  chipText: { color: "#d8d2f0", fontWeight: "800", fontSize: 12, letterSpacing: 1 },
  reward: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, backgroundColor: "rgba(255,171,64,0.12)" },
  rewardOpen: { backgroundColor: "rgba(255,171,64,0.22)" },
  rewardText: { color: "#FFAB40", fontSize: 10, fontWeight: "800" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { color: "#fff", fontWeight: "800", fontSize: 16, flexShrink: 1 },
  tier: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  tierText: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: "#90CAF9" },
  progressText: { color: "#b8c7e6", fontSize: 11, fontWeight: "700", minWidth: 44, textAlign: "right" },
  desc: { color: "#c4bfdc", fontSize: 13 },
  dateChip: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  date: { color: "#b7f2a0", fontSize: 12, fontWeight: "800" },
});

export default AchievementsScreen;
