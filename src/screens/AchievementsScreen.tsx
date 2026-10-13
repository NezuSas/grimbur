import React, { useCallback, useMemo, useState } from "react";
import { FlatList, ImageBackground, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "../navigation/types";
import { useGameLayout } from "../ui/layout/useGameLayout";
import { ACHIEVEMENTS } from "../core/stats/achievements";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { getLocalStats } from "../services/localStats";
import { useT } from "../i18n/useT";
import { achievementText } from "../i18n/keys";
import ScreenHeader from "../ui/components/ScreenHeader";

type Props = NativeStackScreenProps<RootStackParamList, "AchievementsScreen">;

const GOLD = "#FFD54F";

const AchievementsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const { insets } = useGameLayout();
  const [stats, setStats] = useState<LocalStats>(EMPTY_STATS);

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
    return [...earned, ...ACHIEVEMENTS.filter(a => !(a.id in stats.achievements))];
  }, [stats.achievements]);

  const done = ACHIEVEMENTS.length - ordered.filter(a => !(a.id in stats.achievements)).length;
  const total = ACHIEVEMENTS.length;
  const usable = width - Math.max(insets.left, 8) - Math.max(insets.right, 8) - 16;
  const cardWidth = Math.min(usable, 1100);
  const columns = cardWidth >= 900 ? 3 : cardWidth >= 560 ? 2 : 1;

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(6,4,16,0.88)" }}>
        <ScreenHeader title={t("ach.title")} subtitle={t("ach.progress", { done, total })} onBack={() => navigation.goBack()} />

        <FlatList
          key={columns}
          data={ordered}
          numColumns={columns}
          keyExtractor={a => a.id}
          style={{ alignSelf: "center", width: cardWidth }}
          contentContainerStyle={{ padding: 8, paddingBottom: 24 + insets.bottom, gap: 10 }}
          columnWrapperStyle={columns > 1 ? { gap: 10 } : undefined}
          ListHeaderComponent={
            <View style={styles.overall} accessible accessibilityLabel={t("ach.progress", { done, total })}>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round((done / total) * 100)}%` }]} />
              </View>
              <Text style={styles.overallText} maxFontSizeMultiplier={1.2}>
                {done}/{total}
              </Text>
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
                  <Text style={[styles.name, !unlockedOn && { color: "#cfcbe6" }]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                    {name}
                  </Text>
                  <Text style={styles.desc} maxFontSizeMultiplier={1.2}>
                    {description}
                  </Text>
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
  name: { color: "#fff", fontWeight: "900", fontSize: 16 },
  desc: { color: "#c4bfdc", fontSize: 13 },
  dateChip: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  date: { color: "#b7f2a0", fontSize: 12, fontWeight: "800" },
});

export default AchievementsScreen;
