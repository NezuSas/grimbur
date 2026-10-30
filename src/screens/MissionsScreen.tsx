import React, { useCallback, useEffect, useState } from "react";
import { ImageBackground, ScrollView, StyleSheet, View } from "react-native";
import Rise, { riseDelay } from "../ui/components/Rise";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Text from "../ui/components/Text";
import ScreenHeader from "../ui/components/ScreenHeader";
import SpriteImage from "../ui/components/SpriteImage";
import PressScale from "../ui/components/PressScale";
import { RootStackParamList } from "../navigation/types";
import { MIN_TOUCH, useGameLayout } from "../ui/layout/useGameLayout";
import { useWindowDimensions } from "../ui/layout/scaledWindow";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/en";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { claimMissionReward, getMissions, peekLocalStats } from "../services/localStats";
import { emitSound } from "../audio/audioEventBus";
import EmberIcon from "../ui/components/EmberIcon";
import { DAILY_BONUS, MissionDef, MissionProgress, bonusReady, isComplete, missionDef, syncMissions } from "../core/stats/missions";
import { HERO_UNLOCKS, isHeroUnlocked } from "../core/stats/heroUnlocks";
import { RANK_THRESHOLDS, rankOf } from "../core/stats/rank";
import { dailyKey, msUntilNextDay } from "../core/engine/seed";
import { formatCountdown } from "../core/stats/countdown";
import { weeklyChallenge } from "../core/challenge/weekly";
import { haptic } from "../shared/haptics";
import { themeArt, type AchievementTheme } from "../ui/achievementArt";

type Props = NativeStackScreenProps<RootStackParamList, "MissionsScreen">;

const GOLD = "#FFD54F";
const TIER_COLOR = { easy: "#81C784", medium: "#4FC3F7", hard: "#FF8A65" } as const;

/** Each mission wears the painted emblem of what it counts. */
const METRIC_ART: Record<MissionDef["metric"], AchievementTheme> = {
  runs: "games",
  gems: "gems",
  wins: "wins",
  daily: "dailyRuns",
  floor: "floor",
  score: "score",
  relics: "relics",
  heroes: "heroes",
};
const MEDAL = require("../assets/sprites/ui/Icon_Medal.png");
const CHEST = require("../assets/sprites/ui/Icon_Trophy.png");

/** The days left in the week (the weekly missions change on Monday). */
const daysToMonday = (now: Date): number => 7 - ((now.getDay() + 6) % 7);

/**
 * Missions: the player's rank on the left (it only climbs: every ember ever earned counts) and today's or this week's missions on the
 * right, each with the emblem of what it counts and its reward, a gold button once it can be claimed.
 */
const MissionsScreen: React.FC<Props> = ({ navigation }) => {
  const { t, plural, n } = useT();
  const { width } = useWindowDimensions();
  const { insets } = useGameLayout();
  const narrow = width < 600;
  const [stats, setStats] = useState<LocalStats>(() => {
    const known = peekLocalStats() ?? EMPTY_STATS;
    // Until the saved ones are read, show what today's missions would be (nothing flashes empty).
    return { ...known, missions: syncMissions(known.missions, dailyKey(), HERO_UNLOCKS.filter((_, i) => isHeroUnlocked(i, known)).length) };
  });
  const [now, setNow] = useState(() => new Date());
  const weekly = weeklyChallenge(dailyKey(now));
  // Development only (web): `?ladder=1` opens the rank ladder, for screenshots.
  const [ladder, setLadder] = useState(() => __DEV__ && typeof location !== "undefined" && new URLSearchParams(location.search).get("ladder") === "1");
  // Development only (web): `?tab=weekly` opens the week, for screenshots.
  const [tab, setTab] = useState<"daily" | "weekly">(() => (__DEV__ && typeof location !== "undefined" && new URLSearchParams(location.search).get("tab") === "weekly" ? "weekly" : "daily"));

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMissions()
        .then(loaded => active && setStats(loaded))
        .catch(() => {});
      return () => {
        active = false;
      };
    }, []),
  );
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const claim = async (id: string) => {
    const next = await claimMissionReward(id);
    if (next) {
      haptic.impact();
      emitSound("EMBER_GAIN");
      setStats(next);
    }
  };

  const text = (def: MissionDef) => (def.metric === "wins" || def.metric === "daily" ? plural(`mission.desc.${def.metric}` as never, def.target, { n: def.target }) : t(`mission.desc.${def.metric}` as TranslationKey, { n: def.target }));

  const rank = rankOf(stats.lifetimeEmbers);
  const rankName = t(`rank.${rank.level}` as TranslationKey);
  const nextName = rank.to !== null ? t(`rank.${rank.level + 1}` as TranslationKey) : "";
  const m = stats.missions;
  const allClaimed = m.daily.length > 0 && m.daily.every(p => p.claimed);

  /** The reward on the right of a mission: what it pays, a gold button once it can be claimed, a tick once it was. */
  const rewardButton = (claimed: boolean, ready: boolean, reward: number, onPress: () => void) =>
    claimed ? (
      <View style={styles.claimedChip} accessible accessibilityLabel={t("missions.claimed")}>
        <Ionicons name="checkmark-circle" size={24} color="#9EE37D" />
      </View>
    ) : (
      <PressScale
        style={[styles.reward, ready && styles.rewardReady]}
        disabled={!ready}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ disabled: !ready }}
        accessibilityLabel={`${t("missions.claim")}: +${reward}`}
      >
        <Text style={[styles.rewardText, ready && { color: "#1a1200" }]} maxFontSizeMultiplier={1.1}>
          <EmberIcon size={13} /> +{reward}
        </Text>
        {ready ? (
          <Text style={styles.claimText} maxFontSizeMultiplier={1.1}>
            {t("missions.claim").toLocaleUpperCase()}
          </Text>
        ) : null}
      </PressScale>
    );

  const card = (p: MissionProgress, index = 0) => {
    const def = missionDef(p.id);
    if (!def) return null;
    const done = isComplete(p);
    const color = TIER_COLOR[def.tier];
    const shown = Math.min(p.progress, def.target);
    return (
      <Rise key={p.id} delay={riseDelay(index, 60)} style={[styles.mission, done && !p.claimed && styles.missionReady, p.claimed && styles.missionClaimed]}>
        <View style={[styles.tierBar, { backgroundColor: color }]} />
        <SpriteImage source={themeArt(METRIC_ART[def.metric])} style={styles.missionArt} resizeMode="contain" accessibilityIgnoresInvertColors />
        <View style={styles.missionBody}>
          <Text style={[styles.missionText, p.claimed && { color: "#B99A7C" }]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
            {text(def)}
          </Text>
          <View style={styles.barRow}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(shown / def.target) * 100}%`, backgroundColor: done ? "#9EE37D" : color }]} />
            </View>
            <Text style={styles.count} maxFontSizeMultiplier={1.1}>
              {n(shown)}/{n(def.target)}
            </Text>
          </View>
        </View>
        {rewardButton(p.claimed, done, def.reward, () => void claim(p.id))}
      </Rise>
    );
  };

  const claimable = (list: MissionProgress[]) => list.filter(p => !p.claimed && isComplete(p)).length;
  const dailyReady = claimable(m.daily) + (bonusReady(m) ? 1 : 0);
  const weeklyReady = claimable(m.weekly);
  const dailyDone = m.daily.filter(p => p.claimed).length;

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(13, 10, 7,0.9)" }} edges={["top", "left", "right"]}>
        <ScreenHeader title={t("missions.title")} onBack={() => navigation.goBack()} />
        <View style={[styles.body, narrow && styles.bodyNarrow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <ScrollView style={[styles.side, narrow && styles.sideNarrow]} contentContainerStyle={styles.sideContent} showsVerticalScrollIndicator={false}>
            <Rise style={styles.rankCard}>
              <View style={styles.rankTop}>
                <View style={styles.medal}>
                  <SpriteImage source={MEDAL} style={styles.medalArt} resizeMode="contain" accessibilityIgnoresInvertColors />
                  <View style={styles.medalNum}>
                    <Text style={styles.rankNumber} maxFontSizeMultiplier={1.1}>
                      {rank.level}
                    </Text>
                  </View>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.rankLabel} maxFontSizeMultiplier={1.1}>
                    {t("missions.rank").toLocaleUpperCase()}
                  </Text>
                  <Text style={styles.rankName} numberOfLines={2} maxFontSizeMultiplier={1.15}>
                    {rankName}
                  </Text>
                </View>
              </View>
              <View style={styles.rankTrack}>
                <View style={[styles.fill, { width: `${rank.progress * 100}%`, backgroundColor: GOLD }]} />
              </View>
              <Text style={styles.rankNext} maxFontSizeMultiplier={1.15}>
                {rank.to === null ? t("missions.rankTop") : t("missions.rankNext", { n: rank.remaining, name: nextName })}
              </Text>
              <Text style={styles.rankEarned} maxFontSizeMultiplier={1.15}>
                {rank.to === null ? t("missions.rankEarned", { earned: rank.earned }) : t("missions.rankEarnedOf", { earned: rank.earned, to: rank.to })}
              </Text>
              <PressScale onPress={() => setLadder(v => !v)} style={styles.ladderButton} accessibilityRole="button" accessibilityLabel={ladder ? t("missions.rankLadderHide") : t("missions.rankLadder")}>
                <Text style={styles.ladderButtonText} maxFontSizeMultiplier={1.1}>
                  {(ladder ? t("missions.rankLadderHide") : t("missions.rankLadder")).toLocaleUpperCase()}
                </Text>
                <Ionicons name={ladder ? "chevron-up" : "chevron-down"} size={16} color={GOLD} />
              </PressScale>
            </Rise>
            {ladder ? (
              <View style={styles.ladder}>
                <Text style={styles.ladderInfo} maxFontSizeMultiplier={1.2}>
                  {t("missions.rankInfo")}
                </Text>
                {RANK_THRESHOLDS.map((from, i) => {
                  const level = i + 1;
                  const reached = rank.level >= level;
                  const current = rank.level === level;
                  return (
                    <View key={level} style={[styles.ladderRow, current && styles.ladderCurrent]}>
                      <View style={[styles.ladderBadge, reached && styles.ladderBadgeOn]}>
                        <Text style={[styles.ladderNumber, reached && { color: GOLD }]}>{level}</Text>
                      </View>
                      {/* The name gets the whole line (the longest ones do not fit beside the number); the threshold goes under it. */}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.ladderName, !reached && { color: "#B99A7C" }]} numberOfLines={2} maxFontSizeMultiplier={1.1}>
                          {t(`rank.${level}` as TranslationKey)}
                        </Text>
                        <Text style={styles.ladderFrom} maxFontSizeMultiplier={1.1}>
                          {t("missions.rankFrom", { n: from })}
                        </Text>
                      </View>
                      {reached ? <Ionicons name={current ? "location" : "checkmark"} size={14} color={current ? GOLD : "#9EE37D"} /> : <View style={{ width: 14 }} />}
                    </View>
                  );
                })}
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.main}>
            <View style={styles.tabs}>
              {(
                [
                  ["daily", t("missions.today"), dailyReady],
                  ["weekly", t("missions.week"), weeklyReady],
                ] as const
              ).map(([k, label, count]) => {
                const on = tab === k;
                return (
                  <PressScale key={k} onPress={() => setTab(k)} style={[styles.tab, on && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label}>
                    <Text style={[styles.tabText, on && { color: "#1a0f00" }]} maxFontSizeMultiplier={1.1}>
                      {label.toLocaleUpperCase()}
                    </Text>
                    {count > 0 ? (
                      <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText} allowFontScaling={false}>
                          {count}
                        </Text>
                      </View>
                    ) : null}
                  </PressScale>
                );
              })}
              <View style={styles.refreshBox}>
                <Ionicons name="time-outline" size={14} color="#B99A7C" />
                <Text style={styles.refresh} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                  {tab === "daily" ? t("missions.refreshDay", { time: formatCountdown(msUntilNextDay(now)) }) : t("missions.refreshWeek", { days: daysToMonday(now) })}
                </Text>
              </View>
            </View>

            <ScrollView key={tab} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {tab === "daily" ? (
                <>
                  {m.daily.length === 0 ? <Text style={styles.empty}>{t("missions.empty")}</Text> : m.daily.map(card)}
                  <Rise delay={riseDelay(m.daily.length, 60)} style={[styles.mission, styles.bonus, bonusReady(m) && styles.missionReady, m.bonusClaimed && styles.missionClaimed]}>
                    <View style={[styles.tierBar, { backgroundColor: GOLD }]} />
                    <SpriteImage source={CHEST} style={styles.missionArt} resizeMode="contain" accessibilityIgnoresInvertColors />
                    <View style={styles.missionBody}>
                      <Text style={[styles.missionText, m.bonusClaimed && { color: "#B99A7C" }]} maxFontSizeMultiplier={1.2}>
                        {t("missions.bonus")}
                      </Text>
                      <View style={styles.barRow}>
                        <View style={styles.bonusPips}>
                          {m.daily.map(p => (
                            <View key={p.id} style={[styles.bonusPip, p.claimed && { backgroundColor: GOLD, borderColor: GOLD }]} />
                          ))}
                        </View>
                        {!allClaimed ? (
                          <Text style={styles.bonusHint} numberOfLines={2} maxFontSizeMultiplier={1.1}>
                            {dailyDone}/{m.daily.length} · {t("missions.bonusHint")}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    {rewardButton(m.bonusClaimed, bonusReady(m), DAILY_BONUS, () => void claim("bonus"))}
                  </Rise>
                </>
              ) : (
                <>
                  {/* The challenge of the week: one cave for everyone, at this week's depth, on its own board. */}
                  <Rise delay={0}>
                    <PressScale onPress={() => navigation.navigate("ChallengeScreen", { code: weekly.code })} accessibilityRole="button" style={styles.weekly}>
                      <SpriteImage source={require("../assets/sprites/ui/Icon_Swords.png")} style={styles.weeklyArt} resizeMode="contain" accessibilityIgnoresInvertColors />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.weeklyKicker} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                          {`${t("weekly.title")} · ${t(`ascension.label.${weekly.depth}` as TranslationKey)}`.toLocaleUpperCase()}
                        </Text>
                        <Text style={styles.weeklyText} numberOfLines={2} maxFontSizeMultiplier={1.15}>
                          {t("weekly.rule")}
                        </Text>
                      </View>
                      <View style={styles.weeklyPlay}>
                        <Text style={styles.weeklyPlayText} maxFontSizeMultiplier={1.1}>{t("weekly.play").toLocaleUpperCase()}</Text>
                        <Ionicons name="chevron-forward" size={14} color="#1a1200" />
                      </View>
                    </PressScale>
                  </Rise>
                  {m.weekly.length === 0 ? <Text style={styles.empty}>{t("missions.empty")}</Text> : m.weekly.map(card)}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const CARD = "rgba(34, 26, 18,0.9)";
const BORDER = "rgba(255,255,255,0.09)";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  body: { flex: 1, flexDirection: "row", gap: 12, paddingHorizontal: 12, paddingTop: 4, width: "100%", maxWidth: 1000, alignSelf: "center" },
  bodyNarrow: { flexDirection: "column" },
  side: { width: "34%", maxWidth: 340, flexGrow: 0 },
  sideNarrow: { width: "100%", maxWidth: undefined, maxHeight: "45%" },
  sideContent: { gap: 8, paddingBottom: 8 },
  main: { flex: 1, gap: 8 },

  rankCard: { backgroundColor: CARD, borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,213,79,0.45)", padding: 12, gap: 6 },
  rankTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  medal: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  medalArt: { width: 72, height: 72 },
  medalNum: { position: "absolute", bottom: -2, right: -2, minWidth: 28, height: 28, borderRadius: 14, paddingHorizontal: 4, backgroundColor: "#2A2016", borderWidth: 2, borderColor: GOLD, alignItems: "center", justifyContent: "center" },
  rankNumber: { color: GOLD, fontWeight: "900", fontSize: 14 },
  rankLabel: { color: "#B99A7C", fontWeight: "900", fontSize: 11, letterSpacing: 1.2 },
  rankName: { color: "#fff", fontWeight: "900", fontSize: 20 },
  rankTrack: { height: 9, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  rankNext: { color: "#E4D8CD", fontSize: 12.5, fontWeight: "800" },
  rankEarned: { color: "#B99A7C", fontSize: 11.5, fontWeight: "700" },
  ladderButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 36, marginTop: 2, borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,213,79,0.5)", backgroundColor: "rgba(255,213,79,0.08)" },
  ladderButtonText: { color: GOLD, fontWeight: "900", fontSize: 11.5, letterSpacing: 1 },
  ladder: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 10, gap: 4 },
  ladderInfo: { color: "#DCCCBD", fontSize: 12, lineHeight: 17, marginBottom: 4 },
  ladderRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 10 },
  ladderCurrent: { backgroundColor: "rgba(255,213,79,0.12)", borderWidth: 1, borderColor: "rgba(255,213,79,0.45)" },
  ladderBadge: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  ladderBadgeOn: { borderColor: GOLD, backgroundColor: "rgba(255,213,79,0.14)" },
  ladderNumber: { color: "#B99A7C", fontWeight: "900", fontSize: 11 },
  ladderName: { color: "#fff", fontWeight: "900", fontSize: 13 },
  ladderFrom: { color: "#B99A7C", fontSize: 11, fontWeight: "700" },

  tabs: { flexDirection: "row", alignItems: "center", gap: 6 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)" },
  tabOn: { backgroundColor: GOLD, borderColor: GOLD },
  tabText: { color: "#EAE1D8", fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#FF5252", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  tabBadgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  refreshBox: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  refresh: { color: "#B99A7C", fontWeight: "700", fontSize: 11.5, flexShrink: 1 },
  list: { gap: 8, paddingBottom: 16 },
  weekly: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,138,101,0.7)", backgroundColor: "rgba(70,30,20,0.9)" },
  weeklyArt: { width: 48, height: 48 },
  weeklyKicker: { color: "#FF8A65", fontWeight: "900", fontSize: 12, letterSpacing: 1.2 },
  weeklyText: { color: "#F1E4D6", fontWeight: "700", fontSize: 12.5 },
  weeklyPlay: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 12, minHeight: 38, borderRadius: 19, backgroundColor: "#FF8A65" },
  weeklyPlayText: { color: "#1a1200", fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  empty: { color: "#B99A7C", fontStyle: "italic", paddingHorizontal: 4 },

  mission: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: CARD, borderRadius: 16, borderWidth: 1.5, borderColor: BORDER, overflow: "hidden", paddingRight: 10, minHeight: 66 },
  missionReady: { borderColor: "rgba(158,227,125,0.7)", backgroundColor: "rgba(158,227,125,0.08)" },
  missionClaimed: { opacity: 0.6 },
  bonus: { borderColor: "rgba(255,213,79,0.45)" },
  tierBar: { width: 5, alignSelf: "stretch" },
  missionArt: { width: 44, height: 44 },
  missionBody: { flex: 1, paddingVertical: 10, gap: 7 },
  missionText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  bonusPips: { flexDirection: "row", gap: 4 },
  bonusPip: { width: 14, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: "rgba(255,213,79,0.5)" },
  bonusHint: { color: "#CBB49E", fontSize: 11.5, flexShrink: 1 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  count: { color: "#E4D8CD", fontWeight: "800", fontSize: 12, minWidth: 50, textAlign: "right" },
  reward: { minWidth: 76, minHeight: MIN_TOUCH, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,171,64,0.5)", backgroundColor: "rgba(255,171,64,0.1)", alignItems: "center", justifyContent: "center", gap: 1 },
  rewardReady: { backgroundColor: GOLD, borderColor: "#FFE082" },
  rewardText: { color: "#FFAB40", fontWeight: "900", fontSize: 14 },
  claimText: { color: "#1a1200", fontWeight: "900", fontSize: 11, letterSpacing: 1.2 },
  claimedChip: { minWidth: 76, alignItems: "center", justifyContent: "center" },
});

export default MissionsScreen;
