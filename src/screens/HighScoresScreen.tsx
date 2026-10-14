// src/screens/HighScoresScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import { FlatList, ScrollView, TouchableOpacity, View, StyleSheet, ActivityIndicator, ImageBackground, useWindowDimensions } from "react-native";
import Text from "../ui/components/Text";
import { useFocusEffect } from "@react-navigation/native";
import { loadTop10, type Doc } from "../services/highscores";
import { describeAge } from "../core/leaderboard/cache";
import { SafeAreaView } from "react-native-safe-area-context";
import { MIN_TOUCH, useGameLayout } from "../ui/layout/useGameLayout";
import characters from "../data/characters";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { formatTime } from "../shared/utils/formatTime";
import { useT } from "../i18n/useT";
import SpriteImage from "../ui/components/SpriteImage";
import ScreenHeader from "../ui/components/ScreenHeader";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { getLocalStats } from "../services/localStats";

type Props = NativeStackScreenProps<RootStackParamList, "HighScoresScreen">;

type Status = "loading" | "ready" | "error";

const MEDALS = ["#FFD54F", "#CFD8DC", "#FFAB91"] as const; // gold, silver, bronze

const HighScoresScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const { insets } = useGameLayout();
  const [data, setData] = useState<Doc[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [mine, setMine] = useState<LocalStats>(EMPTY_STATS);
  /** When the list shown is a saved copy (no connection), the time it was fetched. */
  const [offlineAt, setOfflineAt] = useState<number | null>(null);

  const usable = width - Math.max(insets.left, 8) - Math.max(insets.right, 8) - 16;
  const cardWidth = Math.min(usable, 1100);
  const twoPanes = cardWidth >= 640;

  const loadData = useCallback(async () => {
    setStatus("loading");
    try {
      const result = await loadTop10();
      setData(result.docs);
      setOfflineAt(result.offline ? result.at : null);
      setStatus("ready");
    } catch (err) {
      console.warn("[HighScores] load error:", err);
      setStatus("error"); // a failed request is not an empty leaderboard
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      getLocalStats().then(setMine).catch(() => {});
    }, []),
  );

  const tenth = data.length >= 10 ? Number(data[9].data().score) || 0 : 0;

  const record = (
    <View style={styles.record}>
      <Text style={styles.recordTitle} maxFontSizeMultiplier={1.2}>
        {t("scores.yours").toLocaleUpperCase()}
      </Text>
      {mine.gamesPlayed > 0 ? (
        <>
          <Text style={styles.recordScore} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
            {mine.bestScore.toLocaleString()}
          </Text>
          <Text style={styles.recordCaption} maxFontSizeMultiplier={1.2}>
            {t("scores.bestScore").toLocaleUpperCase()}
          </Text>
          <View style={styles.recordGrid}>
            <View style={styles.recordCell}>
              <Text style={styles.recordCellValue}>{mine.bestLevel}</Text>
              <Text style={styles.recordCellLabel} maxFontSizeMultiplier={1.2}>{t("scores.bestFloor")}</Text>
            </View>
            <View style={styles.recordCell}>
              <Text style={styles.recordCellValue}>{mine.victories}</Text>
              <Text style={styles.recordCellLabel} maxFontSizeMultiplier={1.2}>{t("scores.wins")}</Text>
            </View>
            <View style={styles.recordCell}>
              <Text style={styles.recordCellValue}>{mine.gamesPlayed}</Text>
              <Text style={styles.recordCellLabel} maxFontSizeMultiplier={1.2}>{t("scores.games")}</Text>
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.recordEmpty} maxFontSizeMultiplier={1.2}>
          {t("scores.noRecord")}
        </Text>
      )}
      <TouchableOpacity
        style={styles.progressLink}
        onPress={() => navigation.navigate("ProgressScreen")}
        accessibilityRole="button"
        accessibilityLabel={t("progress.open")}
      >
        <Ionicons name="trending-up" size={18} color="#1a1030" />
        <Text style={styles.progressLinkText} maxFontSizeMultiplier={1.2}>
          {t("progress.open").toLocaleUpperCase()}
        </Text>
      </TouchableOpacity>
      {tenth > 0 && (
        <View style={styles.threshold}>
          <Ionicons name="flag" size={14} color="#80DEEA" />
          <Text style={styles.thresholdText} maxFontSizeMultiplier={1.2}>
            {t("scores.threshold", { score: tenth.toLocaleString() })}
          </Text>
        </View>
      )}
    </View>
  );

  const age = offlineAt !== null ? describeAge(offlineAt) : null;
  const offlineNotice = age ? (
    <View style={styles.offlineNotice} accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={18} color="#FFCC80" />
      <Text style={styles.offlineText} maxFontSizeMultiplier={1.2}>
        {t(age.unit === "minutes" && age.n === 0 ? "scores.offline.now" : `scores.offline.${age.unit}`, { n: age.n })}
      </Text>
      <TouchableOpacity style={styles.offlineRetry} onPress={loadData} accessibilityRole="button" accessibilityLabel={t("common.retry")}>
        <Ionicons name="refresh" size={18} color="#1a1030" />
      </TouchableOpacity>
    </View>
  ) : null;

  const renderItem =({ item, index }: { item: Doc; index: number }) => {
    const row = item.data();
    const char = characters[row.characterIndex] || characters[0];
    const time = typeof row.time === "number" ? formatTime(row.time) : t("scores.noTime");
    const medal = index < 3 ? MEDALS[index] : null;

    return (
      <View
        style={[styles.row, medal && { borderColor: medal, backgroundColor: "rgba(255,255,255,0.07)" }]}
        accessible
        accessibilityLabel={`#${index + 1} ${row.name}. ${t("scores.col.score")} ${row.score}. ${t("scores.col.floor")} ${row.level}`}
      >
        <View style={[styles.rank, medal ? { backgroundColor: medal } : null]}>
          <Text style={[styles.rankText, medal ? { color: "#1a1030" } : null]} maxFontSizeMultiplier={1.2}>
            {index + 1}
          </Text>
        </View>
        <SpriteImage source={char.scoreImage} style={styles.avatar} accessibilityIgnoresInvertColors />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {row.name}
          </Text>
          <Text style={styles.sub} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {t("scores.floorShort", { n: row.level })}  ·  💎 {Number(row.coins) || 0}  ·  {time}
          </Text>
        </View>
        <Text style={[styles.score, medal ? { color: medal } : null]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
          {(Number(row.score) || 0).toLocaleString()}
        </Text>
      </View>
    );
  };

  // Loading, error and empty states live inside the list, so the record above never pushes them off-screen.
  const placeholder =
    status === "loading" ? (
      <View style={styles.centerBox}>
        <ActivityIndicator color="#FFD54F" size="large" />
        <Text style={styles.statusText} maxFontSizeMultiplier={1.3}>
          {t("scores.loading")}
        </Text>
      </View>
    ) : status === "error" ? (
      <View style={styles.centerBox} accessibilityLiveRegion="polite">
        <Ionicons name="cloud-offline-outline" size={36} color="#FF8A80" />
        <Text style={[styles.statusText, { color: "#FF8A80" }]} maxFontSizeMultiplier={1.3}>
          {t("scores.error")}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData} accessibilityRole="button" accessibilityLabel={t("common.retry")}>
          <Text style={styles.retryText} maxFontSizeMultiplier={1.3}>
            {t("common.retry").toLocaleUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.centerBox}>
        <Text style={styles.statusText} maxFontSizeMultiplier={1.3}>
          {t("scores.empty")}
        </Text>
      </View>
    );

  // Narrow windows stack the record above the ranking inside ONE scrolling list; wide ones put them side by side.
  const list = (
    <FlatList
      style={styles.listPane}
      data={status === "ready" ? data : []}
      showsVerticalScrollIndicator={false}
      keyExtractor={doc => doc.id}
      renderItem={renderItem}
      ListHeaderComponent={
        twoPanes && !offlineNotice ? null : (
          <View style={{ marginBottom: 10, gap: 10 }}>
            {twoPanes ? null : record}
            {status === "ready" ? offlineNotice : null}
          </View>
        )
      }
      contentContainerStyle={{ gap: 8, paddingBottom: 24 + insets.bottom }}
      ListEmptyComponent={placeholder}
    />
  );

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(6,4,16,0.88)" }}>
        <ScreenHeader title={t("scores.title")} onBack={() => navigation.goBack()} />
        <View style={[styles.layout, { width: cardWidth }, twoPanes ? styles.layoutRow : null]}>
          {twoPanes ? (
            <ScrollView style={styles.recordPane} showsVerticalScrollIndicator={false}>
              {record}
            </ScrollView>
          ) : null}
          {list}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  layout: { flex: 1, alignSelf: "center", padding: 8, gap: 10 },
  layoutRow: { flexDirection: "row" },
  record: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,213,79,0.5)",
    backgroundColor: "rgba(255,213,79,0.08)",
    padding: 14,
    gap: 4,
  },
  recordPane: { width: "34%", flexGrow: 0 },
  recordTitle: { color: "#FFD54F", fontWeight: "900", letterSpacing: 2, fontSize: 12 },
  recordScore: { color: "#fff", fontWeight: "900", fontSize: 40 },
  recordCaption: { color: "#9a95b8", fontWeight: "800", fontSize: 11, letterSpacing: 1.5 },
  recordGrid: { flexDirection: "row", gap: 6, marginTop: 8 },
  recordCell: { flex: 1, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, paddingVertical: 8, alignItems: "center" },
  recordCellValue: { color: "#fff", fontWeight: "900", fontSize: 20 },
  recordCellLabel: { color: "#9a95b8", fontSize: 10, fontWeight: "800", textAlign: "center" },
  recordEmpty: { color: "#c9c3e6", fontSize: 13, marginTop: 6 },
  progressLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: MIN_TOUCH, borderRadius: 14, backgroundColor: "#F2C14E", marginTop: 8, paddingHorizontal: 12 },
  progressLinkText: { color: "#1a1030", fontWeight: "900", letterSpacing: 1, fontSize: 13 },
  threshold: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  thresholdText: { color: "#80DEEA", fontWeight: "800", fontSize: 12, flex: 1 },
  listPane: { flex: 1 },
  offlineNotice: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,204,128,0.4)", backgroundColor: "rgba(255,204,128,0.1)", paddingVertical: 6, paddingLeft: 12, paddingRight: 6 },
  offlineText: { color: "#FFCC80", fontWeight: "700", fontSize: 12, flex: 1 },
  offlineRetry: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, backgroundColor: "#FFD54F", alignItems: "center", justifyContent: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(20,15,40,0.8)",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  rank: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  rankText: { color: "#d8d2f0", fontWeight: "900", fontSize: 15 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)" },
  name: { color: "#fff", fontWeight: "900", fontSize: 16 },
  sub: { color: "#9f9abb", fontSize: 12, marginTop: 1 },
  score: { color: "#9ee37d", fontWeight: "900", fontSize: 20, minWidth: 84, textAlign: "right" },
  centerBox: { alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 40 },
  statusText: { color: "#c9c3e6", fontSize: 14, textAlign: "center" },
  retryButton: { minHeight: MIN_TOUCH, paddingHorizontal: 24, borderRadius: 14, backgroundColor: "#FFD54F", alignItems: "center", justifyContent: "center" },
  retryText: { color: "#000", fontWeight: "900", letterSpacing: 1 },
});

export default HighScoresScreen;
