// src/screens/HighScoresScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import { FlatList, Linking, ScrollView, TouchableOpacity, View, StyleSheet, ActivityIndicator, ImageBackground } from "react-native";
import { useWindowDimensions } from "../ui/layout/scaledWindow";
import Text from "../ui/components/Text";
import { useFocusEffect } from "@react-navigation/native";
import { loadTop10, type Doc, type HighscoreRow } from "../services/highscores";
import { loadDayBoard, loadWeekBoard } from "../services/dailyScores";
import { loadSeasonBoard } from "../services/seasonScores";
import { loadEndlessBoard } from "../services/endlessScores";
import { seasonKeyOf } from "../core/stats/season";
import { getPlayerId } from "../services/playerProfile";
import { dailyKey } from "../core/engine/seed";

import type { SegmentOption } from "../ui/components/settings/SettingsParts";
import { describeAge } from "../core/leaderboard/cache";
import { SafeAreaView } from "react-native-safe-area-context";
import { MIN_TOUCH, useGameLayout } from "../ui/layout/useGameLayout";
import characters from "../data/characters";
import { Ionicons } from "@expo/vector-icons";
import GameIcon from "../ui/components/GameIcon";
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
import FramedHero from "../ui/components/FramedHero";
import { currentUid } from "../lib/auth";
import { parseLook } from "../core/cosmetics/look";
import type { CosmeticId } from "../core/cosmetics/cosmetics";

type Props = NativeStackScreenProps<RootStackParamList, "HighScoresScreen">;

type Status = "loading" | "ready" | "error";
type Board = "global" | "today" | "week" | "season" | "endless";

const MEDALS = ["#C9A55A", "#CFD8DC", "#DBA48F"] as const; // gold, silver, bronze
/** The frame a podium place stands in when the player wears none: its medal's own. */
const PODIUM_FRAMES: readonly CosmeticId[] = ["frame_gold", "frame_silver", "frame_bronze"];

const HighScoresScreen: React.FC<Props> = ({ navigation }) => {
  const { t, n } = useT();
  const { width, height } = useWindowDimensions();
  const { insets } = useGameLayout();
  const [data, setData] = useState<Doc[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [mine, setMine] = useState<LocalStats>(() => peekLocalStats() ?? EMPTY_STATS);
  /** When the list shown is a saved copy (no connection), the time it was fetched. */
  const [offlineAt, setOfflineAt] = useState<number | null>(null);
  // Development only (web): `?board=season` (or today, week) opens that tab, for screenshots.
  const [board, setBoard] = useState<Board>(() => {
    const asked = __DEV__ && typeof location !== "undefined" ? new URLSearchParams(location.search).get("board") : null;
    return asked === "season" || asked === "today" || asked === "week" || asked === "endless" ? asked : "global";
  });
  /** This phone's id on the daily and weekly boards, to mark the player's own row. */
  const [myId, setMyId] = useState<string | null>(null);
  const [myName, setMyName] = useState<string | null>(null);
  const lastHero = useSettingsStore(s => s.lastHero);
  const myUid = currentUid();
  useEffect(() => {
    void getPlayerId().then(setMyId);
    void getPlayerName().then(setMyName);
  }, []);

  const usable = width - Math.max(insets.left, 8) - Math.max(insets.right, 8) - 16;
  const cardWidth = Math.min(usable, 1100);
  const twoPanes = cardWidth >= 640;
  /** Wide enough to hold the podium and the rows 4-10 side by side. */
  const sideBySide = twoPanes;

  const loadData = useCallback(async () => {
    setStatus("loading");
    setData([]);
    try {
      if (board === "endless") {
        const rows = await loadEndlessBoard();
        setData(rows.map(r => ({ id: r.id, data: () => ({ ...r.data(), score: r.data().floor, level: r.data().floor, coins: 0, time: 0 }) as unknown as HighscoreRow })));
        setOfflineAt(null);
      } else if (board === "season") {
        const rows = await loadSeasonBoard(seasonKeyOf(dailyKey()));
        setData(rows.map(r => ({ id: r.id, data: () => ({ ...r.data(), score: r.data().points, level: 0, coins: 0, time: 0 }) as HighscoreRow })));
        setOfflineAt(null);
      } else if (board === "global") {
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
    { value: "season", label: t("missions.tab.season"), icon: "trophy" },
    { value: "endless", label: t("scores.tab.endless"), icon: "infinite" },
  ];
  // Five tabs: on a narrow pane the icons give their room to the words.
  const roomyTabs = (twoPanes ? cardWidth * 0.62 : cardWidth) >= 640;
  const tabs = (
    <View style={styles.tabs} accessibilityRole="tablist" accessibilityLabel={t("scores.title")}>
      {boardOptions.map(o => {
        const on = board === o.value;
        return (
          <PressScale key={o.value} onPress={() => setBoard(o.value)} style={[styles.tab, on && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={o.label}>
            {roomyTabs ? <GameIcon name={o.icon} size={15} color={on ? "#2A2016" : "#C9A55A"} /> : null}
            <Text style={[styles.tabText, !roomyTabs && styles.tabTextTight, on && { color: "#2A2016" }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>
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


  const age = offlineAt !== null ? describeAge(offlineAt) : null;
  const offlineNotice = age ? (
    <View style={styles.offlineNotice} accessibilityLiveRegion="polite">
      <GameIcon name="cloud-offline-outline" size={18} color="#E2BE8C" />
      <Text style={styles.offlineText} maxFontSizeMultiplier={1.2}>
        {t(((age.unit === "minutes" && age.n === 0 ? "scores.offline.now" : age.n === 1 && age.unit === "hours" ? "scores.offline.hours1" : age.n === 1 && age.unit === "days" ? "scores.offline.days1" : `scores.offline.${age.unit}`) as TranslationKey), { n: age.n })}
      </Text>
      <TouchableOpacity style={styles.offlineRetry} onPress={loadData} accessibilityRole="button" accessibilityLabel={t("common.retry")}>
        <GameIcon name="refresh" size={18} color="#2A2016" />
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

  // The three best stand on a podium (the first in the middle, the highest), the rest follow as rows.
  const podium = status === "ready" && visible.length >= 3 ? visible.slice(0, 3) : [];
  const rest = podium.length ? visible.slice(3) : visible;
  const meShown = visible.some(d => (!!myId && d.data().pid === myId) || (!!myUid && d.id === myUid));
  const myBest = board === "global" ? mine.bestScore : board === "endless" ? mine.bestEndlessFloor : board === "today" && mine.daily?.date === dailyKey() ? mine.daily.bestScore : 0;
  const youRow =
    status === "ready" && !meShown && myBest > 0 && (board === "global" || board === "endless" || board === "today") ? (
      <View style={[styles.row, styles.rowMine, styles.youRow, sideBySide && styles.rowCompact]} accessible accessibilityLabel={`${t("scores.you")}. ${myBest}`}>
        <View style={[styles.rank, sideBySide && styles.rankCompact]}>
          <Text style={styles.rankText} maxFontSizeMultiplier={1.2}>–</Text>
        </View>
        <PlayerPortrait source={skinArt(Math.max(0, lastHero ?? 0), equippedSkin(mine, Math.max(0, lastHero ?? 0))).scoreImage} size={sideBySide ? 30 : 40} frame={lookOf(mine).frame} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, sideBySide && styles.nameCompact]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {myName ?? t("friends.noName")}  ·  {t("scores.you")}
          </Text>
          <Text style={[styles.sub, sideBySide && styles.subCompact, { color: "#8FC0C5" }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {visible.length >= 10 && myBest < Number(visible[visible.length - 1].data().score) ? t("scores.toTop10Short", { n: n(Math.max(1, Number(visible[visible.length - 1].data().score) - myBest + 1)) }) : t("scores.yourBest")}
          </Text>
        </View>
        <Text style={[styles.score, sideBySide && styles.scoreCompact, { color: "#C9A55A" }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
          {n(myBest)}
        </Text>
      </View>
    ) : null;

  const renderItem = ({ item, index: at }: { item: Doc; index: number }) => {
    const index = at + (status === "ready" && visible.length >= 3 ? 3 : 0);
    const row = item.data();
    const char = characters[row.characterIndex] || characters[0];
    const time = typeof row.time === "number" ? formatTime(row.time) : t("scores.noTime");
    const medal = index < 3 ? MEDALS[index] : null;
    const mineRow = (!!myId && row.pid === myId) || (!!myUid && item.id === myUid);
    const compact = sideBySide && podium.length > 0;

    return (
      <View>
      <View style={[styles.row, compact && styles.rowCompact, medal && { borderColor: medal, backgroundColor: "rgba(255,255,255,0.07)" }, mineRow && styles.rowMine]}>
        <View
          style={styles.rowMain}
          accessible
          accessibilityLabel={`#${index + 1} ${row.name}. ${t("scores.col.score")} ${row.score}. ${t("scores.col.floor")} ${row.level}`}
        >
        <View style={[styles.rank, compact && styles.rankCompact, medal ? { backgroundColor: medal } : null]}>
          <Text style={[styles.rankText, medal ? { color: "#2A2016" } : null]} maxFontSizeMultiplier={1.2}>
            {index + 1}
          </Text>
        </View>
        <PlayerPortrait source={char.scoreImage} size={compact ? (row.frame ? 32 : 26) : row.frame ? 50 : 40} frame={row.frame} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {row.name}
            {mineRow ? `  ·  ${t("scores.you")}` : ""}
          </Text>
          {compact ? null : <PlayerTitle title={row.title} />}
          <Text style={[styles.sub, compact && styles.subCompact]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {board === "endless" ? t("scores.endlessSub") : board === "season" ? t("season.pointsShort") : <>{t("scores.floorShort", { n: row.level })}  ·  <GlyphIcon name="gem" size={11} /> {Number(row.coins) || 0}  ·  {time}</>}
          </Text>
        </View>
        <Text style={[styles.score, compact && styles.scoreCompact, medal ? { color: medal } : null]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
          {n(Number(row.score) || 0)}
        </Text>
        </View>
        <TouchableOpacity
          style={[styles.flag, compact && styles.flagCompact]}
          onPress={() => setMenuFor(menuFor === item.id ? null : item.id)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("scores.report.open")}
          accessibilityState={{ expanded: menuFor === item.id }}
        >
          <GameIcon name="flag-outline" size={16} color="#C4AA91" />
        </TouchableOpacity>
      </View>
      {menuFor === item.id && reportMenu(item)}
      </View>
    );
  };

  const beside = sideBySide && podium.length > 0;
  const podiumView = podium.length ? (
    <View style={{ gap: 6 }}>
      <View style={styles.podium}>
        {[1, 0, 2].map(place => {
          const item = podium[place];
          const row = item.data();
          const char = characters[row.characterIndex] || characters[0];
          const medal = MEDALS[place];
          const mineRow = (!!myId && row.pid === myId) || (!!myUid && item.id === myUid);
          const first = place === 0;
          // Each of the three stands full-body in their own frame (or, without one, in the frame of their medal), celebrating.
          const worn = parseLook({ frame: row.frame }).frame ?? PODIUM_FRAMES[place];
          // Sized to the window, so name and score always show under the frames without scrolling.
          const tall = Math.round(Math.min(first ? 176 : 146, height * (first ? 0.38 : 0.31), beside ? cardWidth * (first ? 0.2 : 0.165) : Infinity));
          return (
            <Rise key={item.id} delay={riseDelay(place === 0 ? 2 : place - 1, 80)} style={styles.podiumCol}>
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
                <View style={[styles.podiumGlow, { width: tall * 0.9, height: tall * 0.9, borderRadius: tall, backgroundColor: medal, top: tall * 0.08 }]} />
                <FramedHero source={char.winImage} height={tall} frame={worn} tint={medal} />
                <View style={[styles.podiumBadge, { backgroundColor: medal, marginTop: -16 }]}>
                  <Text style={styles.podiumBadgeText} maxFontSizeMultiplier={1}>{place + 1}</Text>
                </View>
                <View style={[styles.podiumPlate, mineRow && { borderColor: medal }]}>
                  <Text style={styles.podiumName} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                    {row.name}
                  </Text>
                  <PlayerTitle title={row.title} center />
                  <Text style={[styles.podiumScore, { color: medal }, first && { fontSize: 21 }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>
                    {n(Number(row.score) || 0)}
                  </Text>
                  <Text style={styles.podiumMeta} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                    {t("scores.floorShort", { n: row.level })} · {typeof row.time === "number" ? formatTime(row.time) : t("scores.noTime")}
                  </Text>
                </View>
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
        <ActivityIndicator color="#C9A55A" size="large" />
        <Text style={styles.statusText} maxFontSizeMultiplier={1.3}>
          {t("scores.loading")}
        </Text>
      </View>
    ) : status === "error" ? (
      <View style={styles.centerBox} accessibilityLiveRegion="polite">
        <GameIcon name="cloud-offline-outline" size={36} color="#D58A7E" />
        <Text style={[styles.statusText, { color: "#D58A7E" }]} maxFontSizeMultiplier={1.3}>
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
          {board === "today" ? t("scores.empty.today") : board === "week" ? t("scores.empty.week") : board === "season" ? t("scores.empty.season") : board === "endless" ? t("scores.empty.endless") : t("scores.empty")}
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
        <View style={beside ? { gap: 6 } : { marginBottom: 2, gap: 8 }}>
          <Text style={styles.boardNote} maxFontSizeMultiplier={1.2}>
              {board === "global" ? t("scores.globalNote") : board === "today" ? t("scores.dailyNote") : board === "season" ? t("scores.seasonNote") : board === "endless" ? t("scores.endlessNote") : t("scores.weekNote")}
          </Text>
          {status === "ready" ? offlineNotice : null}
          {beside ? null : podiumView}
        </View>
      }
      ListEmptyComponent={podium.length ? undefined : placeholder}
      contentContainerStyle={{ gap: beside ? 4 : 8, paddingBottom: (beside ? 8 : 24) + insets.bottom }}
      ListFooterComponent={
        <>
        {beside ? null : youRow}
        {hidden.length > 0 && status === "ready" ? (
          <TouchableOpacity onPress={showHidden} style={styles.hiddenNote} accessibilityRole="button" accessibilityLabel={t("scores.hidden.show")}>
            <Text style={styles.hiddenText} maxFontSizeMultiplier={1.2}>
              {t("scores.hidden", { count: hidden.length })} · {t("scores.hidden.show")}
            </Text>
          </TouchableOpacity>
        ) : null}
        </>
      }
    />
  );

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.jpg")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(13, 10, 7,0.88)" }} edges={["top", "left", "right"]}>
        <ScreenHeader title={t("scores.title")} onBack={() => navigation.goBack()} />
        <View style={[styles.layout, { width: cardWidth }, twoPanes ? styles.layoutRow : null]}>
          <View style={{ flex: 1, gap: 8 }}>
            {tabs}
            {beside ? (
              <View style={styles.beside}>
                <ScrollView style={styles.podiumPane} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
                  {podiumView}
                </ScrollView>
                <View style={{ flex: 1, gap: 4 }}>
                  {list}
                  {youRow}
                </View>
              </View>
            ) : (
              list
            )}
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  tabs: { flexDirection: "row", gap: 6 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 36, paddingHorizontal: 4, borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(201, 165, 90,0.35)", backgroundColor: "rgba(255,255,255,0.04)" },
  tabOn: { backgroundColor: "#C9A55A", borderColor: "#C9A55A" },
  tabTextTight: { letterSpacing: 0.2, fontSize: 11 },
  tabText: { color: "#EAE1D8", fontWeight: "900", fontSize: 11.5, letterSpacing: 0.8 },
  meRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  meName: { color: "#F3EADB", fontWeight: "900", fontSize: 16 },
  bestRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  podium: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingTop: 6, paddingBottom: 4 },
  podiumCol: { flex: 1 },
  podiumPress: { alignItems: "center" },
  podiumGlow: { position: "absolute", opacity: 0.14 },
  podiumBadge: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 2.5, borderColor: "#1A120B", zIndex: 3 },
  podiumBadgeText: { color: "#1A0F04", fontWeight: "900", fontSize: 15 },
  podiumPlate: { alignSelf: "stretch", alignItems: "center", gap: 1, marginTop: 4, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(20,14,9,0.85)" },
  podiumName: { color: "#F3EADB", fontWeight: "900", fontSize: 13.5 },
  podiumScore: { fontWeight: "900", fontSize: 18, marginTop: 1 },
  podiumMeta: { color: "#C4AA91", fontSize: 11, fontWeight: "700" },
  boardNote: { color: "#C4AA91", fontSize: 12, textAlign: "center" },
  youRow: { marginTop: 2, marginBottom: 6, borderStyle: "dashed" },
  rowCompact: { gap: 8, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1 },
  rankCompact: { width: 24, height: 24, borderRadius: 12 },
  nameCompact: { fontSize: 13, lineHeight: 16 },
  subCompact: { fontSize: 10.5, lineHeight: 13, marginTop: 0 },
  scoreCompact: { fontSize: 15.5, minWidth: 60 },
  flagCompact: { width: 22, height: 22, borderRadius: 11 },
  beside: { flex: 1, flexDirection: "row", gap: 10 },
  podiumPane: { flex: 1.15 },
  rowMine: { borderColor: "#C9A55A", backgroundColor: "rgba(201, 165, 90,0.1)" },
  layout: { flex: 1, alignSelf: "center", padding: 8, gap: 10 },
  layoutRow: { flexDirection: "row" },
  record: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(201, 165, 90,0.5)",
    backgroundColor: "rgba(201, 165, 90,0.08)",
    padding: 14,
    gap: 4,
  },
  recordPane: { width: "30%", flexGrow: 0 },
  recordTitle: { color: "#C9A55A", fontWeight: "900", letterSpacing: 2, fontSize: 12 },
  recordScore: { color: "#F3EADB", fontWeight: "900", fontSize: 34 },
  recordCaption: { flex: 1, color: "#C1A68C", fontWeight: "800", fontSize: 11, letterSpacing: 1.2 },
  recordGrid: { flexDirection: "row", gap: 6, marginTop: 8 },
  recordCell: { flex: 1, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, paddingVertical: 8, alignItems: "center" },
  recordCellValue: { color: "#F3EADB", fontWeight: "900", fontSize: 20 },
  recordCellLabel: { color: "#C1A68C", fontSize: 11, fontWeight: "800", textAlign: "center" },
  recordEmpty: { color: "#E1D4C8", fontSize: 13, marginTop: 6 },
  progressLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: MIN_TOUCH, borderRadius: 14, backgroundColor: "#C9A356", marginTop: 8, paddingHorizontal: 12 },
  progressLinkText: { color: "#2A2016", fontWeight: "900", letterSpacing: 1, fontSize: 13 },
  threshold: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  thresholdText: { color: "#8FC0C5", fontWeight: "800", fontSize: 12, flex: 1 },
  listPane: { flex: 1 },
  offlineNotice: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, borderWidth: 1, borderColor: "rgba(226, 190, 140,0.4)", backgroundColor: "rgba(226, 190, 140,0.1)", paddingVertical: 6, paddingLeft: 12, paddingRight: 6 },
  offlineText: { color: "#E2BE8C", fontWeight: "700", fontSize: 12, flex: 1 },
  offlineRetry: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, backgroundColor: "#C9A55A", alignItems: "center", justifyContent: "center" },
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
  reportButtonText: { color: "#F3EADB", fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  hiddenNote: { minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center" },
  hiddenText: { color: "#C4AA91", fontSize: 12, textDecorationLine: "underline" },
  rank: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  rankText: { color: "#EAE1D8", fontWeight: "900", fontSize: 15 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)" },
  name: { color: "#F3EADB", fontWeight: "900", fontSize: 16 },
  sub: { color: "#C4AA91", fontSize: 12, marginTop: 1 },
  score: { color: "#A3BF7C", fontWeight: "900", fontSize: 20, minWidth: 84, textAlign: "right" },
  centerBox: { alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 40 },
  statusText: { color: "#E1D4C8", fontSize: 14, textAlign: "center" },
  retryButton: { minHeight: MIN_TOUCH, paddingHorizontal: 24, borderRadius: 14, backgroundColor: "#C9A55A", alignItems: "center", justifyContent: "center" },
  retryText: { color: "#000", fontWeight: "900", letterSpacing: 1 },
});

export default HighScoresScreen;
