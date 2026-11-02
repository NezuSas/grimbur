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
import { getLocalStats, peekLocalStats } from "../services/localStats";
import { PUZZLE_COUNT, PUZZLE_TIERS, dailyPuzzleTier } from "../core/puzzles/puzzles";
import { EMBERS_PER_STAR, MAX_STARS, dailyPuzzleNumber, dailyPuzzleStars, dailyPuzzleStreak, isEndlessOpen, nextPuzzle, puzzlesSolved, totalPuzzleStars } from "../core/stats/puzzleProgress";
import { dailyKey, msUntilNextDay } from "../core/engine/seed";
import { formatCountdown } from "../core/stats/countdown";
import { useT } from "../i18n/useT";
import { analytics } from "../services/analytics";
import { useSettingsStore } from "../state/settings/store";
import characters from "../data/characters";
import FriendsToday from "./puzzle/FriendsToday";
import ChapterMap, { TIER_TINTS } from "./puzzle/ChapterMap";
import DailyCard from "./puzzle/DailyCard";
import EndlessPortal from "./puzzle/EndlessPortal";

type Props = NativeStackScreenProps<RootStackParamList, "PuzzlesScreen">;

const GOLD = "#FFD54F";
const STAR = require("../assets/sprites/ui/Icon_Star.png");
const BOOK = require("../assets/sprites/ui/Icon_Book.png");
const ENDLESS_TINT = "#CE93D8";
const PAGER = 36;

/**
 * The cave's puzzles. On the left the puzzle of the day (the same for everyone), its streak and friends; on the right the path
 * of thirty, as five chapters of the cave turned like pages (each a map of six puzzles on a winding trail, the hero standing on
 * the next one), and at its end the portal to the endless puzzles. It opens on the chapter where the player is.
 */
export default function PuzzlesScreen({ navigation }: Props) {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const calm = useSettingsStore(s => s.reduceFlash);
  const lastHero = useSettingsStore(s => s.lastHero);
  const [stats, setStats] = useState<LocalStats>(() => peekLocalStats() ?? EMPTY_STATS);
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void getLocalStats().then(s => alive && setStats(s));
      setNow(new Date());
      return () => {
        alive = false;
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
  const home = endlessOpen ? pages - 1 : Math.floor(next / (PUZZLE_COUNT / PUZZLE_TIERS.length));
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
            <View style={styles.total} accessible accessibilityLabel={t("puzzle.totalStars", { n: stars, total: PUZZLE_COUNT * MAX_STARS })}>
              <SpriteImage source={STAR} style={{ width: 18, height: 18 }} resizeMode="contain" />
              <Text style={styles.totalText} maxFontSizeMultiplier={1.15}>
                {`${stars}/${PUZZLE_COUNT * MAX_STARS}`}
              </Text>
            </View>
          }
        />
        <View style={styles.body}>
          <ScrollView style={{ width: side, flexGrow: 0 }} contentContainerStyle={styles.sideContent} showsVerticalScrollIndicator={false}>
            {daily}
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
                        calm={calm || Math.abs(page - tier) > 0}
                        onOpen={i => navigation.navigate("PuzzleScreen", { target: i })}
                      />
                    </View>
                  ))}
                  <View style={{ width: box.w, height: mapH }}>
                    <EndlessPortal
                      width={box.w}
                      height={mapH}
                      open={endlessOpen}
                      solvedPath={puzzlesSolved(puzzles)}
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
