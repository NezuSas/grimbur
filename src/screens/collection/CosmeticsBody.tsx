import React, { useEffect, useRef, useState } from "react";
import { YULE_FLOORS, YULE_PUZZLES } from "../../core/events/yule";
import GlyphIcon from "../../ui/components/GlyphIcon";
import { Animated, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import EmberIcon from "../../ui/components/EmberIcon";
import PressScale from "../../ui/components/PressScale";
import Rise, { riseDelay } from "../../ui/components/Rise";
import CosmeticPreview from "./CosmeticPreview";
import { MIN_TOUCH } from "../../ui/layout/useGameLayout";
import { useT } from "../../i18n/useT";
import { achievementText, cosmeticText, heroText, skinText } from "../../i18n/keys";
import type { TranslationKey } from "../../i18n/en";
import type { LocalStats } from "../../core/stats/runStats";
import { petProgress, petStage } from "../../core/cosmetics/petGrowth";
import { PET_ADULT_ART } from "../../ui/cosmeticArt";
import { cosmeticInfo, cosmeticsOf, equippedCosmetic, ownsCosmetic, type CosmeticId, type CosmeticInfo, type CosmeticKind } from "../../core/cosmetics/cosmetics";
import { dailyDeals, type Deal } from "../../core/cosmetics/dailyShop";
import { dailyKey, msUntilNextDay } from "../../core/engine/seed";
import { formatCountdown } from "../../core/stats/countdown";
import { skinStatus } from "../../core/skins/ownership";
import { skinArt } from "../../data/skinArt";
import { buyCosmeticFor, buyDealFor, equipCosmeticFor, equipSkinFor } from "../../services/localStats";
import { analytics } from "../../services/analytics";
import { haptic, NotificationFeedbackType } from "../../shared/haptics";
import { emitSound } from "../../audio/audioEventBus";
import { useSettingsStore } from "../../state/settings/store";

export type CosmeticCategory = "deals" | CosmeticKind;

const TIER_COLOR = { rare: "#7FAFC6", epic: "#B08DBE", legendary: "#C9A55A" } as const;
const GOLD = "#CFA052";

type Props = {
  category: CosmeticCategory;
  stats: LocalStats;
  onStats: (next: LocalStats) => void;
  /** The hero whose portrait frames and titles are previewed on. */
  hero: number;
  playerName: string;
  cardSize: number;
  onGridWidth: (w: number) => void;
  /** The entry shown first (a reward opened from the Rewards tab). */
  initialPick?: string | null;
};

/** One entry of the grid: a catalog item, or one of today's deals. */
type Entry = { key: string; id?: CosmeticId; deal?: Deal };

/**
 * The cosmetic categories of the Collection (trails, frames, titles, boards) and today's deals: the chosen item big on the
 * left, with what it takes to have it, and the grid on the right. Mirrors the outfit view so the screen reads as one.
 */
const CosmeticsBody = ({ category, stats, onStats, hero, playerName, cardSize, onGridWidth, initialPick }: Props) => {
  const { t } = useT();
  const calm = useSettingsStore(s => s.reduceFlash);
  const today = dailyKey();
  const entries: Entry[] = category === "deals"
    ? dailyDeals(stats, today).map(d => ({ key: d.key, deal: d }))
    : cosmeticsOf(category).map(c => ({ key: c.id, id: c.id }));
  const [picked, setPicked] = useState<string | null>(initialPick ?? null);
  const shown = entries.find(e => e.key === picked) ?? entries.find(e => e.id && equippedCosmetic(stats, cosmeticInfo(e.id).kind) === e.id) ?? entries[0];
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const busy = useRef(false);

  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    // A title only changes the words under the same portrait: the portrait does not pop again.
    if (calm || category === "title") return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
  }, [shown?.key, pop, calm, category]);

  const portrait = skinArt(hero, "classic").scoreImage;
  const preview = Math.max(60, Math.min(stage.h, stage.w));

  if (!shown) return null;

  // What the chosen entry is, owns, costs and offers to do.
  const deal = shown.deal;
  const item = deal?.item;
  const cosmeticId = shown.id ?? (item?.kind === "cosmetic" ? item.id : undefined);
  const info = cosmeticId ? cosmeticInfo(cosmeticId) : undefined;
  const skin = item?.kind === "skin" ? item : undefined;
  const owned = deal ? deal.bought || (skin ? skinStatus(stats, skin.hero, skin.skin).owned : ownsCosmetic(stats, cosmeticId!)) : ownsCosmetic(stats, cosmeticId!);
  const equipped = !!info && equippedCosmetic(stats, info.kind) === cosmeticId;
  const price = deal ? deal.price : info?.price ?? 0;
  const forSale = deal ? !owned : !!info && info.price > 0 && !owned;
  const affordable = stats.embers >= price;
  const earnOnly = !deal && !!info && info.price <= 0 && !owned;
  const name = skin ? `${heroText(t, skin.hero, "name")} · ${skinText(t, skin.skin)}` : cosmeticText(t, cosmeticId!);
  const tierColor = info ? TIER_COLOR[info.tier] : "#7FAFC6";
  const tierLabel = info ? t(`cosmetic.tier.${info.tier}` as TranslationKey) : t("skin.outfit");

  const run = async (work: () => Promise<LocalStats | null>, success: boolean) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const next = await work();
      if (!next) return;
      onStats(next);
      if (success) {
        haptic.notify(NotificationFeedbackType.Success);
        emitSound("RELIC_PICKED");
        if (!calm) {
          pop.setValue(0);
          Animated.spring(pop, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
        }
      } else haptic.impact();
    } finally {
      busy.current = false;
    }
  };

  const buy = () =>
    run(async () => {
      const next = deal ? await buyDealFor(deal.key) : await buyCosmeticFor(cosmeticId!);
      if (!next) return null;
      analytics.track("forge_purchase", { upgrade: deal ? `deal_${deal.key}` : `cosmetic_${cosmeticId}`, level: 1, cost: price });
      // What was just bought is worn at once.
      if (skin) return (await equipSkinFor(skin.hero, skin.skin)) ?? next;
      if (info) return (await equipCosmeticFor(info.kind, cosmeticId!)) ?? next;
      return next;
    }, true);
  const toggle = () => run(() => equipCosmeticFor(info!.kind, equipped ? null : cosmeticId!), false);

  const howToEarn = (unlock: CosmeticInfo["unlock"]): string | null =>
    !unlock
      ? null
      : unlock.kind === "wardrobe"
        ? t("cosmetic.unlock.wardrobe")
        : unlock.kind === "collection"
          ? t("cosmetic.unlock.collection", { pct: unlock.pct })
          : unlock.kind === "mastery"
            ? t("cosmetic.unlock.mastery", { name: heroText(t, unlock.hero, "name") })
          : unlock.kind === "season"
            ? t("cosmetic.unlock.season")
          : unlock.kind === "seasonMonth"
            ? t("cosmetic.unlock.seasonMonth", { month: t(`season.month.${unlock.month}` as TranslationKey) })
          : unlock.kind === "quests"
            ? t("cosmetic.unlock.quests", { name: heroText(t, unlock.hero, "name") })
          : unlock.kind === "event"
            ? t(`cosmetic.unlock.yule.${unlock.goal}` as TranslationKey, { floors: YULE_FLOORS, puzzles: YULE_PUZZLES })
          : unlock.kind === "puzzleChapter"
            ? t("cosmetic.unlock.puzzleChapter", { tier: t(`puzzle.tier.${unlock.tier}` as TranslationKey) })
          : t("cosmetic.unlock.achievement", { name: achievementText(t, unlock.id, "name") });
  const unlockLine = howToEarn(info?.unlock);

  // Titles are words, not pictures: each one is a tag as wide as its name, flowing in rows so no space is wasted, with
  // its price or state inside. How to earn one is told in the showcase when it is picked.
  const plate = (c: CosmeticInfo, i: number) => {
    const has = ownsCosmetic(stats, c.id);
    const worn = equippedCosmetic(stats, "title") === c.id;
    const on = c.id === shown.key;
    const color = TIER_COLOR[c.tier];
    return (
      <Rise key={c.id} delay={riseDelay(i)}>
        <PressScale
          onPress={() => setPicked(c.id)}
          accessibilityRole="button"
          accessibilityState={{ selected: on }}
          accessibilityLabel={`${cosmeticText(t, c.id)}. ${t(`cosmetic.tier.${c.tier}` as TranslationKey)}`}
          style={[styles.tag2, { borderColor: has ? color : color + "66" }, on && styles.tag2On, c.tier === "legendary" && has && styles.tag2Glow]}
        >
          <View style={[styles.gem, { backgroundColor: color, opacity: has ? 1 : 0.5 }]} />
          <Text style={[styles.tag2Text, !has && styles.tag2TextLocked]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {cosmeticText(t, c.id).toLocaleUpperCase()}
          </Text>
          {worn ? (
            <View style={styles.tag2Worn}>
              <Ionicons name="checkmark" size={12} color="#111" />
            </View>
          ) : has ? null : c.price > 0 ? (
            <View style={styles.tag2Price}>
              <EmberIcon size={11} />
              <Text style={styles.cardPriceText} maxFontSizeMultiplier={1.1}>{c.price}</Text>
            </View>
          ) : (
            <GlyphIcon name="trophy" size={15} />
          )}
        </PressScale>
      </Rise>
    );
  };
  const titleGroups = (() => {
    const all = cosmeticsOf("title");
    const mine = all.filter(c => ownsCosmetic(stats, c.id)).sort((a, b) => Number(equippedCosmetic(stats, "title") === b.id) - Number(equippedCosmetic(stats, "title") === a.id));
    const sale = all.filter(c => !ownsCosmetic(stats, c.id) && c.price > 0).sort((a, b) => a.price - b.price);
    const earn = all.filter(c => !ownsCosmetic(stats, c.id) && c.price <= 0);
    return [
      { key: "mine", label: t("collection.titles.mine"), list: mine },
      { key: "sale", label: t("collection.titles.sale"), list: sale },
      { key: "earn", label: t("collection.titles.earn"), list: earn },
    ].filter(g => g.list.length > 0);
  })();

  const card = (e: Entry, i: number) => {
    const eId = e.id ?? (e.deal?.item.kind === "cosmetic" ? e.deal.item.id : undefined);
    const eSkin = e.deal?.item.kind === "skin" ? e.deal.item : undefined;
    const eOwned = e.deal ? e.deal.bought : ownsCosmetic(stats, eId!);
    const eEquipped = !!eId && equippedCosmetic(stats, cosmeticInfo(eId).kind) === eId;
    const ePrice = e.deal ? e.deal.price : eId ? cosmeticInfo(eId).price : 0;
    const color = eId ? TIER_COLOR[cosmeticInfo(eId).tier] : "#7FAFC6";
    const on = e.key === shown.key;
    return (
      <Rise key={e.key} delay={riseDelay(i)}>
        <PressScale
          onPress={() => setPicked(e.key)}
          accessibilityRole="button"
          accessibilityState={{ selected: on }}
          accessibilityLabel={eSkin ? `${heroText(t, eSkin.hero, "name")} · ${skinText(t, eSkin.skin)}` : cosmeticText(t, eId!)}
          style={[styles.card, { width: cardSize, height: cardSize * 1.22, borderColor: on ? "#E8D3A2" : color + "88", borderWidth: on ? 3 : 1.5, backgroundColor: on ? color + "26" : "rgba(30, 22, 16, 0.85)" }]}
        >
          <View style={{ marginTop: 4 }}>
            {eSkin ? (
              <SpriteImage source={skinArt(eSkin.hero, eSkin.skin).playerImage} style={{ width: cardSize * 0.9, height: cardSize * 0.9 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            ) : (
              <CosmeticPreview id={eId!} size={cardSize * 0.9} portrait={portrait} small petStage={petStage(stats.petFloors?.[eId!])} />
            )}
          </View>
          <View style={styles.cardFoot}>
            {eOwned ? (
              <Text style={styles.cardName} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                {e.deal
                  ? t("collection.deals.bought")
                  : eSkin
                    ? skinText(t, eSkin.skin)
                    : cosmeticInfo(eId!).kind === "title"
                      ? (cosmeticInfo(eId!).price > 0 ? t("skin.owned") : t("cosmetic.earned"))
                      : cosmeticText(t, eId!)}
              </Text>
            ) : ePrice > 0 ? (
              <View style={styles.cardPrice}>
                <EmberIcon size={11} />
                <Text style={styles.cardPriceText} maxFontSizeMultiplier={1.1}>{ePrice}</Text>
              </View>
            ) : (
              <View style={styles.cardPrice}>
                <GlyphIcon name="trophy" size={13} />
              </View>
            )}
          </View>
          {e.deal && !e.deal.bought ? (
            <View style={styles.dealBadge}>
              <Text style={styles.dealBadgeText}>-30%</Text>
            </View>
          ) : null}
          {eEquipped ? (
            <View style={styles.cardCheck}>
              <Ionicons name="checkmark" size={14} color="#111" />
            </View>
          ) : !eOwned ? (
            <View style={styles.cardLock}>
              <Ionicons name="lock-closed" size={12} color="#fff" />
            </View>
          ) : null}
        </PressScale>
      </Rise>
    );
  };

  return (
    <View style={styles.body}>
      <View style={styles.showcase}>
        <View style={styles.stage} onLayout={ev => setStage({ w: ev.nativeEvent.layout.width, h: ev.nativeEvent.layout.height })}>
          {/* Drawn only once the stage is measured, and out of its flow: a guessed size would show big for a frame and then shrink. */}
          {stage.h > 0 ? (
            <View style={styles.stageLayer} pointerEvents="none">
              {/* A title is about the player wearing it: no rarity halo competes with the portrait. */}
              {info?.kind !== "title" ? (
                <View style={[styles.halo, { width: preview * 0.92, height: preview * 0.92, borderRadius: preview, backgroundColor: tierColor + "22", borderColor: tierColor + "55" }]} />
              ) : null}
              <Animated.View style={{ opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
                {skin ? (
                  <SpriteImage source={skinArt(skin.hero, skin.skin).playerImage} style={{ width: preview, height: preview }} resizeMode="contain" accessibilityIgnoresInvertColors />
                ) : (
                  <CosmeticPreview id={cosmeticId!} size={preview} portrait={portrait} playerName={playerName} frame={equippedCosmetic(stats, "frame") ?? undefined} petStage={petStage(stats.petFloors?.[cosmeticId!])} />
                )}
              </Animated.View>
            </View>
          ) : null}
        </View>

        {/* A title is already written under the portrait: its name is not repeated. */}
        {info?.kind !== "title" ? (
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2} accessibilityRole="header">
            {name.toLocaleUpperCase()}
          </Text>
        ) : null}
        <View style={styles.chips}>
          <View style={[styles.tag, { borderColor: tierColor }]}>
            <Text style={[styles.tagText, { color: tierColor }]} maxFontSizeMultiplier={1.2}>{tierLabel.toLocaleUpperCase()}</Text>
          </View>
          {deal && !deal.bought ? (
            <View style={[styles.tag, { borderColor: "#B86A48", backgroundColor: "rgba(184, 106, 72,0.16)" }]}>
              <Text style={[styles.tagText, { color: "#D28663" }]} maxFontSizeMultiplier={1.2}>-30%</Text>
            </View>
          ) : null}
          {owned ? (
            <View style={[styles.tag, { borderColor: "#A3BF7C", backgroundColor: equipped ? "rgba(163, 191, 124,0.14)" : undefined }]}>
              {equipped ? <Ionicons name="checkmark" size={11} color="#A3BF7C" /> : null}
              <Text style={[styles.tagText, { color: "#A3BF7C" }]} maxFontSizeMultiplier={1.2}>
                {(equipped ? t("skin.equipped") : deal ? t("collection.deals.bought") : info && info.price <= 0 ? t("cosmetic.earned") : t("skin.owned")).toLocaleUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>
        {/* A title's preview already shows where it appears: the line would only take room from the portrait. */}
        {/* A grown companion's stage takes this line's place (small screens have no room for both). */}
        {info && info.kind !== "title" && !(info.kind === "pet" && owned) ? (
          <Text style={styles.hint} numberOfLines={2} maxFontSizeMultiplier={1.15}>
            {t(`cosmetic.shown.${info.kind}` as TranslationKey)}
          </Text>
        ) : null}
        {/* A companion's growth: its stage and the floors still to play with it worn. */}
        {info && info.kind === "pet" && owned ? (() => {
          const g = petProgress(stats.petFloors?.[cosmeticId!]);
          return (
            <View style={styles.growth}>
              {g.need !== null && PET_ADULT_ART[cosmeticId!] && stage.h >= 150 ? (
                <View style={styles.growthGoal} accessible accessibilityLabel={t("pet.adultGoal")}>
                  <SpriteImage source={PET_ADULT_ART[cosmeticId!]![0]} style={styles.growthSilhouette} resizeMode="contain" />
                  <Text style={styles.growthGoalText} maxFontSizeMultiplier={1.1}>{t("pet.adultGoal")}</Text>
                </View>
              ) : null}
              <Text style={styles.growthText} maxFontSizeMultiplier={1.15}>
                {g.need === null ? t("pet.grown") : t("pet.grow", { stage: t(`pet.stage.${g.stage}` as TranslationKey), have: g.have, need: g.need })}
              </Text>
              {g.need !== null ? (
                <View style={styles.growthTrack}>
                  <View style={[styles.growthFill, { width: `${Math.max(3, Math.round((g.have / g.need) * 100))}%` }]} />
                </View>
              ) : null}
            </View>
          );
        })() : null}

        {forSale && affordable ? (
          <PressScale onPress={() => void buy()} accessibilityRole="button" style={[styles.cta, { backgroundColor: GOLD }]}>
            <EmberIcon size={18} />
            {deal ? <Text style={styles.ctaStrike}>{deal.fullPrice}</Text> : null}
            <Text style={styles.ctaText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
              {t("collection.deals.buy", { price }).toLocaleUpperCase()}
            </Text>
          </PressScale>
        ) : forSale ? (
          <View style={styles.lockInfo} accessible>
            <View style={styles.lockRow}>
              <EmberIcon size={13} />
              <Text style={styles.lockTitle} maxFontSizeMultiplier={1.2}>{`${stats.embers} / ${price}`}</Text>
              <Text style={styles.lockNeed} numberOfLines={1} maxFontSizeMultiplier={1.1}>{t("skin.needEmbers", { n: price - stats.embers })}</Text>
            </View>
            <View style={styles.lockTrack}>
              <View style={[styles.lockFill, { width: `${Math.min(100, Math.round((stats.embers / Math.max(1, price)) * 100))}%` }]} />
            </View>
          </View>
        ) : earnOnly && unlockLine ? (
          <View style={styles.lockInfo}>
            <View style={styles.lockRow}>
              <GlyphIcon name="trophy" size={16} />
              <Text style={styles.lockSub} numberOfLines={2} maxFontSizeMultiplier={1.15}>{unlockLine}</Text>
            </View>
          </View>
        ) : owned && info ? (
          <PressScale onPress={() => void toggle()} accessibilityRole="button" style={[styles.cta, equipped ? styles.ctaQuiet : { backgroundColor: tierColor }]}>
            <Ionicons name={equipped ? "close-circle" : "checkmark-circle"} size={18} color={equipped ? "#EAE1D8" : "#111"} />
            <Text style={[styles.ctaText, equipped && { color: "#EAE1D8" }]} maxFontSizeMultiplier={1.2}>
              {(equipped ? t("cosmetic.remove") : t("skin.equip")).toLocaleUpperCase()}
            </Text>
          </PressScale>
        ) : null}
      </View>

      <View style={styles.browse}>
        {category === "deals" ? (
          <View style={styles.dealsHead}>
            <Text style={styles.dealsTitle} maxFontSizeMultiplier={1.2}>{t("collection.deals.title").toLocaleUpperCase()}</Text>
            <Text style={styles.dealsTime} maxFontSizeMultiplier={1.2}>{t("collection.deals.refresh", { time: formatCountdown(msUntilNextDay()) })}</Text>
          </View>
        ) : null}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          onLayout={ev => {
            onGridWidth(ev.nativeEvent.layout.width);
          }}
        >
          {category === "title"
            ? titleGroups.map(g => (
                <React.Fragment key={g.key}>
                  <View style={styles.groupHead}>
                    <Text style={styles.groupTitle} maxFontSizeMultiplier={1.15}>{g.label.toLocaleUpperCase()}</Text>
                    <Text style={styles.groupCount} maxFontSizeMultiplier={1.1}>{g.list.length}</Text>
                  </View>
                  {g.list.map(plate)}
                </React.Fragment>
              ))
            : entries.map(card)}
        </ScrollView>
      </View>
    </View>
  );
};

export default CosmeticsBody;

const styles = StyleSheet.create({
  growth: { gap: 4, alignSelf: "stretch" },
  growthText: { color: "#E8C07D", fontSize: 12, fontWeight: "800", textAlign: "center" },
  growthTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  growthFill: { height: 6, borderRadius: 3, backgroundColor: "#E8C07D" },
  growthGoal: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  growthSilhouette: { width: 40, height: 40, tintColor: "#8A7560", opacity: 0.85 },
  growthGoalText: { color: "#A8927D", fontSize: 11, fontWeight: "800" },
  body: { flex: 1, flexDirection: "row", gap: 12, padding: 10, paddingTop: 0 },
  showcase: { width: "40%", maxWidth: 460, alignItems: "center", gap: 6 },
  stage: { flex: 1, minHeight: 90, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  stageLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", borderWidth: 2 },
  name: { color: "#F3EADB", fontWeight: "900", fontSize: 20, letterSpacing: 2, textAlign: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, borderWidth: 1 },
  tagText: { fontWeight: "900", fontSize: 11, letterSpacing: 1.2 },
  hint: { color: "#CAB39C", fontSize: 12, textAlign: "center" },
  cta: { alignSelf: "stretch", minHeight: MIN_TOUCH + 4, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 14, borderBottomWidth: 4, borderBottomColor: "rgba(0,0,0,0.3)" },
  ctaQuiet: { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)", borderBottomWidth: 1.5 },
  ctaText: { color: "#111", fontWeight: "900", letterSpacing: 1.2, fontSize: 15, flexShrink: 1 },
  ctaStrike: { color: "rgba(17,17,17,0.55)", fontWeight: "800", fontSize: 13, textDecorationLine: "line-through" },
  lockInfo: { alignSelf: "stretch", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.28)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  lockRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  lockTitle: { color: "#F3EADB", fontWeight: "900", fontSize: 14 },
  lockNeed: { flex: 1, textAlign: "right", color: "#CAB39C", fontWeight: "700", fontSize: 12 },
  lockSub: { flex: 1, color: "#E1D4C8", fontSize: 12 },
  lockTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.14)", overflow: "hidden" },
  lockFill: { height: "100%", borderRadius: 3, backgroundColor: GOLD },
  browse: { flex: 1, gap: 8 },
  dealsHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
  dealsTitle: { color: "#C9A55A", fontWeight: "900", fontSize: 13, letterSpacing: 2 },
  dealsTime: { color: "#CAB39C", fontWeight: "700", fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingBottom: 14 },
  card: { borderRadius: 16, alignItems: "center", justifyContent: "flex-start", overflow: "hidden" },
  cardFoot: { position: "absolute", bottom: 6, left: 4, right: 4, alignItems: "center" },
  cardName: { color: "#F3EADB", fontWeight: "900", fontSize: 12, paddingHorizontal: 4 },
  cardPrice: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.55)", borderWidth: 1, borderColor: "rgba(196, 139, 78,0.6)" },
  cardPriceText: { color: "#E2BE8C", fontWeight: "900", fontSize: 12 },
  cardCheck: { position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: "#A3BF7C", alignItems: "center", justifyContent: "center" },
  cardLock: { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  groupHead: { width: "100%", flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  groupTitle: { color: "#C9A55A", fontWeight: "900", fontSize: 12, letterSpacing: 2 },
  groupCount: { color: "#1a0f00", backgroundColor: "#CFA052", fontWeight: "900", fontSize: 11, paddingHorizontal: 7, borderRadius: 8, overflow: "hidden" },
  gem: { width: 7, height: 7, transform: [{ rotate: "45deg" }], borderRadius: 1.5 },
  tag2: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 40, paddingLeft: 12, paddingRight: 8, borderRadius: 12, borderWidth: 1.5, backgroundColor: "rgba(40, 26, 10, 0.92)" },
  tag2On: { borderColor: "#E8D3A2", borderWidth: 2.5, backgroundColor: "rgba(207, 160, 82,0.22)" },
  tag2Glow: { shadowColor: "#C9A55A", shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 5 },
  tag2Text: { color: "#C9A55A", fontWeight: "900", fontSize: 12.5, letterSpacing: 0.8, paddingRight: 4 },
  tag2TextLocked: { color: "#CDBBA8" },
  tag2Price: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 9, backgroundColor: "rgba(0,0,0,0.5)" },
  tag2Worn: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#A3BF7C", alignItems: "center", justifyContent: "center" },
  dealBadge: { position: "absolute", top: 4, left: 4, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, backgroundColor: "#B86A48" },
  dealBadgeText: { color: "#F3EADB", fontWeight: "900", fontSize: 11 },
});
