import React, { useCallback, useEffect, useState } from "react";
import { ImageBackground, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Text from "../ui/components/Text";
import ScreenHeader from "../ui/components/ScreenHeader";
import { RootStackParamList } from "../navigation/types";
import { MIN_TOUCH } from "../ui/layout/useGameLayout";
import { useT } from "../i18n/useT";
import type { TranslationKey } from "../i18n/en";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { claimMissionReward, getMissions, peekLocalStats } from "../services/localStats";
import { emitSound } from "../audio/audioEventBus";
import { DAILY_BONUS, MissionDef, MissionProgress, bonusReady, isComplete, missionDef, syncMissions } from "../core/stats/missions";
import { HERO_UNLOCKS, isHeroUnlocked } from "../core/stats/heroUnlocks";
import { RANK_THRESHOLDS, rankOf } from "../core/stats/rank";
import { dailyKey, msUntilNextDay } from "../core/engine/seed";
import { formatCountdown } from "../core/stats/countdown";
import { haptic } from "../shared/haptics";

type Props = NativeStackScreenProps<RootStackParamList, "MissionsScreen">;

const GOLD = "#FFD54F";
const TIER_COLOR = { easy: "#81C784", medium: "#4FC3F7", hard: "#FF8A65" } as const;

/** The days left in the week (the weekly missions change on Monday). */
const daysToMonday = (now: Date): number => 7 - ((now.getDay() + 6) % 7);

const MissionsScreen: React.FC<Props> = ({ navigation }) => {
  const { t, plural } = useT();
  const [stats, setStats] = useState<LocalStats>(() => {
    const known = peekLocalStats() ?? EMPTY_STATS;
    // Until the saved ones are read, show what today's missions would be (nothing flashes empty).
    return { ...known, missions: syncMissions(known.missions, dailyKey(), HERO_UNLOCKS.filter((_, i) => isHeroUnlocked(i, known)).length) };
  });
  const [now, setNow] = useState(() => new Date());
  const [ladder, setLadder] = useState(false);

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

  const text = (def: MissionDef) => (def.metric === "wins" || def.metric === "daily" ? plural(`mission.desc.${def.metric}` as never, def.target, { n: def.target }) : t(`mission.desc.${def.metric}` as TranslationKey, { n: def.target.toLocaleString() }));

  const rank = rankOf(stats.lifetimeEmbers);
  const rankName = t(`rank.${rank.level}` as TranslationKey);
  const nextName = rank.to !== null ? t(`rank.${rank.level + 1}` as TranslationKey) : "";
  const m = stats.missions;
  const allClaimed = m.daily.length > 0 && m.daily.every(p => p.claimed);

  const card = (p: MissionProgress) => {
    const def = missionDef(p.id);
    if (!def) return null;
    const done = isComplete(p);
    const color = TIER_COLOR[def.tier];
    const shown = Math.min(p.progress, def.target);
    return (
      <View key={p.id} style={[styles.mission, p.claimed && styles.missionClaimed]}>
        <View style={[styles.tierBar, { backgroundColor: color }]} />
        <View style={styles.missionBody}>
          <Text style={[styles.missionText, p.claimed && { color: "#8f8aab" }]} maxFontSizeMultiplier={1.3}>
            {text(def)}
          </Text>
          <View style={styles.barRow}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(shown / def.target) * 100}%`, backgroundColor: done ? "#9EE37D" : color }]} />
            </View>
            <Text style={styles.count} maxFontSizeMultiplier={1.2}>
              {shown.toLocaleString()}/{def.target.toLocaleString()}
            </Text>
          </View>
        </View>
        {p.claimed ? (
          <View style={styles.claimedChip} accessible accessibilityLabel={t("missions.claimed")}>
            <Ionicons name="checkmark-circle" size={22} color="#9EE37D" />
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.reward, done && styles.rewardReady]}
            disabled={!done}
            onPress={() => void claim(p.id)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ disabled: !done }}
            accessibilityLabel={`${t("missions.claim")}: +${def.reward}`}
          >
            <Text style={[styles.rewardText, done && { color: "#1a1200" }]} maxFontSizeMultiplier={1.2}>
              🔥 +{def.reward}
            </Text>
            {done ? (
              <Text style={styles.claimText} maxFontSizeMultiplier={1.2}>
                {t("missions.claim").toLocaleUpperCase()}
              </Text>
            ) : null}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(6,4,16,0.9)" }}>
        <ScreenHeader title={t("missions.title")} onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            <TouchableOpacity style={styles.rankCard} activeOpacity={0.85} onPress={() => setLadder(v => !v)} accessibilityRole="button" accessibilityLabel={ladder ? t("missions.rankLadderHide") : t("missions.rankLadder")}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankNumber} maxFontSizeMultiplier={1.2}>
                  {rank.level}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.rankLabel} maxFontSizeMultiplier={1.2}>
                  {t("missions.rank").toLocaleUpperCase()}
                </Text>
                <Text style={styles.rankName} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                  {rankName}
                </Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${rank.progress * 100}%`, backgroundColor: GOLD }]} />
                </View>
                <Text style={styles.rankNext} maxFontSizeMultiplier={1.2}>
                  {rank.to === null ? t("missions.rankTop") : t("missions.rankNext", { n: rank.remaining.toLocaleString(), name: nextName })}
                </Text>
                <Text style={styles.rankEarned} maxFontSizeMultiplier={1.2}>
                  {rank.to === null ? t("missions.rankEarned", { earned: rank.earned.toLocaleString() }) : t("missions.rankEarnedOf", { earned: rank.earned.toLocaleString(), to: rank.to.toLocaleString() })}
                </Text>
              </View>
              <Ionicons name={ladder ? "chevron-up" : "chevron-down"} size={22} color="#8f8aab" />
            </TouchableOpacity>
            {ladder ? (
              <View style={styles.ladder}>
                <Text style={styles.ladderInfo} maxFontSizeMultiplier={1.3}>
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
                      <Text style={[styles.ladderName, !reached && { color: "#8f8aab" }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                        {t(`rank.${level}` as TranslationKey)}
                      </Text>
                      <Text style={styles.ladderFrom} maxFontSizeMultiplier={1.2}>
                        {t("missions.rankFrom", { n: from.toLocaleString() })}
                      </Text>
                      {reached ? <Ionicons name={current ? "location" : "checkmark"} size={16} color={current ? GOLD : "#9EE37D"} /> : <View style={{ width: 16 }} />}
                    </View>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.sectionHead}>
              <Text style={styles.section} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
                {t("missions.today").toLocaleUpperCase()}
              </Text>
              <Text style={styles.refresh} maxFontSizeMultiplier={1.2}>
                {t("missions.refreshDay", { time: formatCountdown(msUntilNextDay(now)) })}
              </Text>
            </View>
            {m.daily.length === 0 ? <Text style={styles.empty}>{t("missions.empty")}</Text> : m.daily.map(card)}
            <View style={[styles.mission, styles.bonus, m.bonusClaimed && styles.missionClaimed]}>
              <View style={[styles.tierBar, { backgroundColor: GOLD }]} />
              <View style={styles.missionBody}>
                <Text style={[styles.missionText, m.bonusClaimed && { color: "#8f8aab" }]} maxFontSizeMultiplier={1.3}>
                  {t("missions.bonus")}
                </Text>
                {!allClaimed ? (
                  <Text style={styles.bonusHint} maxFontSizeMultiplier={1.2}>
                    {t("missions.bonusHint")}
                  </Text>
                ) : null}
              </View>
              {m.bonusClaimed ? (
                <View style={styles.claimedChip}>
                  <Ionicons name="checkmark-circle" size={22} color="#9EE37D" />
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.reward, bonusReady(m) && styles.rewardReady]}
                  disabled={!bonusReady(m)}
                  onPress={() => void claim("bonus")}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !bonusReady(m) }}
                  accessibilityLabel={`${t("missions.claim")}: +${DAILY_BONUS}`}
                >
                  <Text style={[styles.rewardText, bonusReady(m) && { color: "#1a1200" }]} maxFontSizeMultiplier={1.2}>
                    🔥 +{DAILY_BONUS}
                  </Text>
                  {bonusReady(m) ? (
                    <Text style={styles.claimText} maxFontSizeMultiplier={1.2}>
                      {t("missions.claim").toLocaleUpperCase()}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.sectionHead}>
              <Text style={styles.section} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
                {t("missions.week").toLocaleUpperCase()}
              </Text>
              <Text style={styles.refresh} maxFontSizeMultiplier={1.2}>
                {t("missions.refreshWeek", { days: daysToMonday(now) })}
              </Text>
            </View>
            {m.weekly.length === 0 ? <Text style={styles.empty}>{t("missions.empty")}</Text> : m.weekly.map(card)}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

const CARD = "rgba(18,14,38,0.9)";
const BORDER = "rgba(255,255,255,0.09)";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  content: { paddingHorizontal: 14, paddingVertical: 14, alignItems: "center" },
  inner: { width: "100%", maxWidth: 640, gap: 10 },
  rankCard: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,213,79,0.35)", padding: 16 },
  rankBadge: { width: 68, height: 68, borderRadius: 34, backgroundColor: "rgba(255,213,79,0.16)", borderWidth: 3, borderColor: GOLD, alignItems: "center", justifyContent: "center" },
  rankNumber: { color: GOLD, fontWeight: "900", fontSize: 30 },
  rankLabel: { color: "#8f8aab", fontWeight: "900", fontSize: 11, letterSpacing: 2 },
  rankName: { color: "#fff", fontWeight: "900", fontSize: 22, letterSpacing: 1 },
  rankNext: { color: "#b9b4d4", fontSize: 12.5, fontWeight: "700" },
  rankEarned: { color: "#8f8aab", fontSize: 11.5, fontWeight: "700" },
  ladder: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 12, gap: 6 },
  ladderInfo: { color: "#c3bedb", fontSize: 13, lineHeight: 19, marginBottom: 4 },
  ladderRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 12 },
  ladderCurrent: { backgroundColor: "rgba(255,213,79,0.12)", borderWidth: 1, borderColor: "rgba(255,213,79,0.45)" },
  ladderBadge: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  ladderBadgeOn: { borderColor: GOLD, backgroundColor: "rgba(255,213,79,0.14)" },
  ladderNumber: { color: "#8f8aab", fontWeight: "900", fontSize: 14 },
  ladderName: { flex: 1, color: "#fff", fontWeight: "900", fontSize: 15 },
  ladderFrom: { color: "#8f8aab", fontSize: 12, fontWeight: "700" },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 10, paddingHorizontal: 4 },
  section: { color: GOLD, fontWeight: "900", fontSize: 13, letterSpacing: 2.2 },
  refresh: { color: "#8f8aab", fontWeight: "700", fontSize: 12 },
  empty: { color: "#8f8aab", fontStyle: "italic", paddingHorizontal: 4 },
  mission: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: "hidden", paddingRight: 12 },
  missionClaimed: { opacity: 0.6 },
  bonus: { borderColor: "rgba(255,213,79,0.4)" },
  tierBar: { width: 5, alignSelf: "stretch" },
  missionBody: { flex: 1, paddingVertical: 12, gap: 8 },
  missionText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  bonusHint: { color: "#a9a3c6", fontSize: 12.5 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  count: { color: "#cfc9e8", fontWeight: "800", fontSize: 12, minWidth: 54, textAlign: "right" },
  reward: { minWidth: 76, minHeight: MIN_TOUCH, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,171,64,0.5)", backgroundColor: "rgba(255,171,64,0.1)", alignItems: "center", justifyContent: "center", gap: 1 },
  rewardReady: { backgroundColor: GOLD, borderColor: "#FFE082" },
  rewardText: { color: "#FFAB40", fontWeight: "900", fontSize: 14 },
  claimText: { color: "#1a1200", fontWeight: "900", fontSize: 10, letterSpacing: 1.2 },
  claimedChip: { minWidth: 76, alignItems: "center", justifyContent: "center" },
});

export default MissionsScreen;
