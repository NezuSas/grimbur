import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import PressScale from "../../ui/components/PressScale";
import EmberIcon from "../../ui/components/EmberIcon";
import { useT } from "../../i18n/useT";
import type { TranslationKey } from "../../i18n/en";
import { PUZZLE_TIERS } from "../../core/puzzles/puzzles";
import { DAILY_PUZZLE_EMBERS, MAX_STARS } from "../../core/stats/puzzleProgress";
import { TIER_TINTS } from "./ChapterMap";

const TINT = "#6CB0B9";
const STAR = require("../../assets/sprites/ui/Icon_Star.webp");
const RIDDLE = require("../../assets/sprites/ui/Icon_Riddle.webp");
const CALENDAR = require("../../assets/sprites/ui/Icon_Calendar.webp");
const FLAME = require("../../assets/sprites/ui/Icon_Flame.webp");

type Props = {
  /** The puzzle of the day's number (#1 on the first day) and its level. */
  number: number;
  tier: number;
  /** Stars won today (0: not solved yet). */
  stars: number;
  /** Days in a row that still stand, and the longest ever. */
  streak: number;
  bestStreak: number;
  /** Day of the week of today (0 Sunday). */
  weekday: number;
  countdown: string;
  onPress: () => void;
};

/**
 * The day's puzzle, the screen's headline: its number and level, the week of the streak as seven days (lit when solved, today
 * ringed while it waits), what it pays or how it went, and one button.
 */
export default function DailyCard({ number, tier, stars, streak, bestStreak, weekday, countdown, onPress }: Props) {
  const { t } = useT();
  const solved = stars > 0;
  const tint = TIER_TINTS[tier];
  const letters = t("puzzle.weekdays");
  // The last seven days, today last: a run solved up to today (or up to yesterday, today still open) lights its days.
  const run = Math.min(streak, solved ? 7 : 6);
  const days = Array.from({ length: 7 }, (_, k) => {
    const back = 6 - k;
    const lit = solved ? back < run : back >= 1 && back <= run;
    return { k, lit, today: back === 0, letter: letters[(weekday - back + 7 * 2) % 7] ?? "" };
  });
  const size = PUZZLE_TIERS[tier];

  return (
    <PressScale
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${t("puzzle.daily")} #${number}. ${t(`puzzle.tier.${tier}` as TranslationKey)}. ${solved ? t("puzzle.stars", { n: stars }) : t("puzzle.dailyReward", { n: DAILY_PUZZLE_EMBERS })}`}
    >
      <LinearGradient colors={["rgba(30,70,78,0.95)", "rgba(12,24,30,0.96)"]} style={StyleSheet.absoluteFill} />
      <View style={styles.head}>
        <SpriteImage source={CALENDAR} style={{ width: 18, height: 18 }} resizeMode="contain" />
        <Text style={styles.kicker} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.1}>
          {t("puzzle.daily").toLocaleUpperCase()}
        </Text>
        <View style={styles.number}>
          <Text style={styles.numberText} maxFontSizeMultiplier={1.1}>{`#${number}`}</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={[styles.artRing, { borderColor: tint, shadowColor: tint }]}>
          <SpriteImage source={RIDDLE} style={{ width: 52, height: 52 }} resizeMode="contain" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.tier, { color: tint }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>
            {t(`puzzle.tier.${tier}` as TranslationKey)}
          </Text>
          <Text style={styles.size} maxFontSizeMultiplier={1.1}>{`${size.rows}×${size.cols}`}</Text>
          {solved ? (
            <View style={styles.starRow}>
              {Array.from({ length: MAX_STARS }, (_, k) => (
                <SpriteImage key={k} source={STAR} style={{ width: 18, height: 18, opacity: k < stars ? 1 : 0.2 }} resizeMode="contain" />
              ))}
            </View>
          ) : (
            <View style={styles.reward}>
              <EmberIcon size={13} />
              <Text style={styles.rewardText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.1}>
                {t("puzzle.dailyReward", { n: DAILY_PUZZLE_EMBERS })}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.week} accessible accessibilityLabel={streak > 0 ? t("puzzle.streak", { n: streak }) : t("puzzle.streakStart")}>
        {days.map(d => (
          <View key={d.k} style={styles.day}>
            <Text style={[styles.dayLetter, d.today && { color: "#F3EADB" }]} maxFontSizeMultiplier={1}>
              {d.letter}
            </Text>
            <View style={[styles.dayDot, d.lit && styles.dayLit, d.today && !d.lit && styles.dayToday]}>
              {d.lit ? <SpriteImage source={FLAME} style={{ width: 14, height: 14 }} resizeMode="contain" /> : null}
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.streak} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.1}>
        {streak > 0 ? `${t("puzzle.streak", { n: streak })}  ·  ${t("puzzle.streakBest", { n: Math.max(streak, bestStreak) })}` : t("puzzle.streakStart")}
      </Text>

      {solved ? (
        <Text style={styles.note} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.1}>
          {t("puzzle.dailyDone", { time: countdown })}
        </Text>
      ) : null}
      <View style={styles.button}>
        <Text style={styles.buttonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>
          {(solved ? (stars < MAX_STARS ? t("puzzle.improve") : t("puzzle.replay")) : t("puzzle.solve")).toLocaleUpperCase()}
        </Text>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: "stretch", gap: 8, padding: 12, borderRadius: 20, borderWidth: 2, borderColor: TINT + "AA", overflow: "hidden", backgroundColor: "#0c181e" },
  head: { flexDirection: "row", alignItems: "center", gap: 6 },
  kicker: { flex: 1, color: TINT, fontWeight: "900", letterSpacing: 1.6, fontSize: 11.5 },
  number: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8, backgroundColor: "rgba(77,208,225,0.18)", borderWidth: 1, borderColor: TINT + "77" },
  numberText: { color: "#E0F7FA", fontWeight: "900", fontSize: 12 },
  hero: { flexDirection: "row", alignItems: "center", gap: 10 },
  artRing: { width: 66, height: 66, borderRadius: 33, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)", shadowOpacity: 0.8, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  tier: { fontWeight: "900", fontSize: 21 },
  size: { color: "#9fb9bd", fontWeight: "800", fontSize: 11 },
  starRow: { flexDirection: "row", gap: 2, marginTop: 2 },
  reward: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  rewardText: { flexShrink: 1, color: "#E2BE8C", fontWeight: "800", fontSize: 12 },
  week: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 },
  day: { alignItems: "center", gap: 3 },
  dayLetter: { color: "#7fa3a8", fontWeight: "900", fontSize: 10 },
  dayDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  dayLit: { backgroundColor: "rgba(255,138,101,0.25)", borderColor: "#D28663" },
  dayToday: { borderColor: TINT, borderWidth: 2, borderStyle: "dashed" },
  streak: { color: "#FFCCBC", fontWeight: "800", fontSize: 11.5, textAlign: "center" },
  note: { color: "#cfe9ee", fontSize: 11.5, textAlign: "center" },
  button: { minHeight: 42, borderRadius: 14, backgroundColor: TINT, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, borderBottomWidth: 3, borderBottomColor: "#00838F" },
  buttonText: { color: "#06262B", fontWeight: "900", letterSpacing: 1, fontSize: 15 },
});
