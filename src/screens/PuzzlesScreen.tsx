import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImageBackground, ScrollView, StyleSheet, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Text from "../ui/components/Text";
import SpriteImage from "../ui/components/SpriteImage";
import ScreenHeader from "../ui/components/ScreenHeader";
import PressScale from "../ui/components/PressScale";
import { useWindowDimensions } from "../ui/layout/scaledWindow";
import { RootStackParamList } from "../navigation/types";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { equipCosmeticFor, getLocalStats, openPuzzleChest, peekLocalStats } from "../services/localStats";
import { ENDLESS_AFTER, PUZZLE_COUNT, PUZZLE_TIERS, dailyPuzzleTier } from "../core/puzzles/puzzles";
import { EMBERS_PER_STAR, MAX_STARS, dailyPuzzleNumber, dailyPuzzleStars, dailyPuzzleStreak, isEndlessOpen, nextPuzzle, puzzleStarsAt, puzzlesSolved, totalPuzzleStars, weeklyState, type PuzzleProgress } from "../core/stats/puzzleProgress";
import { dailyKey, msUntilNextDay } from "../core/engine/seed";
import { formatCountdown } from "../core/stats/countdown";
import { useT } from "../i18n/useT";
import { analytics } from "../services/analytics";
import { useSettingsStore } from "../state/settings/store";
import characters from "../data/characters";
import FriendsToday from "./puzzle/FriendsToday";
import ChapterMap, { TIER_TINTS, type MapFx } from "./puzzle/ChapterMap";
import ArchiveModal from "./puzzle/ArchiveModal";
import ChestReveal from "./puzzle/ChestReveal";
import PuzzleStats from "./puzzle/PuzzleStats";
import DailyCard from "./puzzle/DailyCard";
import WeeklyCard from "./puzzle/WeeklyCard";
import { msUntilWeekEnd, weekOf } from "../core/puzzles/weekly";
import EndlessPortal from "./puzzle/EndlessPortal";

type Props = NativeStackScreenProps<RootStackParamList, "PuzzlesScreen">;

const GOLD = "#FFD54F";
const STAR = require("../assets/sprites/ui/Icon_Star.webp");
const BOOK = require("../assets/sprites/ui/Icon_Book.webp");
const CALENDAR = require("../assets/sprites/ui/Icon_Calendar.webp");
const PER_CHAPTER = PUZZLE_COUNT / PUZZLE_TIERS.length;

/** What changed on the path since `prev`: the stars won, where the hero stood, and the chapter just opened (null: nothing). */
function fxBetween(prev: PuzzleProgress | undefined, cur: PuzzleProgress | undefined): Omit<MapFx, "key"> | null {
  const gained: Record<number, number> = {};
  for (let i = 0; i < PUZZLE_COUNT; i++) {
    const before = puzzleStarsAt(prev, i);
    if (puzzleStarsAt(cur, i) > before) gained[i] = before;
  }
  if (Object.keys(gained).length === 0) return null;
  const from = nextPuzzle(prev);
  const to = nextPuzzle(cur);
  const opened = Math.floor(to / PER_CHAPTER) > Math.floor(from / PER_CHAPTER) && puzzleStarsAt(cur, to) === 0 ? Math.floor(to / PER_CHAPTER) : null;
  return { gained, walkFrom: to !== from ? from : null, unlocked: opened };
}
const ENDLESS_TINT = "#CE93D8";
const PAGER = 36;

/**
 * The cave's puzzles. On the left the puzzle of the day (the same for everyone), its streak and friends; on the right the path
 * of thirty, as five chapters of the cave turned like pages (each a map of six puzzles on a winding trail, the hero standing on
 * the next one), and at its end the portal to the endless puzzles. It opens on the chapter where the player is.
 */
export default function PuzzlesScreen({ navigation, route }: Props) {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const calm = useSettingsStore(s => s.reduceFlash);
  const lastHero = useSettingsStore(s => s.lastHero);
  const [stats, setStats] = useState<LocalStats>(() => peekLocalStats() ?? EMPTY_STATS);
  const [now, setNow] = useState(() => new Date());
  // The path as it was last shown: coming back from a puzzle, what changed is played on the map once.
  const seen = useRef<PuzzleProgress | null>(null);
  const [fx, setFx] = useState<MapFx | null>(null);
  const [chestTier, setChestTier] = useState<number | null>(null);
  const [archive, setArchive] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  // Continue (from a solved puzzle): once the map has played what changed (the stars, the walk, a chapter opening), the next
  // puzzle opens by itself on its card.
  const continueTo = useRef<number | undefined>(undefined);
  continueTo.current = route.params?.continueTo;
  const continueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void getLocalStats().then(loaded => {
        if (!alive) return;
        // Development only: other stars on the path, and a return from solving the last few of them played on open.
        const devStars = __DEV__ ? route.params?.devStars : undefined;
        const s = devStars ? { ...loaded, puzzles: { ...loaded.puzzles, stars: devStars } } : loaded;
        const devSolve = __DEV__ && seen.current === null ? route.params?.devSolve ?? 0 : 0;
        if (devSolve > 0) {
          const solved = s.puzzles.stars.filter(v => v > 0).length;
          seen.current = { ...s.puzzles, stars: s.puzzles.stars.map((v, i) => (i >= solved - devSolve ? 0 : v)) };
        }
        const before = seen.current;
        seen.current = s.puzzles;
        setStats(s);
        const change = before ? fxBetween(before, s.puzzles) : null;
        if (change) setFx({ ...change, key: Date.now() });
        const go = continueTo.current;
        if (go !== undefined) {
          navigation.setParams({ continueTo: undefined });
          const wait = change?.unlocked != null ? 3900 : change ? 2700 : 800;
          continueTimer.current = setTimeout(() => navigation.navigate("PuzzleScreen", { target: go }), wait);
        }
      });
      setNow(new Date());
      return () => {
        alive = false;
        if (continueTimer.current) clearTimeout(continueTimer.current);
      };
    }, []),
  );
  useEffect(() => {
    analytics.track("screen_view", { screen: "puzzles" });
  }, []);

  const today = dailyKey(now);
  const puzzles = stats.puzzles;
  const next = nextPuzzle(puzzles);
  const stars = totalPuzzleStars(puzzles);
  const endless = puzzles?.endless ?? { solved: 0, run: 0, bestRun: 0 };
  const endlessOpen = isEndlessOpen(puzzles);
  const pages = PUZZLE_TIERS.length + 1;
  // Where the player is: the chapter of the next puzzle, or the portal once all thirty are solved.
  const home = puzzlesSolved(puzzles) >= PUZZLE_COUNT ? pages - 1 : Math.floor(next / PER_CHAPTER);
  const hero = characters[lastHero] ?? characters[0];

  const side = Math.round(Math.max(200, Math.min(260, width * 0.27)));
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [page, setPage] = useState(home);
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const placed = useRef(false);
  const onBox = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setBox({ w: Math.round(w), h: Math.round(h) });
  };
  // Open on the player's chapter once the pages have a size (and keep the page when the window changes size).
  useEffect(() => {
    if (!box.w) return;
    scroller.current?.scrollTo({ x: (placed.current ? page : home) * box.w, animated: false });
    if (!placed.current) {
      placed.current = true;
      setPage(home);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box.w]);
  const goTo = (p: number) => {
    const target = Math.max(0, Math.min(pages - 1, p));
    setPage(target);
    scroller.current?.scrollTo({ x: target * box.w, animated: true });
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!box.w) return;
    const p = Math.round(e.nativeEvent.contentOffset.x / box.w);
    if (p !== page && p >= 0 && p < pages) setPage(p);
  };
  const mapH = Math.max(0, box.h - PAGER);
  // A return with news: show the chapter where stars were won, then turn to the chapter (or the portal) that just opened.
  useEffect(() => {
    if (!fx || !box.w) return;
    const won = Math.max(...Object.keys(fx.gained).map(Number));
    const at = Math.floor(won / PER_CHAPTER);
    setPage(at);
    scroller.current?.scrollTo({ x: at * box.w, animated: false });
    const then = fx.unlocked;
    if (then === null || then === at) return;
    const timer = setTimeout(() => goTo(then), 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fx?.key, box.w]);
  const openChest = (tier: number) => {
    setChestTier(tier);
    void openPuzzleChest(tier).then(s => {
      seen.current = s.puzzles;
      setStats(s);
    });
  };

  const dailyStars = dailyPuzzleStars(puzzles, today);
  const daily = (
    <DailyCard
      number={dailyPuzzleNumber(today)}
      tier={dailyPuzzleTier(today)}
      stars={dailyStars}
      streak={dailyPuzzleStreak(puzzles, today)}
      bestStreak={puzzles?.bestStreak ?? 0}
      weekday={now.getDay()}
      countdown={formatCountdown(msUntilNextDay(now))}
      onPress={() => navigation.navigate("PuzzleScreen", { target: "daily" })}
    />
  );

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(10, 13, 16, 0.86)" }} edges={["top", "left", "right"]}>
        <ScreenHeader
          title={t("puzzle.title")}
          subtitle={t("puzzle.pathNote", { n: EMBERS_PER_STAR })}
          onBack={() => navigation.goBack()}
          right={
            <PressScale onPress={() => setStatsOpen(true)} style={styles.total} accessibilityRole="button" accessibilityLabel={`${t("puzzle.stats.title")}. ${t("puzzle.totalStars", { n: stars, total: PUZZLE_COUNT * MAX_STARS })}`}>
              <Ionicons name="stats-chart" size={15} color={GOLD} />
              <SpriteImage source={STAR} style={{ width: 18, height: 18 }} resizeMode="contain" />
              <Text style={styles.totalText} maxFontSizeMultiplier={1.15}>
                {`${stars}/${PUZZLE_COUNT * MAX_STARS}`}
              </Text>
            </PressScale>
          }
        />
        <View style={styles.body}>
          <ScrollView style={{ width: side, flexGrow: 0 }} contentContainerStyle={styles.sideContent} showsVerticalScrollIndicator={false}>
            {daily}
            <WeeklyCard
              week={weekOf(today)}
              state={weeklyState(puzzles, weekOf(today))}
              left={(() => {
                const ms = msUntilWeekEnd(today, now);
                return ms >= 86_400_000 ? t("puzzle.weekly.days", { n: Math.ceil(ms / 86_400_000) }) : formatCountdown(ms);
              })()}
              friends={stats.friends}
              onPlay={practice => navigation.navigate("PuzzleScreen", practice ? { target: "weekly", practice: true } : { target: "weekly" })}
            />
            <PressScale
              onPress={() => setArchive(true)}
              style={styles.techniques}
              accessibilityRole="button"
              accessibilityLabel={t("puzzle.archive.title")}
            >
              <SpriteImage source={CALENDAR} style={{ width: 24, height: 24 }} resizeMode="contain" />
              <Text style={styles.techniquesText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.1}>
                {t("puzzle.archive.link", { n: Object.keys(puzzles?.archive ?? {}).length })}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#FFD54F" />
            </PressScale>
            <PressScale
              onPress={() => navigation.navigate("InstructionsScreen", { topic: "techniques" })}
              style={styles.techniques}
              accessibilityRole="button"
              accessibilityLabel={t("puzzle.techniques")}
            >
              <SpriteImage source={BOOK} style={{ width: 26, height: 26 }} resizeMode="contain" />
              <Text style={styles.techniquesText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.1}>
                {t("puzzle.techniques")}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#FFD54F" />
            </PressScale>
            <FriendsToday date={today} friends={stats.friends} onAddFriends={() => navigation.navigate("HighScoresScreen")} />
          </ScrollView>

          <View style={{ flex: 1 }} onLayout={onBox}>
            {box.w > 0 && mapH > 0 ? (
              <>
                <ScrollView
                  ref={scroller}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={onScroll}
                  scrollEventThrottle={64}
                  style={{ width: box.w, height: mapH, flexGrow: 0 }}
                >
                  {PUZZLE_TIERS.map((_, tier) => (
                    <View key={tier} style={{ width: box.w, height: mapH }}>
                      <ChapterMap
                        tier={tier}
                        width={box.w}
                        height={mapH}
                        puzzles={puzzles}
                        next={next}
                        heroArt={hero.scoreImage}
                        calm={calm}
                        active={page === tier}
                        fx={fx}
                        onOpen={i => navigation.navigate("PuzzleScreen", { target: i })}
                        onChest={openChest}
                      />
                    </View>
                  ))}
                  <View style={{ width: box.w, height: mapH }}>
                    <EndlessPortal
                      width={box.w}
                      height={mapH}
                      open={endlessOpen}
                      solvedPath={(puzzles?.stars ?? []).slice(0, ENDLESS_AFTER).filter(s => s > 0).length}
                      solved={endless.solved}
                      bestRun={endless.bestRun}
                      calm={calm || page !== pages - 1}
                      onPlay={() => navigation.navigate("PuzzleScreen", { target: "endless", n: endless.solved })}
                    />
                  </View>
                </ScrollView>
                <View style={styles.pager}>
                  <PressScale onPress={() => goTo(page - 1)} disabled={page === 0} style={[styles.arrow, page === 0 && { opacity: 0.3 }]} accessibilityRole="button" accessibilityLabel={t("puzzle.chapterPrev")}>
                    <Ionicons name="chevron-back" size={18} color="#fff" />
                  </PressScale>
                  <View style={styles.dots}>
                    {Array.from({ length: pages }, (_, p) => {
                      const tint = p < PUZZLE_TIERS.length ? TIER_TINTS[p] : ENDLESS_TINT;
                      const on = p === page;
                      return (
                        <PressScale
                          key={p}
                          onPress={() => goTo(p)}
                          style={styles.dotHit}
                          accessibilityRole="button"
                          accessibilityLabel={p < PUZZLE_TIERS.length ? t("puzzle.chapter", { n: p + 1 }) : t("puzzle.endless.title")}
                          accessibilityState={{ selected: on }}
                        >
                          <View style={[styles.dot, { backgroundColor: on ? tint : tint + "55", width: on ? 26 : 9 }]} />
                        </PressScale>
                      );
                    })}
                  </View>
                  <PressScale onPress={() => goTo(page + 1)} disabled={page === pages - 1} style={[styles.arrow, page === pages - 1 && { opacity: 0.3 }]} accessibilityRole="button" accessibilityLabel={t("puzzle.chapterNext")}>
                    <Ionicons name="chevron-forward" size={18} color="#fff" />
                  </PressScale>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
      {statsOpen ? <PuzzleStats puzzles={puzzles} onClose={() => setStatsOpen(false)} /> : null}
      {archive ? (
        <ArchiveModal
          today={today}
          puzzles={puzzles}
          onClose={() => setArchive(false)}
          onPlay={date => {
            setArchive(false);
            navigation.navigate("PuzzleScreen", date === today ? { target: "daily" } : { target: "archive", date });
          }}
        />
      ) : null}
      {chestTier !== null ? (
        <ChestReveal
          tier={chestTier}
          calm={calm}
          onClose={() => setChestTier(null)}
          onEquip={ids => {
            setChestTier(null);
            void (async () => {
              let last = null;
              for (const id of ids) last = (await equipCosmeticFor(id.startsWith("frame_") ? "frame" : "title", id)) ?? last;
              if (last) setStats(last);
            })();
          }}
        />
      ) : null}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  body: { flex: 1, flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  sideContent: { gap: 10, paddingBottom: 12 },
  techniques: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: GOLD + "55", backgroundColor: "rgba(0,0,0,0.35)" },
  techniquesText: { flex: 1, color: "#FFE9B0", fontWeight: "800", fontSize: 12.5 },
  pager: { height: PAGER, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  arrow: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  dots: { flexDirection: "row", alignItems: "center" },
  dotHit: { paddingHorizontal: 4, paddingVertical: 10 },
  dot: { height: 9, borderRadius: 5 },
  total: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.4)", borderWidth: 1, borderColor: GOLD + "66" },
  totalText: { color: GOLD, fontWeight: "900", fontSize: 13 },
});
