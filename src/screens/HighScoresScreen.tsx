// src/screens/HighScoresScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import { FlatList, Linking, ScrollView, TouchableOpacity, View, StyleSheet, ActivityIndicator, ImageBackground } from "react-native";
import { useWindowDimensions } from "../ui/layout/scaledWindow";
import Text from "../ui/components/Text";
import { useFocusEffect } from "@react-navigation/native";
import { loadTop10, type Doc, type HighscoreRow } from "../services/highscores";
import { loadDayBoard, loadWeekBoard } from "../services/dailyScores";
import { getPlayerId } from "../services/playerProfile";
import { dailyKey } from "../core/engine/seed";

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
import GlyphIcon from "../ui/components/GlyphIcon";
import ScreenHeader from "../ui/components/ScreenHeader";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { getLocalStats, peekLocalStats } from "../services/localStats";
import { clearHidden, hideEntry, loadHidden } from "../services/moderation";
import { buildReportMailto } from "../core/leaderboard/moderation";
import type { TranslationKey } from "../i18n/en";
import { isReal } from "../config/isReal";
import { GAME_CONFIG } from "../config/gameConfig";
import { PlayerPortrait, PlayerTitle } from "../ui/components/PlayerPortrait";
import PressScale from "../ui/components/PressScale";
import Rise, { riseDelay } from "../ui/components/Rise";
import { getPlayerName } from "../services/playerProfile";
import { lookOf } from "../core/cosmetics/look";
import { equippedSkin } from "../core/skins/ownership";
import { skinArt } from "../data/skinArt";
import { useSettingsStore } from "../state/settings/store";
import SpriteImage from "../ui/components/SpriteImage";
import { LinearGradient } from "expo-linear-gradient";

type Props = NativeStackScreenProps<RootStackParamList, "HighScoresScreen">;

type Status = "loading" | "ready" | "error";
type Board = "global" | "today" | "week";

const MEDALS = ["#FFD54F", "#CFD8DC", "#FFAB91"] as const; // gold, silver, bronze

const HighScoresScreen: React.FC<Props> = ({ navigation }) => {
  const { t, n } = useT();
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
  const [myName, setMyName] = useState<string | null>(null);
  const lastHero = useSettingsStore(s => s.lastHero);
  useEffect(() => {
    void getPlayerId().then(setMyId);
    void getPlayerName().then(setMyName);
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
        const rows = board === "today" ? await loadDayBoard(day) : await loadWeekBoard(day);
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

  const boardOptions: (SegmentOption<Board> & { icon: React.ComponentProps<typeof Ionicons>["name"] })[] = [
    { value: "global", label: t("scores.tab.global"), icon: "earth" },
    { value: "today", label: t("scores.tab.today"), icon: "today" },
    { value: "week", label: t("scores.tab.week"), icon: "calendar" },
  ];
  const tabs = (
    <View style={styles.tabs} accessibilityRole="tablist" accessibilityLabel={t("scores.title")}>
      {boardOptions.map(o => {
        const on = board === o.value;
        return (
          <PressScale key={o.value} onPress={() => setBoard(o.value)} style={[styles.tab, on && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={o.label}>
            <Ionicons name={o.icon} size={15} color={on ? "#2A2016" : "#FFD54F"} />
            <Text style={[styles.tabText, on && { color: "#2A2016" }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
              {o.label.toLocaleUpperCase()}
            </Text>
          </PressScale>
        );
      })}
    </View>
  );

  useFocusEffect(
    useCallback(() => {
      getLocalStats().then(setMine).catch(() => {});
    }, []),
  );

  const tenth = board === "global" && data.length >= 10 ? Number(data[9].data().score) || 0 : 0;

  const record = (
    <Rise style={styles.record}>
      <View style={styles.meRow}>
        <PlayerPortrait source={skinArt(Math.max(0, lastHero ?? 0), equippedSkin(mine, Math.max(0, lastHero ?? 0))).scoreImage} size={58} frame={lookOf(mine).frame} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.recordTitle} maxFontSizeMultiplier={1.1}>
            {t("scores.yours").toLocaleUpperCase()}
          </Text>
          <Text style={styles.meName} numberOfLines={1} maxFontSizeMultiplier={1.1}>
            {myName ?? t("friends.noName")}
          </Text>
          <PlayerTitle title={lookOf(mine).title} />
        </View>
      </View>
      {mine.gamesPlayed > 0 ? (
        <>
          <View style={styles.bestRow}>
            <Text style={styles.recordScore} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
              {n(mine.bestScore)}
            </Text>
            <Text style={styles.recordCaption} numberOfLines={2} maxFontSizeMultiplier={1.1}>
              {t("scores.bestScore").toLocaleUpperCase()}
            </Text>
          </View>
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
        <Ionicons name="trending-up" size={18} color="#2A2016" />
        <Text style={styles.progressLinkText} maxFontSizeMultiplier={1.2}>
          {t("progress.open").toLocaleUpperCase()}
        </Text>
      </TouchableOpacity>
      {tenth > 0 && (
        <View style={styles.threshold}>
          <Ionicons name="flag" size={14} color="#80DEEA" />
          <Text style={styles.thresholdText} maxFontSizeMultiplier={1.2}>
            {t("scores.threshold", { score: tenth })}
          </Text>
        </View>
      )}
    </Rise>
  );

  const age = offlineAt !== null ? describeAge(offlineAt) : null;
  const offlineNotice = age ? (
    <View style={styles.offlineNotice} accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={18} color="#FFCC80" />
      <Text style={styles.offlineText} maxFontSizeMultiplier={1.2}>
        {t(((age.unit === "minutes" && age.n === 0 ? "scores.offline.now" : age.n === 1 && age.unit === "hours" ? "scores.offline.hours1" : age.n === 1 && age.unit === "days" ? "scores.offline.days1" : `scores.offline.${age.unit}`) as TranslationKey), { n: age.n })}
      </Text>
      <TouchableOpacity style={styles.offlineRetry} onPress={loadData} accessibilityRole="button" accessibilityLabel={t("common.retry")}>
        <Ionicons name="refresh" size={18} color="#2A2016" />
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

  const reportMenu = (item: Doc) => {
    const row = item.data();
    return (
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
    );
  };

  const renderItem = ({ item, index: at }: { item: Doc; index: number }) => {
    const index = at + (status === "ready" && visible.length >= 3 ? 3 : 0);
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
          <Text style={[styles.rankText, medal ? { color: "#2A2016" } : null]} maxFontSizeMultiplier={1.2}>
            {index + 1}
          </Text>
        </View>
        <PlayerPortrait source={char.scoreImage} size={row.frame ? 50 : 40} frame={row.frame} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {row.name}
            {mineRow ? `  ·  ${t("scores.you")}` : ""}
          </Text>
          <PlayerTitle title={row.title} />
          <Text style={styles.sub} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {t("scores.floorShort", { n: row.level })}  ·  <GlyphIcon name="gem" size={11} /> {Number(row.coins) || 0}  ·  {time}
          </Text>
        </View>
        <Text style={[styles.score, medal ? { color: medal } : null]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
          {n(Number(row.score) || 0)}
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
          <Ionicons name="flag-outline" size={16} color="#C4AA91" />
        </TouchableOpacity>
      </View>
      {menuFor === item.id && reportMenu(item)}
      </View>
    );
  };

  // The three best stand on a podium (the first in the middle, the highest), the rest follow as rows.
  const podium = status === "ready" && visible.length >= 3 ? visible.slice(0, 3) : [];
  const rest = podium.length ? visible.slice(3) : visible;
  const podiumView = podium.length ? (
    <View style={{ gap: 6 }}>
      <View style={styles.podium}>
        {[1, 0, 2].map(place => {
          const item = podium[place];
          const row = item.data();
          const char = characters[row.characterIndex] || characters[0];
          const medal = MEDALS[place];
          const mineRow = !!myId && row.pid === myId;
          const first = place === 0;
          const portrait = first ? 72 : 58;
          return (
            <Rise key={item.id} delay={riseDelay(place === 0 ? 2 : place - 1, 80)} style={styles.podiumCol}>
              {/* The player stands on their step: crowned and raised for the first, the medal's colour for all three. */}
              <PressScale
                onLongPress={() => setMenuFor(menuFor === item.id ? null : item.id)}
                delayLongPress={400}
                accessibilityRole="button"
                accessibilityLabel={`#${place + 1} ${row.name}. ${t("scores.col.score")} ${row.score}. ${t("scores.col.floor")} ${row.level}`}
                accessibilityHint={t("scores.report.open")}
                accessibilityActions={[{ name: "longpress", label: t("scores.report.open") }]}
                onAccessibilityAction={() => setMenuFor(menuFor === item.id ? null : item.id)}
                style={styles.podiumPress}
              >
                <View style={{ alignItems: "center", marginBottom: -portrait * 0.32, zIndex: 2 }}>
                  {first ? <SpriteImage source={require("../assets/sprites/ui/Icon_Trophy.png")} style={styles.podiumCrown} resizeMode="contain" /> : null}
                  <View style={[styles.podiumRing, { width: portrait + 10, height: portrait + 10, borderRadius: (portrait + 10) / 2, borderColor: medal, shadowColor: medal }]}>
                    <PlayerPortrait source={char.scoreImage} size={portrait} frame={row.frame} />
                  </View>
                </View>
                <LinearGradient
                  colors={[medal + "40", "rgba(30,22,14,0.96)"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={[styles.podiumCard, { borderColor: medal + (mineRow ? "" : "AA"), paddingTop: portrait * 0.32 + 6, minHeight: first ? 132 : place === 1 ? 118 : 108 }, mineRow && styles.podiumMine]}
                >
                  <Text style={styles.podiumName} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                    {row.name}
                  </Text>
                  <PlayerTitle title={row.title} />
                  <Text style={[styles.podiumScore, { color: medal }, first && { fontSize: 22 }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>
                    {n(Number(row.score) || 0)}
                  </Text>
                  <Text style={styles.podiumMeta} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                    {t("scores.floorShort", { n: row.level })} · {typeof row.time === "number" ? formatTime(row.time) : t("scores.noTime")}
                  </Text>
                  <View style={[styles.podiumPlace, { backgroundColor: medal }]}>
                    <Text style={styles.podiumPlaceText} maxFontSizeMultiplier={1}>{place + 1}</Text>
                  </View>
                </LinearGradient>
              </PressScale>
            </Rise>
          );
        })}
      </View>
      {podium.map(item => (menuFor === item.id ? <View key={item.id}>{reportMenu(item)}</View> : null))}
    </View>
  ) : null;

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
      data={status === "ready" ? rest : []}
      showsVerticalScrollIndicator={false}
      keyExtractor={doc => doc.id}
      renderItem={renderItem}
      ListHeaderComponent={
        <View style={{ marginBottom: 2, gap: 8 }}>
          {twoPanes ? null : record}
          {twoPanes ? null : tabs}
          {board !== "global" ? (
            <Text style={styles.boardNote} maxFontSizeMultiplier={1.2}>
              {board === "today" ? t("scores.dailyNote") : t("scores.weekNote")}
            </Text>
          ) : null}
          {status === "ready" ? offlineNotice : null}
          {podiumView}
        </View>
      }
      ListEmptyComponent={podium.length ? undefined : placeholder}
      contentContainerStyle={{ gap: 8, paddingBottom: 24 + insets.bottom }}
      ListFooterComponent={
        hidden.length > 0 && status === "ready" ? (
          <TouchableOpacity onPress={showHidden} style={styles.hiddenNote} accessibilityRole="button" accessibilityLabel={t("scores.hidden.show")}>
            <Text style={styles.hiddenText} maxFontSizeMultiplier={1.2}>
              {t("scores.hidden", { count: hidden.length })} · {t("scores.hidden.show")}
            </Text>
          </TouchableOpacity>
        ) : undefined
      }
    />
  );

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(13, 10, 7,0.88)" }} edges={["top", "left", "right"]}>
        <ScreenHeader title={t("scores.title")} onBack={() => navigation.goBack()} />
        <View style={[styles.layout, { width: cardWidth }, twoPanes ? styles.layoutRow : null]}>
          {twoPanes ? (
            <ScrollView style={styles.recordPane} showsVerticalScrollIndicator={false}>
              {record}
            </ScrollView>
          ) : null}
          <View style={{ flex: 1, gap: 8 }}>
            {twoPanes ? tabs : null}
            {list}
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  tabs: { flexDirection: "row", gap: 6 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, minHeight: 36, paddingHorizontal: 8, borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,213,79,0.35)", backgroundColor: "rgba(255,255,255,0.04)" },
  tabOn: { backgroundColor: "#FFD54F", borderColor: "#FFD54F" },
  tabText: { color: "#EAE1D8", fontWeight: "900", fontSize: 11.5, letterSpacing: 0.8 },
  meRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  meName: { color: "#fff", fontWeight: "900", fontSize: 16 },
  bestRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  podium: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingTop: 4 },
  podiumCol: { flex: 1 },
  podiumPress: { alignItems: "stretch" },
  podiumCrown: { width: 30, height: 30, marginBottom: -4 },
  podiumRing: { alignItems: "center", justifyContent: "center", borderWidth: 2.5, backgroundColor: "rgba(16,10,5,0.9)", shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  podiumCard: { alignItems: "center", gap: 2, paddingBottom: 26, paddingHorizontal: 6, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, borderWidth: 1.5, overflow: "hidden" },
  podiumMine: { borderWidth: 2.5 },
  podiumName: { color: "#fff", fontWeight: "900", fontSize: 13 },
  podiumScore: { fontWeight: "900", fontSize: 18, marginTop: 2 },
  podiumMeta: { color: "#C4AA91", fontSize: 11, fontWeight: "700" },
  podiumPlace: { position: "absolute", bottom: 0, left: 0, right: 0, height: 20, alignItems: "center", justifyContent: "center" },
  podiumPlaceText: { color: "#2A2016", fontWeight: "900", fontSize: 13 },
  boardNote: { color: "#C4AA91", fontSize: 12, textAlign: "center" },
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
  recordScore: { color: "#fff", fontWeight: "900", fontSize: 34 },
  recordCaption: { flex: 1, color: "#C1A68C", fontWeight: "800", fontSize: 11, letterSpacing: 1.2 },
  recordGrid: { flexDirection: "row", gap: 6, marginTop: 8 },
  recordCell: { flex: 1, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, paddingVertical: 8, alignItems: "center" },
  recordCellValue: { color: "#fff", fontWeight: "900", fontSize: 20 },
  recordCellLabel: { color: "#C1A68C", fontSize: 11, fontWeight: "800", textAlign: "center" },
  recordEmpty: { color: "#E1D4C8", fontSize: 13, marginTop: 6 },
  progressLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: MIN_TOUCH, borderRadius: 14, backgroundColor: "#F2C14E", marginTop: 8, paddingHorizontal: 12 },
  progressLinkText: { color: "#2A2016", fontWeight: "900", letterSpacing: 1, fontSize: 13 },
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
    backgroundColor: "rgba(36, 28, 19,0.8)",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  flag: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
  reportMenu: { marginTop: 4, padding: 10, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)", gap: 8 },
  reportHint: { color: "#E1D4C8", fontSize: 12 },
  reportButtons: { flexDirection: "row", gap: 8 },
  reportButton: { flex: 1, minHeight: MIN_TOUCH, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  reportButtonText: { color: "#fff", fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  hiddenNote: { minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center" },
  hiddenText: { color: "#C4AA91", fontSize: 12, textDecorationLine: "underline" },
  rank: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  rankText: { color: "#EAE1D8", fontWeight: "900", fontSize: 15 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)" },
  name: { color: "#fff", fontWeight: "900", fontSize: 16 },
  sub: { color: "#C4AA91", fontSize: 12, marginTop: 1 },
  score: { color: "#9ee37d", fontWeight: "900", fontSize: 20, minWidth: 84, textAlign: "right" },
  centerBox: { alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 40 },
  statusText: { color: "#E1D4C8", fontSize: 14, textAlign: "center" },
  retryButton: { minHeight: MIN_TOUCH, paddingHorizontal: 24, borderRadius: 14, backgroundColor: "#FFD54F", alignItems: "center", justifyContent: "center" },
  retryText: { color: "#000", fontWeight: "900", letterSpacing: 1 },
});

export default HighScoresScreen;
