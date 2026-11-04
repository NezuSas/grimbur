import React, { useState } from "react";
import { StyleSheet, View, type ImageSourcePropType, type LayoutChangeEvent } from "react-native";
import GameIcon from "../../ui/components/GameIcon";
import Text from "../../ui/components/Text";
import { useWindowDimensions } from "../../ui/layout/scaledWindow";
import SpriteImage from "../../ui/components/SpriteImage";
import PressScale from "../../ui/components/PressScale";
import Rise, { riseDelay } from "../../ui/components/Rise";
import CosmeticPreview from "./CosmeticPreview";
import { useT } from "../../i18n/useT";
import { cosmeticText } from "../../i18n/keys";
import type { TranslationKey } from "../../i18n/en";
import type { LocalStats } from "../../core/stats/runStats";
import { COLLECTION_MILESTONES, collectionProgress, collectionRewards, type CosmeticId, type CosmeticKind } from "../../core/cosmetics/cosmetics";

const GOLD = "#C9A55A";
const TIER_COLOR = { rare: "#7FAFC6", epic: "#B08DBE", legendary: "#C9A55A" } as const;

type Props = {
  stats: LocalStats;
  portrait: ImageSourcePropType;
  playerName: string;
  /** Opens the reward in its own category, to see it big and wear it. */
  onOpen: (kind: CosmeticKind, id: CosmeticId) => void;
};

/**
 * The collection as a goal of its own: how much of it is owned, and the rewards that only a share of it gives (a title, a
 * celebration, more). The four milestones stand side by side as a road of trophies: a medallion on one track that fills
 * as the collection grows, and under each one its rewards, big enough to see, with what is left to reach them. Outfits and
 * cosmetics all count; rewards do not.
 */
const CollectionRewards = ({ stats, portrait, playerName, onOpen }: Props) => {
  const { t } = useT();
  const progress = collectionProgress(stats);
  const next = COLLECTION_MILESTONES.find(m => progress.pct < m);
  const need = (m: number) => Math.max(0, Math.ceil((progress.total * m) / 100) - progress.owned);
  const reached = COLLECTION_MILESTONES.filter(m => progress.pct >= m).length;
  const [road, setRoad] = useState({ w: 0, h: 0 });
  // A short screen (a phone held sideways) gets a smaller trophy, so the side panel never spills.
  const { height } = useWindowDimensions();
  const compact = height < 340;
  const trophy = compact ? 58 : 92;
  const onRoad = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - road.w) > 1 || Math.abs(height - road.h) > 1) setRoad({ w: width, h: height });
  };

  const cols = COLLECTION_MILESTONES.length;
  const colW = road.w ? (road.w - GAP * (cols - 1)) / cols : 0;
  const medal = Math.max(38, Math.min(58, colW * 0.42, road.h * 0.17));
  // The track runs from the first medallion's centre to the last one's; each milestone is a quarter of the way.
  const trackLeft = colW / 2;
  const trackWidth = Math.max(0, road.w - colW);
  const fill = roadFill(progress.pct);

  return (
    <View style={styles.body}>
      <View style={styles.side}>
        <View style={[styles.medal, { width: trophy, height: trophy }]}>
          <View style={[styles.medalHalo, { width: trophy, height: trophy, borderRadius: trophy / 2 }]} />
          <SpriteImage source={require("../../assets/sprites/ui/Icon_Trophy.webp")} style={{ width: trophy * 0.9, height: trophy * 0.9 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
        <Text style={[styles.pct, compact && { fontSize: 22 }]} maxFontSizeMultiplier={1.1} accessibilityLabel={t("collection.rewards.a11y", { pct: progress.pct })}>
          {`${progress.pct}%`}
        </Text>
        <Text style={styles.sideTitle} maxFontSizeMultiplier={1.15} accessibilityRole="header">
          {t("collection.rewards.title").toLocaleUpperCase()}
        </Text>
        {!compact ? <View style={styles.rule} /> : null}
        <Text style={styles.sideCount} maxFontSizeMultiplier={1.15}>
          {t("collection.rewards.count", { owned: progress.owned, total: progress.total })}
        </Text>
        <Text style={styles.next} maxFontSizeMultiplier={1.15}>
          {next ? t("collection.rewards.next", { n: need(next), pct: next }) : t("collection.rewards.done")}
        </Text>
        <View style={styles.reachedRow}>
          {COLLECTION_MILESTONES.map(m => (
            <GameIcon key={m} name={progress.pct >= m ? "star" : "star-outline"} size={16} color={progress.pct >= m ? GOLD : "rgba(255,255,255,0.28)"} />
          ))}
          <Text style={styles.reachedText} maxFontSizeMultiplier={1.1}>{`${reached}/${cols}`}</Text>
        </View>
      </View>

      <View style={styles.road} onLayout={onRoad}>
        {road.w > 0 ? (
          <>
            <View style={styles.columns}>
              {COLLECTION_MILESTONES.map((m, i) => {
                const done = progress.pct >= m;
                const isNext = m === next;
                const rewards = collectionRewards(m);
                // What is left of the column under the medallion and above the state; two rewards stand side by side.
                const room = road.h - medal - 6 - 8 - 30 - 18;
                // Two rewards stack when the column is tall enough for both (a tablet), else they stand side by side.
                const tall = Math.min(colW * 0.62, 120);
                const stack = rewards.length > 1 && room >= 2 * (tall + 44);
                const pair = rewards.length > 1 && !stack;
                const preview = pair
                  ? Math.max(26, Math.min((colW - 22) / 2 - 10, room - 40, 72))
                  : stack
                    ? Math.max(30, Math.min(tall, room / 2 - 44))
                    : Math.max(30, Math.min(colW * 0.7, room - 40, 130));
                return (
                  <Rise key={m} delay={riseDelay(i)} style={{ width: colW }}>
                    <View style={[styles.column, done && styles.columnDone, isNext && styles.columnNext]}>
                      {/* The medallion is drawn over the track, above the cards (see below). */}
                      <View style={{ height: medal }} />
                      {done ? <Text style={styles.nodeCaption} maxFontSizeMultiplier={1}>{`${m}%`}</Text> : null}
                      <View style={[styles.rewards, pair && styles.rewardsPair]}>
                        {rewards.map(r => (
                          <PressScale
                            key={r.id}
                            onPress={() => onOpen(r.kind, r.id)}
                            accessibilityRole="button"
                            accessibilityLabel={cosmeticText(t, r.id)}
                            style={[styles.reward, pair && { flex: 1, alignSelf: "auto" }]}
                          >
                            <View style={[styles.frame, { width: preview + 10, height: preview + 10, borderColor: TIER_COLOR[r.tier] + (done ? "" : "77") }]}>
                              <View style={!done && { opacity: 0.5 }}>
                                <CosmeticPreview id={r.id} size={preview} portrait={portrait} playerName={playerName} small />
                              </View>
                              {!done ? (
                                <View style={styles.lock}>
                                  <GameIcon name="lock-closed" size={11} color="#E4D8CD" />
                                </View>
                              ) : null}
                            </View>
                            <Text style={[styles.rewardName, pair && styles.rewardNamePair]} numberOfLines={pair ? 2 : 1} maxFontSizeMultiplier={1.1}>
                              {cosmeticText(t, r.id)}
                            </Text>
                            <Text style={[styles.rewardKind, pair && styles.rewardKindPair, { color: TIER_COLOR[r.tier] }]} numberOfLines={2} maxFontSizeMultiplier={1.05}>
                              {t(`cosmetic.kind.${r.kind}` as TranslationKey).toLocaleUpperCase()}
                            </Text>
                          </PressScale>
                        ))}
                      </View>
                      <View style={[styles.state, done ? styles.stateDone : isNext ? styles.stateNext : null]}>
                        {done ? <GameIcon name="checkmark" size={12} color="#1a0f00" /> : <GameIcon name="lock-closed" size={11} color={isNext ? GOLD : "#B99A7C"} />}
                        <Text style={[styles.stateText, done && { color: "#1a0f00" }, isNext && { color: GOLD }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                          {done ? t("cosmetic.earned").toLocaleUpperCase() : t("collection.rewards.left", { n: need(m) })}
                        </Text>
                      </View>
                    </View>
                  </Rise>
                );
              })}
            </View>
            {/* The track through every medallion, filled as far as the collection has come. */}
            <View style={[styles.track, { left: trackLeft, width: trackWidth, top: 6 + medal / 2 - 3 }]}>
              <View style={[styles.trackFill, { width: `${fill * 100}%` }]} />
            </View>
            <View pointerEvents="none" style={[styles.nodes, { top: 6 }]}>
              {COLLECTION_MILESTONES.map(m => {
                const done = progress.pct >= m;
                const isNext = m === next;
                const accent = done ? "#A3BF7C" : isNext ? GOLD : "#8D7B69";
                return (
                  <View key={m} style={{ width: colW, alignItems: "center" }}>
                    <View
                      style={[
                        styles.node,
                        { width: medal, height: medal, borderRadius: medal / 2, borderColor: accent },
                        done && { backgroundColor: "#A3BF7C" },
                        isNext && styles.nodeNext,
                      ]}
                    >
                      {done ? (
                        <GameIcon name="checkmark" size={medal * 0.5} color="#1a0f00" />
                      ) : (
                        <Text style={[styles.nodeText, { fontSize: medal * 0.3, color: isNext ? GOLD : "#CDBBA5" }]} maxFontSizeMultiplier={1}>{`${m}%`}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
};

/** How far along the road the track is filled (0..1): each milestone is a quarter, the first one at the start. */
function roadFill(pct: number): number {
  const ms = COLLECTION_MILESTONES as readonly number[];
  if (pct <= ms[0]) return 0;
  for (let i = 1; i < ms.length; i++) {
    if (pct < ms[i]) return (i - 1 + (pct - ms[i - 1]) / (ms[i] - ms[i - 1])) / (ms.length - 1);
  }
  return 1;
}

export default CollectionRewards;

const GAP = 8;

const styles = StyleSheet.create({
  body: { flex: 1, flexDirection: "row", gap: 12, padding: 10, paddingTop: 0 },
  side: { width: "30%", maxWidth: 320, alignItems: "center", justifyContent: "center", gap: 4, padding: 12, borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(207, 160, 82,0.45)", backgroundColor: "rgba(40,28,16,0.9)" },
  medal: { alignItems: "center", justifyContent: "center" },
  medalHalo: { position: "absolute", backgroundColor: "rgba(201, 165, 90,0.16)" },
  pct: { color: "#F3EADB", fontWeight: "900", fontSize: 30, textShadowColor: "#000", textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } },
  sideTitle: { color: GOLD, fontWeight: "900", fontSize: 13, letterSpacing: 2.5, textAlign: "center" },
  rule: { width: 40, height: 2, borderRadius: 1, backgroundColor: "rgba(201, 165, 90,0.6)", marginVertical: 2 },
  sideCount: { color: "#E4D8CD", fontWeight: "800", fontSize: 12.5 },
  next: { color: "#CAB39C", fontSize: 11.5, fontWeight: "700", textAlign: "center" },
  reachedRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  reachedText: { color: "#E4D8CD", fontWeight: "900", fontSize: 12, marginLeft: 4 },
  road: { flex: 1 },
  track: { position: "absolute", height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.55)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  nodes: { position: "absolute", left: 0, right: 0, flexDirection: "row", gap: GAP },
  trackFill: { height: "100%", borderRadius: 3, backgroundColor: GOLD },
  columns: { flex: 1, flexDirection: "row", gap: GAP },
  column: { flex: 1, alignItems: "center", paddingTop: 6, paddingBottom: 8, paddingHorizontal: 6, borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(30,22,16,0.82)", gap: 6 },
  columnDone: { borderColor: "rgba(163, 191, 124,0.5)", backgroundColor: "rgba(36,42,22,0.85)" },
  columnNext: { borderColor: "rgba(201, 165, 90,0.75)", backgroundColor: "rgba(56,40,18,0.92)" },
  node: { alignItems: "center", justifyContent: "center", borderWidth: 2.5, backgroundColor: "#1E160F" },
  nodeNext: { shadowColor: GOLD, shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  nodeText: { fontWeight: "900" },
  nodeCaption: { color: "#A3BF7C", fontWeight: "900", fontSize: 11, marginTop: -4 },
  rewards: { flex: 1, alignSelf: "stretch", justifyContent: "space-evenly", alignItems: "center" },
  rewardsPair: { flexDirection: "row", alignItems: "center", gap: 4 },
  reward: { alignItems: "center", alignSelf: "stretch", gap: 1 },
  frame: { alignItems: "center", justifyContent: "center", borderRadius: 16, borderWidth: 1.5, backgroundColor: "rgba(0,0,0,0.3)", marginBottom: 3 },
  lock: { position: "absolute", right: -5, top: -5, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#2A2016", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  rewardName: { color: "#F3EADB", fontWeight: "900", fontSize: 12.5, textAlign: "center", alignSelf: "stretch" },
  rewardNamePair: { fontSize: 10.5, lineHeight: 12 },
  rewardKindPair: { fontSize: 8.5, lineHeight: 10, letterSpacing: 0.6 },
  rewardKind: { fontWeight: "900", fontSize: 9.5, letterSpacing: 1, textAlign: "center", alignSelf: "stretch" },
  state: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, alignSelf: "stretch", paddingHorizontal: 6, paddingVertical: 5, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.35)" },
  stateDone: { backgroundColor: "#A3BF7C" },
  stateNext: { backgroundColor: "rgba(201, 165, 90,0.14)", borderWidth: 1, borderColor: "rgba(201, 165, 90,0.6)" },
  stateText: { color: "#B99A7C", fontWeight: "900", fontSize: 11, letterSpacing: 0.5 },
});
