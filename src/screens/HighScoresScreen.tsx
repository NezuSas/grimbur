// src/screens/HighScoresScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import { FlatList, Linking, ScrollView, TouchableOpacity, View, StyleSheet, ActivityIndicator, ImageBackground } from "react-native";
import { useWindowDimensions } from "../ui/layout/scaledWindow";
import Text from "../ui/components/Text";
import { useFocusEffect } from "@react-navigation/native";
import { loadTop10, type Doc, type HighscoreRow } from "../services/highscores";
import { loadDayBoard, loadWeekBoard } from "../services/dailyScores";
import { getPlayerId } from "../services/playerProfile";
import { weekKey } from "../core/leaderboard/daily";
import { dailyKey } from "../core/engine/seed";
import { Segmented } from "../ui/components/settings/SettingsParts";
import type { SegmentOption } from "../ui/components/settings/SettingsParts";
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
import { getLocalStats, peekLocalStats } from "../services/localStats";
import { clearHidden, hideEntry, loadHidden } from "../services/moderation";
import { buildReportMailto } from "../core/leaderboard/moderation";
import type { TranslationKey } from "../i18n/en";
import { isReal } from "../config/isReal";
import { GAME_CONFIG } from "../config/gameConfig";

type Props = NativeStackScreenProps<RootStackParamList, "HighScoresScreen">;

type Status = "loading" | "ready" | "error";
type Board = "global" | "today" | "week";

const MEDALS = ["#FFD54F", "#CFD8DC", "#FFAB91"] as const; // gold, silver, bronze

const HighScoresScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const { insets } = useGameLayout();
  const [data, setData] = useState<Doc[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [mine, setMine] = useState<LocalStats>(() => peekLocalStats() ?? EMPTY_STATS);
  /** When the list shown is a saved copy (no connection), the time it was fetched. */
  const [offlineAt, setOfflineAt] = useState<number | null>(null);
  const [board, setBoard] = useState<Board>("global");
  /** This phone's id on the daily and weekly boards, to mark the player's own row. */
  const [myId, setMyId] = useState<string | null>(null);
  useEffect(() => {
    void getPlayerId().then(setMyId);
  }, []);

  const usable = width - Math.max(insets.left, 8) - Math.max(insets.right, 8) - 16;
  const cardWidth = Math.min(usable, 1100);
  const twoPanes = cardWidth >= 640;

  const loadData = useCallback(async () => {
    setStatus("loading");
    setData([]);
    try {
      if (board === "global") {
        const result = await loadTop10();
        setData(result.docs);
        setOfflineAt(result.offline ? result.at : null);
      } else {
        const day = dailyKey();
        const rows = board === "today" ? await loadDayBoard(day) : await loadWeekBoard(weekKey(day) ?? "");
        setData(rows.map(r => ({ id: r.id, data: () => r.data() as unknown as HighscoreRow })));
        setOfflineAt(null);
      }
      setStatus("ready");
    } catch (err) {
      console.warn("[HighScores] load error:", err);
      setStatus("error"); // a failed request is not an empty leaderboard
    }
  }, [board]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const boardOptions: SegmentOption<Board>[] = [
    { value: "global", label: t("scores.tab.global") },
    { value: "today", label: t("scores.tab.today") },
    { value: "week", label: t("scores.tab.week") },
  ];

  useFocusEffect(
    useCallback(() => {
      getLocalStats().then(setMine).catch(() => {});
    }, []),
  );

  const tenth = board === "global" && data.length >= 10 ? Number(data[9].data().score) || 0 : 0;

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
        {t(((age.unit === "minutes" && age.n === 0 ? "scores.offline.now" : age.n === 1 && age.unit === "hours" ? "scores.offline.hours1" : age.n === 1 && age.unit === "days" ? "scores.offline.days1" : `scores.offline.${age.unit}`) as TranslationKey), { n: age.n })}
      </Text>
      <TouchableOpacity style={styles.offlineRetry} onPress={loadData} accessibilityRole="button" accessibilityLabel={t("common.retry")}>
        <Ionicons name="refresh" size={18} color="#1a1030" />
      </TouchableOpacity>
    </View>
  ) : null;

  const [hidden, setHidden] = useState<string[]>([]);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  useEffect(() => {
    loadHidden().then(setHidden).catch(() => {});
  }, []);
  const visible = data.filter(doc => !hidden.includes(doc.id));
  const hide = useCallback(async (id: string) => {
    setMenuFor(null);
    setHidden(await hideEntry(id));
  }, []);
  const showHidden = useCallback(async () => {
    await clearHidden();
    setHidden([]);
  }, []);

  const renderItem =({ item, index }: { item: Doc; index: number }) => {
    const row = item.data();
    const char = characters[row.characterIndex] || characters[0];
    const time = typeof row.time === "number" ? formatTime(row.time) : t("scores.noTime");
    const medal = index < 3 ? MEDALS[index] : null;
    const mineRow = !!myId && row.pid === myId;

    return (
      <View>
      <View style={[styles.row, medal && { borderColor: medal, backgroundColor: "rgba(255,255,255,0.07)" }, mineRow && styles.rowMine]}>
        <View
          style={styles.rowMain}
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
            {mineRow ? `  ·  ${t("scores.you")}` : ""}
          </Text>
          <Text style={styles.sub} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {t("scores.floorShort", { n: row.level })}  ·  💎 {Number(row.coins) || 0}  ·  {time}
          </Text>
        </View>
        <Text style={[styles.score, medal ? { color: medal } : null]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
          {(Number(row.score) || 0).toLocaleString()}
        </Text>
        </View>
        <TouchableOpacity
          style={styles.flag}
          onPress={() => setMenuFor(menuFor === item.id ? null : item.id)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("scores.report.open")}
          accessibilityState={{ expanded: menuFor === item.id }}
        >
          <Ionicons name="flag-outline" size={16} color="#9f9abb" />
        </TouchableOpacity>
      </View>
      {menuFor === item.id && (
        <View style={styles.reportMenu}>
          <Text style={styles.reportHint} maxFontSizeMultiplier={1.2}>
            {t("scores.report.hint")}
          </Text>
          <View style={styles.reportButtons}>
            <TouchableOpacity style={styles.reportButton} onPress={() => hide(item.id)} accessibilityRole="button" accessibilityLabel={t("scores.report.hide")}>
              <Text style={styles.reportButtonText} maxFontSizeMultiplier={1.2}>{t("scores.report.hide").toLocaleUpperCase()}</Text>
            </TouchableOpacity>
            {isReal(GAME_CONFIG.support.email) ? (
            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => {
                setMenuFor(null);
                const entry = { id: item.id, name: String(row.name), score: Number(row.score) || 0, level: Number(row.level) || 0 };
                void Linking.openURL(buildReportMailto(GAME_CONFIG.support.email, entry)).catch(() => {});
              }}
              accessibilityRole="button"
              accessibilityLabel={t("scores.report.send")}
            >
              <Text style={styles.reportButtonText} maxFontSizeMultiplier={1.2}>{t("scores.report.send").toLocaleUpperCase()}</Text>
            </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}
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
          {board === "today" ? t("scores.empty.today") : board === "week" ? t("scores.empty.week") : t("scores.empty")}
        </Text>
      </View>
    );

  // Narrow windows stack the record above the ranking inside ONE scrolling list; wide ones put them side by side.
  const list = (
    <FlatList
      style={styles.listPane}
      data={status === "ready" ? visible : []}
      showsVerticalScrollIndicator={false}
      keyExtractor={doc => doc.id}
      renderItem={renderItem}
      ListHeaderComponent={
        twoPanes && !offlineNotice && board === "global" ? null : (
          <View style={{ marginBottom: 10, gap: 10 }}>
            {twoPanes ? null : record}
            {board !== "global" ? (
              <Text style={styles.boardNote} maxFontSizeMultiplier={1.2}>
                {board === "today" ? t("scores.dailyNote") : t("scores.weekNote")}
              </Text>
            ) : null}
            {status === "ready" ? offlineNotice : null}
          </View>
        )
      }
      contentContainerStyle={{ gap: 8, paddingBottom: 24 + insets.bottom }}
      ListEmptyComponent={placeholder}
      ListFooterComponent={
        hidden.length > 0 && status === "ready" ? (
          <TouchableOpacity onPress={showHidden} style={styles.hiddenNote} accessibilityRole="button" accessibilityLabel={t("scores.hidden.show")}>
            <Text style={styles.hiddenText} maxFontSizeMultiplier={1.2}>
              {t("scores.hidden", { count: hidden.length })} · {t("scores.hidden.show")}
            </Text>
          </TouchableOpacity>
        ) : null
      }
    />
  );

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(6,4,16,0.88)" }}>
        <ScreenHeader title={t("scores.title")} onBack={() => navigation.goBack()} />
        <View style={[styles.tabs, { width: cardWidth }]}>
          <Segmented options={boardOptions} value={board} onChange={setBoard} accessibilityLabel={t("scores.title")} />
        </View>
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
  tabs: { alignSelf: "center", paddingHorizontal: 8, paddingTop: 6 },
  boardNote: { color: "#9f9abb", fontSize: 12, textAlign: "center" },
  rowMine: { borderColor: "#FFD54F", backgroundColor: "rgba(255,213,79,0.1)" },
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
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  flag: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
  reportMenu: { marginTop: 4, padding: 10, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)", gap: 8 },
  reportHint: { color: "#c9c3e6", fontSize: 12 },
  reportButtons: { flexDirection: "row", gap: 8 },
  reportButton: { flex: 1, minHeight: MIN_TOUCH, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  reportButtonText: { color: "#fff", fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  hiddenNote: { minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center" },
  hiddenText: { color: "#9f9abb", fontSize: 12, textDecorationLine: "underline" },
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
