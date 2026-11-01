import React from "react";
import { StyleSheet, View } from "react-native";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import EmberIcon from "../../ui/components/EmberIcon";
import PressScale from "../../ui/components/PressScale";
import { useT } from "../../i18n/useT";
import type { TranslationKey } from "../../i18n/en";
import { SEASON_REWARDS, SEASON_TIERS, seasonClaimable, tiersReached, type SeasonState } from "../../core/stats/season";

const GOLD = "#FFD54F";
const TROPHY = require("../../assets/sprites/ui/Icon_Trophy.png");
const CROWN = require("../../assets/sprites/ui/Icon_Medal.png");

type Props = {
  season: SeasonState;
  /** The local day (`YYYY-MM-DD`): names the month. */
  day: string;
  onClaim: () => void;
};

/**
 * This month's season: the points of the runs played this month, the track of ten tiers (each pays embers, the last one
 * the season title too) and one button that claims every tier reached.
 */
const SeasonPane = ({ season, day, onClaim }: Props) => {
  const { t } = useT();
  const month = t(`season.month.${Number(day.slice(5, 7))}` as TranslationKey);
  const reached = tiersReached(season.points);
  const claimable = seasonClaimable(season);
  const done = season.claimed >= SEASON_TIERS.length;
  const from = reached > 0 ? SEASON_TIERS[reached - 1] : 0;
  const to = SEASON_TIERS[Math.min(reached, SEASON_TIERS.length - 1)];
  const progress = reached >= SEASON_TIERS.length ? 1 : Math.min(1, (season.points - from) / (to - from));

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <SpriteImage source={TROPHY} style={styles.headArt} resizeMode="contain" accessibilityIgnoresInvertColors />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.kicker} numberOfLines={1} maxFontSizeMultiplier={1.1}>
            {t("season.title", { month }).toLocaleUpperCase()}
          </Text>
          <Text style={styles.points} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.15}>
            {t("season.points", { n: season.points })}
          </Text>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={styles.next} numberOfLines={1} maxFontSizeMultiplier={1.1}>
            {done ? t("season.done") : reached >= SEASON_TIERS.length ? t("season.final") : t("season.toNext", { n: to - season.points, tier: reached + 1 })}
          </Text>
        </View>
        {claimable > 0 ? (
          <PressScale onPress={onClaim} style={styles.claim} accessibilityRole="button" accessibilityLabel={`${t("season.claim")}: +${claimable}`}>
            <Text style={styles.claimValue} maxFontSizeMultiplier={1.1}>
              <EmberIcon size={14} /> +{claimable}
            </Text>
            <Text style={styles.claimText} maxFontSizeMultiplier={1.1}>
              {t("season.claim").toLocaleUpperCase()}
            </Text>
          </PressScale>
        ) : null}
      </View>

      <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: SEASON_TIERS.length, now: reached }}>
        {SEASON_TIERS.map((need, i) => {
          const paid = i < season.claimed;
          const ready = !paid && i < reached;
          const last = i === SEASON_TIERS.length - 1;
          return (
            <View key={need} style={styles.node} accessible accessibilityLabel={`${t("season.tier", { n: i + 1 })}: ${need} · +${SEASON_REWARDS[i]}`}>
              {i > 0 ? <View style={[styles.link, i < reached && styles.linkOn]} /> : null}
              <View style={[styles.dot, last && styles.dotLast, paid && styles.dotPaid, ready && styles.dotReady]}>
                {last ? (
                  <SpriteImage source={CROWN} style={styles.dotArt} resizeMode="contain" accessibilityIgnoresInvertColors />
                ) : (
                  <Text style={[styles.dotText, (paid || ready) && { color: "#1a1200" }]} allowFontScaling={false}>
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text style={[styles.reward, (paid || ready) && { color: GOLD }]} numberOfLines={1} allowFontScaling={false}>
                +{SEASON_REWARDS[i]}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.how} maxFontSizeMultiplier={1.15}>
        {t("season.how")} {t("season.howFinal")}
      </Text>
    </View>
  );
};

export default SeasonPane;

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  head: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,213,79,0.4)", backgroundColor: "rgba(34,26,18,0.92)" },
  headArt: { width: 52, height: 52 },
  kicker: { color: GOLD, fontWeight: "900", fontSize: 12, letterSpacing: 1.5 },
  points: { color: "#FFF4DE", fontWeight: "900", fontSize: 18 },
  bar: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4, backgroundColor: GOLD },
  next: { color: "#C2A88F", fontSize: 12, fontWeight: "700" },
  claim: { alignItems: "center", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14, backgroundColor: GOLD },
  claimValue: { color: "#1a1200", fontWeight: "900", fontSize: 15 },
  claimText: { color: "#1a1200", fontWeight: "900", fontSize: 11, letterSpacing: 0.8 },
  track: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", backgroundColor: "rgba(34,26,18,0.9)" },
  node: { flex: 1, alignItems: "center", gap: 4 },
  link: { position: "absolute", top: 15, right: "50%", width: "100%", height: 3, backgroundColor: "rgba(255,255,255,0.12)" },
  linkOn: { backgroundColor: GOLD },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.25)", backgroundColor: "#2A2019" },
  dotLast: { width: 36, height: 36, borderRadius: 18, marginTop: -2, borderColor: "rgba(255,213,79,0.6)" },
  dotPaid: { backgroundColor: "#B8962E", borderColor: GOLD },
  dotReady: { backgroundColor: GOLD, borderColor: "#FFF2B0" },
  dotText: { color: "#E9D8C4", fontWeight: "900", fontSize: 13 },
  dotArt: { width: 26, height: 26 },
  reward: { color: "#9C8670", fontWeight: "800", fontSize: 11 },
  how: { color: "#B99A7C", fontSize: 12, fontWeight: "600", textAlign: "center", paddingHorizontal: 8 },
});
