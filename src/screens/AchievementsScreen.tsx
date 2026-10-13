import React, { useCallback, useState } from "react";
import {
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "../navigation/types";
import { MIN_TOUCH, useGameLayout } from "../ui/layout/useGameLayout";
import { ACHIEVEMENTS } from "../core/stats/achievements";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { getLocalStats } from "../services/localStats";
import { useT } from "../i18n/useT";
import { achievementText } from "../i18n/keys";

type Props = NativeStackScreenProps<RootStackParamList, "AchievementsScreen">;

const AchievementsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const { fontSize, spacing, insets } = useGameLayout();
  const [stats, setStats] = useState<LocalStats>(EMPTY_STATS);

  useFocusEffect(
    useCallback(() => {
      getLocalStats().then(setStats).catch(() => {});
    }, []),
  );

  const done = ACHIEVEMENTS.filter(a => a.id in stats.achievements).length;
  const cardWidth = Math.min(width - Math.max(insets.left, 8) - Math.max(insets.right, 8) - 16, 900);
  const columns = cardWidth >= 560 ? 2 : 1;

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)" }}>
        <View style={[styles.header, { paddingVertical: spacing(12) }]}>
          <TouchableOpacity
            style={[styles.backButton, { left: Math.max(insets.left, 12) }]}
            onPress={() => navigation.goBack()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("a11y.back")}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={[styles.title, { fontSize: fontSize(26) }]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
              {t("ach.title").toLocaleUpperCase()}
            </Text>
            <Text style={styles.progress} maxFontSizeMultiplier={1.3}>
              {t("ach.progress", { done, total: ACHIEVEMENTS.length })}
            </Text>
          </View>
        </View>

        <FlatList
          key={columns}
          data={ACHIEVEMENTS}
          numColumns={columns}
          keyExtractor={a => a.id}
          style={{ alignSelf: "center", width: cardWidth }}
          contentContainerStyle={{ padding: 8, paddingBottom: 24 + insets.bottom, gap: 10 }}
          columnWrapperStyle={columns > 1 ? { gap: 10 } : undefined}
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
                <Text style={[styles.icon, !unlockedOn && { opacity: 0.35 }]}>{unlockedOn ? item.icon : "🔒"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, !unlockedOn && { color: "#bdbdbd" }]} maxFontSizeMultiplier={1.3}>
                    {name}
                  </Text>
                  <Text style={styles.desc} maxFontSizeMultiplier={1.3}>
                    {description}
                  </Text>
                  {unlockedOn ? (
                    <Text style={styles.date} maxFontSizeMultiplier={1.2}>
                      {t("ach.unlockedOn", { date: unlockedOn })}
                    </Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  backButton: {
    position: "absolute",
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: MIN_TOUCH / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { color: "#fff", fontWeight: "900", letterSpacing: 4, textAlign: "center" },
  progress: { color: "#FFD54F", fontWeight: "700", fontSize: 12, marginTop: 2 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  cardUnlocked: { backgroundColor: "rgba(255, 213, 79, 0.1)", borderColor: "rgba(255, 213, 79, 0.45)" },
  cardLocked: { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" },
  icon: { fontSize: 30, width: 40, textAlign: "center" },
  name: { color: "#fff", fontWeight: "900", fontSize: 15 },
  desc: { color: "#c4c4c4", fontSize: 13, marginTop: 2 },
  date: { color: "#FFD54F", fontSize: 11, marginTop: 4, fontWeight: "700" },
});

export default AchievementsScreen;
