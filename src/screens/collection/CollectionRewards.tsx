import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import PressScale from "../../ui/components/PressScale";
import Rise, { riseDelay } from "../../ui/components/Rise";
import CosmeticPreview from "./CosmeticPreview";
import { useT } from "../../i18n/useT";
import { cosmeticText } from "../../i18n/keys";
import type { TranslationKey } from "../../i18n/en";
import type { LocalStats } from "../../core/stats/runStats";
import { COLLECTION_MILESTONES, collectionProgress, collectionRewards, type CosmeticId, type CosmeticKind } from "../../core/cosmetics/cosmetics";

const GOLD = "#E8B04A";
const TIER_COLOR = { rare: "#4FC3F7", epic: "#CE93D8", legendary: "#FFD54F" } as const;

type Props = {
  stats: LocalStats;
  portrait: ImageSourcePropType;
  playerName: string;
  /** Opens the reward in its own category, to see it big and wear it. */
  onOpen: (kind: CosmeticKind, id: CosmeticId) => void;
};

/**
 * The collection as a goal of its own: how much of it is owned, and the rewards that only a share of it gives (a title, a
 * celebration, more), each milestone with what it takes to reach it. Outfits and cosmetics all count; rewards do not.
 */
const CollectionRewards = ({ stats, portrait, playerName, onOpen }: Props) => {
  const { t } = useT();
  const progress = collectionProgress(stats);
  const next = COLLECTION_MILESTONES.find(m => progress.pct < m);
  const need = (m: number) => Math.max(0, Math.ceil((progress.total * m) / 100) - progress.owned);
  const reached = COLLECTION_MILESTONES.filter(m => progress.pct >= m).length;

  return (
    <View style={styles.body}>
      <View style={styles.side}>
        <View style={styles.medal}>
          <SpriteImage source={require("../../assets/sprites/ui/Icon_Trophy.png")} style={styles.medalArt} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Text style={styles.pct} maxFontSizeMultiplier={1.1} accessibilityLabel={t("collection.rewards.a11y", { pct: progress.pct })}>
            {`${progress.pct}%`}
          </Text>
        </View>
        <Text style={styles.sideTitle} maxFontSizeMultiplier={1.15} accessibilityRole="header">
          {t("collection.rewards.title").toLocaleUpperCase()}
        </Text>
        <Text style={styles.sideCount} maxFontSizeMultiplier={1.15}>
          {t("collection.rewards.count", { owned: progress.owned, total: progress.total })}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(100, progress.pct)}%` }]} />
          {COLLECTION_MILESTONES.slice(0, -1).map(m => (
            <View key={m} style={[styles.notch, { left: `${m}%` }, progress.pct >= m && styles.notchOn]} />
          ))}
        </View>
        <Text style={styles.next} maxFontSizeMultiplier={1.15}>
          {next ? t("collection.rewards.next", { n: need(next), pct: next }) : t("collection.rewards.done")}
        </Text>
        <View style={styles.reachedRow}>
          {COLLECTION_MILESTONES.map(m => (
            <Ionicons key={m} name={progress.pct >= m ? "star" : "star-outline"} size={18} color={progress.pct >= m ? "#FFD54F" : "rgba(255,255,255,0.3)"} />
          ))}
          <Text style={styles.reachedText} maxFontSizeMultiplier={1.1}>{`${reached}/${COLLECTION_MILESTONES.length}`}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {COLLECTION_MILESTONES.map((m, i) => {
          const done = progress.pct >= m;
          const isNext = m === next;
          return (
            <Rise key={m} delay={riseDelay(i)}>
              <View style={[styles.stone, done && styles.stoneDone, isNext && styles.stoneNext]}>
                <View style={[styles.badge, done && styles.badgeDone, isNext && styles.badgeNext]}>
                  <Text style={[styles.badgeText, done && { color: "#1a0f00" }]} maxFontSizeMultiplier={1.1}>{`${m}%`}</Text>
                </View>
                <View style={styles.rewards}>
                  {collectionRewards(m).map(r => (
                    <PressScale
                      key={r.id}
                      onPress={() => onOpen(r.kind, r.id)}
                      accessibilityRole="button"
                      accessibilityLabel={cosmeticText(t, r.id)}
                      style={[styles.reward, { borderColor: TIER_COLOR[r.tier] + (done ? "" : "66") }]}
                    >
                      <View style={!done && { opacity: 0.55 }}>
                        <CosmeticPreview id={r.id} size={58} portrait={portrait} playerName={playerName} small />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.rewardName} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                          {cosmeticText(t, r.id)}
                        </Text>
                        <Text style={[styles.rewardKind, { color: TIER_COLOR[r.tier] }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                          {t(`cosmetic.kind.${r.kind}` as TranslationKey).toLocaleUpperCase()}
                        </Text>
                      </View>
                    </PressScale>
                  ))}
                </View>
                <View style={[styles.state, done ? styles.stateDone : isNext ? styles.stateNext : null]}>
                  {done ? <Ionicons name="checkmark" size={13} color="#1a0f00" /> : <Ionicons name="lock-closed" size={12} color={isNext ? "#FFD54F" : "#B99A7C"} />}
                  <Text style={[styles.stateText, done && { color: "#1a0f00" }, isNext && { color: "#FFD54F" }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                    {done ? t("cosmetic.earned").toLocaleUpperCase() : t("collection.rewards.left", { n: need(m) })}
                  </Text>
                </View>
              </View>
            </Rise>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default CollectionRewards;

const styles = StyleSheet.create({
  body: { flex: 1, flexDirection: "row", gap: 12, padding: 10, paddingTop: 0 },
  side: { width: "36%", maxWidth: 360, alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(232,176,74,0.45)", backgroundColor: "rgba(40,28,16,0.9)" },
  medal: { width: 104, height: 104, alignItems: "center", justifyContent: "center" },
  medalArt: { position: "absolute", width: 104, height: 104, opacity: 0.9 },
  pct: { color: "#fff", fontWeight: "900", fontSize: 26, textShadowColor: "#000", textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 }, marginTop: -16 },
  sideTitle: { color: GOLD, fontWeight: "900", fontSize: 15, letterSpacing: 2, textAlign: "center" },
  sideCount: { color: "#E4D8CD", fontWeight: "800", fontSize: 12.5 },
  track: { alignSelf: "stretch", height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden", marginTop: 2 },
  fill: { height: "100%", borderRadius: 5, backgroundColor: GOLD },
  notch: { position: "absolute", top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: "rgba(0,0,0,0.45)" },
  notchOn: { backgroundColor: "rgba(26,15,0,0.6)" },
  next: { color: "#CAB39C", fontSize: 12, fontWeight: "700", textAlign: "center" },
  reachedRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  reachedText: { color: "#E4D8CD", fontWeight: "900", fontSize: 12, marginLeft: 4 },
  list: { gap: 10, paddingBottom: 14 },
  stone: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(30,22,16,0.88)" },
  stoneDone: { borderColor: "rgba(158,227,125,0.55)", backgroundColor: "rgba(40,48,24,0.85)" },
  stoneNext: { borderColor: "rgba(255,213,79,0.7)", backgroundColor: "rgba(60,44,20,0.92)" },
  badge: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(0,0,0,0.3)" },
  badgeDone: { backgroundColor: "#9EE37D", borderColor: "#D7F5C4" },
  badgeNext: { borderColor: "#FFD54F" },
  badgeText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  rewards: { flex: 1, gap: 6 },
  reward: { flexDirection: "row", alignItems: "center", gap: 10, padding: 4, paddingRight: 10, borderRadius: 14, borderWidth: 1.5, backgroundColor: "rgba(0,0,0,0.22)" },
  rewardName: { color: "#fff", fontWeight: "900", fontSize: 14 },
  rewardKind: { fontWeight: "900", fontSize: 11, letterSpacing: 1.1 },
  state: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.35)", maxWidth: 140 },
  stateDone: { backgroundColor: "#9EE37D" },
  stateNext: { backgroundColor: "rgba(255,213,79,0.14)", borderWidth: 1, borderColor: "rgba(255,213,79,0.6)" },
  stateText: { color: "#B99A7C", fontWeight: "900", fontSize: 11, letterSpacing: 0.5 },
});
