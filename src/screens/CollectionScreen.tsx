// src/screens/CollectionScreen.tsx
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Animated, ImageBackground, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useWindowDimensions } from "../ui/layout/scaledWindow";
import Text from "../ui/components/Text";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "../navigation/types";
import { MIN_TOUCH } from "../ui/layout/useGameLayout";
import ScreenHeader from "../ui/components/ScreenHeader";
import PressScale from "../ui/components/PressScale";
import Rise, { riseDelay } from "../ui/components/Rise";
import CosmeticsBody, { type CosmeticCategory } from "./collection/CosmeticsBody";
import CollectionRewards from "./collection/CollectionRewards";
import { collectionMilestonesReached, collectionProgress, type CosmeticId } from "../core/cosmetics/cosmetics";
import { getPlayerName } from "../services/playerProfile";
import SpriteImage from "../ui/components/SpriteImage";
import EmberIcon from "../ui/components/EmberIcon";
import characters from "../data/characters";
import { SKIN_ACCENT, skinArt, type SkinId } from "../data/skinArt";
import { SKINS, SKINS_BY_HERO } from "../core/skins/skins";
import { equippedSkin, skinStatus } from "../core/skins/ownership";
import { COLLECTION_FILTERS, CollectionFilter, heroCollectionCount, visibleSkins } from "../core/skins/collection";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { buySkinFor, equipSkinFor, getLocalStats, peekLocalStats } from "../services/localStats";
import { analytics } from "../services/analytics";
import { haptic, NotificationFeedbackType } from "../shared/haptics";
import { emitSound } from "../audio/audioEventBus";
import { useT } from "../i18n/useT";
import { heroText, skinText } from "../i18n/keys";
import type { TranslationKey } from "../i18n/en";
import { useSettingsStore } from "../state/settings/store";
import { heroAccent } from "../data/heroAccent";

type Props = NativeStackScreenProps<RootStackParamList, "CollectionScreen">;

type Category = "skins" | "rewards" | CosmeticCategory;
/** Today's deals first: the shelf that changes every day is what brings a player back to this screen. */
const CATEGORIES: { id: Category; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { id: "deals", icon: "pricetag" },
  { id: "rewards", icon: "trophy" },
  { id: "skins", icon: "shirt" },
  { id: "trail", icon: "flash" },
  { id: "frame", icon: "ellipse-outline" },
  { id: "title", icon: "ribbon" },
  { id: "board", icon: "grid" },
  { id: "flag", icon: "flag" },
  { id: "attack", icon: "locate" },
  { id: "celebration", icon: "sparkles" },
];

const accentOf = (hero: number, skin: SkinId) => (skin === "classic" ? heroAccent(hero) : SKIN_ACCENT[skin]);
const RARITY_COLOR = { free: "#9FA8DA", rare: "#4FC3F7", legendary: "#FFD54F" } as const;

type CardProps = { hero: number; skin: SkinId; size: number; owned: boolean; equipped: boolean; selected: boolean; price: number; onPress: (skin: SkinId) => void };

/**
 * One outfit in the grid: the hero wearing it in full colour (an outfit must be seen to be wanted), ringed in its rarity
 * colour; one not owned yet carries a small lock and its price instead of being dimmed.
 */
const OutfitCard = memo(({ hero, skin, size, owned, equipped, selected, price, onPress }: CardProps) => {
  const { t } = useT();
  const info = SKINS[skin];
  const rarity = RARITY_COLOR[info.tier];
  return (
    <PressScale
      onPress={() => onPress(skin)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${skinText(t, skin)}. ${t(`skin.tier.${info.tier}` as TranslationKey)}${info.premium ? `. ${t("skin.premium")}` : ""}. ${owned ? (equipped ? t("skin.equipped") : t("skin.owned")) : t("heroes.state.locked")}`}
      style={[
        styles.card,
        { width: size, height: size * 1.22, borderColor: selected ? "#FFE3A0" : rarity + "88", borderWidth: selected ? 3 : 1.5, backgroundColor: selected ? accentOf(hero, skin) + "33" : "rgba(30, 22, 16, 0.85)" },
      ]}
    >
      <View style={[styles.cardGlow, { backgroundColor: accentOf(hero, skin) + (selected ? "40" : "22") }]} />
      <SpriteImage source={skinArt(hero, skin).playerImage} style={{ width: size * 0.92, height: size * 0.92 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      <View style={styles.cardFoot}>
        {owned ? (
          <Text style={styles.cardName} numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {skinText(t, skin)}
          </Text>
        ) : (
          <View style={styles.cardPrice}>
            <EmberIcon size={11} />
            <Text style={styles.cardPriceText} numberOfLines={1} maxFontSizeMultiplier={1.1}>
              {price}
            </Text>
          </View>
        )}
      </View>
      {info.premium ? <Ionicons name="star" size={15} color="#FFD54F" style={styles.cardStar} /> : null}
      {equipped ? (
        <View style={styles.cardCheck}>
          <Ionicons name="checkmark" size={14} color="#111" />
        </View>
      ) : !owned ? (
        <View style={styles.cardLock}>
          <Ionicons name="lock-closed" size={12} color="#fff" />
        </View>
      ) : null}
    </PressScale>
  );
});

const CollectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t, plural } = useT();
  const { width, height } = useWindowDimensions();
  const calm = useSettingsStore(s => s.reduceFlash);
  const [stats, setStats] = useState<LocalStats>(() => peekLocalStats() ?? EMPTY_STATS);
  const [loaded, setLoaded] = useState(false);
  const [hero, setHero] = useState(Math.min(Math.max(route.params?.hero ?? 0, 0), characters.length - 1));
  const [filter, setFilter] = useState<CollectionFilter>("all");
  const [picked, setPicked] = useState<SkinId | null>(route.params?.skin ?? null);
  const [gridWidth, setGridWidth] = useState(0);
  const [tabsWidth, setTabsWidth] = useState(0);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const [category, setCategory] = useState<Category>(route.params?.category ?? (route.params?.skin ? "skins" : "deals"));
  const [playerName, setPlayerName] = useState("");
  // A reward opened from the Rewards tab is shown first in its own category.
  const [openPick, setOpenPick] = useState<CosmeticId | null>(null);
  useEffect(() => {
    void getPlayerName().then(n => setPlayerName(n ?? ""));
  }, []);
  const heroRef = useRef(hero);
  heroRef.current = hero;

  // The outfit that appears in the detail: the one tapped, else the one worn.
  const wornSkin = equippedSkin(stats, hero);
  const shown: SkinId = picked && (SKINS_BY_HERO[hero] ?? []).includes(picked) ? picked : wornSkin;

  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (calm) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
  }, [shown, hero, pop, calm]);

  useFocusEffect(
    useCallback(() => {
      getLocalStats()
        .then(next => {
          setStats(next);
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    }, []),
  );

  const onHero = useCallback((index: number) => {
    haptic.impact();
    setHero(index);
    setPicked(null);
  }, []);

  const wear = useCallback(async (skin: SkinId) => {
    const next = await equipSkinFor(heroRef.current, skin);
    if (next) {
      setStats(next);
      haptic.impact();
    }
  }, []);

  const buying = useRef(false);
  const buy = useCallback(
    async (skin: SkinId) => {
      if (buying.current) return; // a second tap while the first purchase is still being saved
      buying.current = true;
      let bought: LocalStats | null = null;
      try {
        bought = await buySkinFor(heroRef.current, skin);
      } finally {
        if (!bought) buying.current = false;
      }
      if (!bought) return;
      const worn = await equipSkinFor(heroRef.current, skin).finally(() => {
        buying.current = false;
      });
      setStats(worn ?? bought);
      analytics.track("forge_purchase", { upgrade: `skin_${skin}`, level: 1, cost: SKINS[skin].price });
      haptic.notify(NotificationFeedbackType.Success);
      emitSound("RELIC_PICKED");
      if (!calm) {
        pop.setValue(0);
        Animated.spring(pop, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
      }
    },
    [calm, pop],
  );

  // ── Sizes ────────────────────────────────────────────────────────────────────────────────────
  const ui = Math.max(0.85, Math.min(1.5, width / 900, height / 540));
  const gap = 10;
  const minCard = Math.round(112 * Math.min(height >= 600 ? Math.max(ui, 1.3) : ui, 1.5));
  const cols = Math.max(2, Math.floor((gridWidth + gap) / (minCard + gap)));
  const cardSize = gridWidth > 0 ? Math.floor((gridWidth - gap * (cols - 1)) / cols) : minCard;

  const progress = collectionProgress(stats);
  // A collection milestone reached and not yet seen: a banner and a dot on Rewards until the player opens that tab.
  const rewardsSeen = useSettingsStore(s => s.collectionRewardsSeen);
  const setRewardsSeen = useSettingsStore(s => s.setCollectionRewardsSeen);
  const milestones = collectionMilestonesReached(stats);
  const newReward = loaded && milestones > rewardsSeen;
  useEffect(() => {
    if (category === "rewards" && milestones > rewardsSeen) setRewardsSeen(milestones);
  }, [category, milestones, rewardsSeen, setRewardsSeen]);
  const list = visibleSkins(stats, hero, filter);
  const info = SKINS[shown];
  const state = skinStatus(stats, hero, shown);
  const accent = accentOf(hero, shown);
  const rarity = RARITY_COLOR[info.tier];
  const owned = state.owned;
  const equipped = shown === wornSkin;
  const canAct = owned ? !equipped : state.canBuy;

  const actionLabel = owned
    ? equipped
      ? t("skin.equipped")
      : t("skin.equip")
    : state.canBuy
      ? t("skin.buy", { price: state.price })
      : t("skin.needEmbers", { n: Math.max(0, state.price - stats.embers) });

  // Six tabs: when each gets less than ~78 px the portrait goes over the count instead of beside it.
  const tight = tabsWidth > 0 && (tabsWidth - 8 * (characters.length - 1)) / characters.length < 78;
  // The showcase stage grows into whatever height the name, tags and action leave (measured, never guessed).
  const detailImage = Math.max(60, Math.min(stageSize.h, stageSize.w));

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(13, 10, 7,0.88)" }}>
        <ScreenHeader
          title={t("collection.title")}
          subtitle={t("collection.progress", { pct: progress.pct, owned: progress.owned, total: progress.total })}
          onBack={() => navigation.goBack()}
          right={
            <View style={styles.balance} accessible accessibilityLabel={plural("forge.balance", stats.embers)}>
              <EmberIcon size={18} />
              <Text style={styles.balanceValue}>{stats.embers}</Text>
            </View>
          }
        />

        <ScrollView horizontal style={styles.catsScroll} contentContainerStyle={styles.cats} showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map(c => {
            const on = c.id === category;
            return (
              <PressScale
                key={c.id}
                onPress={() => {
                  haptic.impact();
                  setCategory(c.id);
                  setOpenPick(null);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[styles.cat, on && styles.catOn]}
              >
                <Ionicons name={c.icon} size={15} color={on ? "#1a0f00" : "#E8B04A"} />
                <Text style={[styles.catText, on && styles.catTextOn]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                  {t(`collection.cat.${c.id}` as TranslationKey)}
                </Text>
                {c.id === "deals" || (c.id === "rewards" && newReward) ? <View style={[styles.catDot, on && { backgroundColor: "#1a0f00" }]} /> : null}
              </PressScale>
            );
          })}
        </ScrollView>

        {newReward && category !== "rewards" ? (
          <PressScale
            onPress={() => {
              haptic.impact();
              setCategory("rewards");
            }}
            accessibilityRole="button"
            style={styles.rewardBanner}
          >
            <Ionicons name="trophy" size={18} color="#1a0f00" />
            <Text style={styles.rewardBannerText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
              {t("collection.rewards.banner")}
            </Text>
            <Text style={styles.rewardBannerCta} maxFontSizeMultiplier={1.1}>{t("collection.rewards.see").toLocaleUpperCase()}</Text>
            <Ionicons name="chevron-forward" size={16} color="#1a0f00" />
          </PressScale>
        ) : null}

        {category === "rewards" ? (
          <CollectionRewards
            stats={stats}
            portrait={skinArt(hero, "classic").scoreImage}
            playerName={playerName}
            onOpen={(kind, id) => {
              haptic.impact();
              setOpenPick(id);
              setCategory(kind);
            }}
          />
        ) : category !== "skins" ? (
          <CosmeticsBody key={category} category={category} initialPick={openPick} stats={stats} onStats={setStats} hero={hero} playerName={playerName} cardSize={cardSize} onGridWidth={setGridWidth} />
        ) : (
        <View style={styles.body}>
          {/* ── Left: the chosen outfit, big, then what it takes to wear it ─────────────────────────── */}
          <View style={styles.showcase}>
            <View style={styles.stage} onLayout={e => setStageSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
              {/* Drawn only once the stage is measured, and out of its flow: a guessed size would show big for a frame and then shrink. */}
              {stageSize.h > 0 ? (
                <View style={styles.stageLayer} pointerEvents="none">
                  <View style={[styles.halo, { width: detailImage * 0.92, height: detailImage * 0.92, borderRadius: detailImage, backgroundColor: accent + "2E", borderColor: accent + "55" }]} />
                  <Animated.View style={{ opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
                    <SpriteImage source={skinArt(hero, shown).playerImage} style={{ width: detailImage, height: detailImage }} resizeMode="contain" accessibilityIgnoresInvertColors />
                  </Animated.View>
                </View>
              ) : null}
              {!owned ? (
                <View style={styles.stageLock}>
                  <Ionicons name="lock-closed" size={14} color="#fff" />
                </View>
              ) : null}
            </View>

            <Text style={[styles.outfitName, { textShadowColor: accent }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2} accessibilityRole="header">
              {`${heroText(t, hero, "name")} · ${skinText(t, shown)}`.toLocaleUpperCase()}
            </Text>
            <View style={styles.chips}>
              <View style={[styles.tag, { borderColor: rarity }]}>
                <Text style={[styles.tagText, { color: rarity }]} maxFontSizeMultiplier={1.2}>
                  {t(`skin.tier.${info.tier}` as TranslationKey).toLocaleUpperCase()}
                </Text>
              </View>
              {info.premium ? (
                <View style={[styles.tag, { borderColor: "#FFD54F", backgroundColor: "rgba(255,213,79,0.14)" }]}>
                  <Ionicons name="star" size={10} color="#FFD54F" />
                  <Text style={[styles.tagText, { color: "#FFD54F" }]} maxFontSizeMultiplier={1.2}>
                    {t("skin.premium").toLocaleUpperCase()}
                  </Text>
                </View>
              ) : null}
              {owned ? (
                <View style={[styles.tag, { borderColor: "#9EE37D", backgroundColor: equipped ? "rgba(158,227,125,0.14)" : undefined }]}>
                  {equipped ? <Ionicons name="checkmark" size={11} color="#9EE37D" /> : null}
                  <Text style={[styles.tagText, { color: "#9EE37D" }]} maxFontSizeMultiplier={1.2}>
                    {(equipped ? t("skin.equipped") : t("skin.owned")).toLocaleUpperCase()}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* The big button only when there is something to do; an outfit still out of reach shows a quiet progress line. */}
            {canAct ? (
              <PressScale
                onPress={() => (owned ? void wear(shown) : void buy(shown))}
                accessibilityRole="button"
                accessibilityLabel={`${skinText(t, shown)}. ${actionLabel}`}
                style={[styles.cta, { backgroundColor: accent, shadowColor: accent }]}
              >
                {owned ? <Ionicons name="shirt" size={18} color="#111" /> : <EmberIcon size={18} />}
                <Text style={styles.ctaText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                  {actionLabel.toLocaleUpperCase()}
                </Text>
              </PressScale>
            ) : !owned ? (
              <View style={styles.lockInfo} accessible accessibilityLabel={`${actionLabel}. ${stats.embers} / ${state.price}`}>
                <View style={styles.lockRow}>
                  <EmberIcon size={13} />
                  <Text style={styles.lockTitle} maxFontSizeMultiplier={1.2}>{`${stats.embers} / ${state.price}`}</Text>
                  <Text style={styles.lockNeed} numberOfLines={1} maxFontSizeMultiplier={1.1}>{actionLabel}</Text>
                </View>
                <View style={styles.lockTrack}>
                  <View style={[styles.lockFill, { width: `${Math.min(100, Math.round((stats.embers / Math.max(1, state.price)) * 100))}%`, backgroundColor: accent }]} />
                </View>
                {info.unlock ? (
                  <Text style={styles.lockSub} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                    {info.unlock.kind === "wins"
                      ? t("skin.unlock.wins", { count: info.unlock.count })
                      : t("skin.unlock.depth", { depth: t(`ascension.label.${info.unlock.depth}` as TranslationKey) })}
                    {state.progress ? `  ·  ${t("skin.progress", { have: state.progress.have, need: state.progress.need })}` : ""}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* ── Right: the hero tabs, the filters and the grid of outfits ───────────────────────────── */}
          <View style={styles.browse}>
            <View style={styles.tabs} onLayout={e => setTabsWidth(e.nativeEvent.layout.width)}>
              {characters.map((_, i) => {
                const count = heroCollectionCount(stats, i);
                const on = i === hero;
                const a = heroAccent(i);
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => onHero(i)}
                    activeOpacity={0.85}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={t("collection.heroTab", { name: heroText(t, i, "name"), owned: count.owned, total: count.total })}
                    style={[styles.tab, tight && styles.tabTight, { borderColor: on ? a : "rgba(255,255,255,0.18)", backgroundColor: on ? a + "26" : "rgba(255,255,255,0.05)" }]}
                  >
                    <SpriteImage source={skinArt(i, equippedSkin(stats, i)).scoreImage} style={tight ? styles.tabImageTight : styles.tabImage} resizeMode="cover" accessibilityIgnoresInvertColors />
                    <Text style={[styles.tabCount, on && { color: a }]} maxFontSizeMultiplier={1.2}>
                      {count.owned}/{count.total}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.filters} accessibilityRole="tablist">
              {COLLECTION_FILTERS.map(f => {
                const on = f === filter;
                return (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFilter(f)}
                    activeOpacity={0.8}
                    hitSlop={{ top: 5, bottom: 5, left: 2, right: 2 }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                      {t(`collection.filter.${f}` as TranslationKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false} onLayout={e => setGridWidth(e.nativeEvent.layout.width)}>
              {loaded && list.length === 0 ? (
                <Text style={styles.empty} maxFontSizeMultiplier={1.2}>
                  {t("collection.empty")}
                </Text>
              ) : null}
              {list.map((id, i) => (
                <Rise key={id} delay={riseDelay(i)}>
                  <OutfitCard hero={hero} skin={id} size={cardSize} owned={skinStatus(stats, hero, id).owned} equipped={id === wornSkin} selected={id === shown} price={skinStatus(stats, hero, id).price} onPress={setPicked} />
                </Rise>
              ))}
            </ScrollView>
          </View>

        </View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  balance: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, backgroundColor: "rgba(255,171,64,0.16)", borderWidth: 1.5, borderColor: "rgba(255,171,64,0.7)" },
  balanceValue: { color: "#FFAB40", fontSize: 20, fontWeight: "900" },

  body: { flex: 1, flexDirection: "row", gap: 12, padding: 10, paddingTop: 0 },
  catsScroll: { flexGrow: 0 },
  cats: { flexDirection: "row", gap: 8, paddingHorizontal: 10, paddingVertical: 8 },
  cat: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1.5, borderColor: "rgba(232,176,74,0.45)", backgroundColor: "rgba(255,255,255,0.05)" },
  catOn: { backgroundColor: "#E8B04A", borderColor: "#E8B04A" },
  catText: { color: "#EAE1D8", fontWeight: "900", fontSize: 13 },
  catTextOn: { color: "#1a0f00" },
  rewardBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 10, marginBottom: 8, paddingHorizontal: 14, minHeight: 40, borderRadius: 14, backgroundColor: "#E8B04A", borderBottomWidth: 3, borderBottomColor: "rgba(0,0,0,0.3)" },
  rewardBannerText: { flex: 1, color: "#1a0f00", fontWeight: "900", fontSize: 13.5 },
  rewardBannerCta: { color: "#1a0f00", fontWeight: "900", fontSize: 12, letterSpacing: 1.2 },
  catDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FF7043" },
  showcase: { width: "40%", maxWidth: 460, alignItems: "center", gap: 6 },
  browse: { flex: 1, gap: 8 },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: MIN_TOUCH - 4, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 6 },
  tabTight: { flexDirection: "column", gap: 1, paddingHorizontal: 2, paddingVertical: 3 },
  tabImageTight: { width: 26, height: 26, borderRadius: 13 },
  tabImage: { width: 30, height: 30, borderRadius: 15 },
  tabCount: { color: "#E4D8CD", fontWeight: "900", fontSize: 12 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: "#E8BA52", borderColor: "#E8BA52" },
  chipText: { color: "#EAE1D8", fontWeight: "800", fontSize: 12 },
  chipTextOn: { color: "#1a0f00" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingBottom: 14 },
  empty: { color: "#CAB39C", fontSize: 13, padding: 12 },

  card: { borderRadius: 16, alignItems: "center", justifyContent: "flex-start", paddingTop: 4, overflow: "hidden" },
  cardGlow: { position: "absolute", left: "12%", right: "12%", top: "8%", aspectRatio: 1, borderRadius: 999 },
  cardFoot: { position: "absolute", bottom: 6, left: 4, right: 4, alignItems: "center" },
  cardName: { color: "#fff", fontWeight: "900", fontSize: 12, paddingHorizontal: 4 },
  cardPrice: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.55)", borderWidth: 1, borderColor: "rgba(255,171,64,0.6)" },
  cardPriceText: { color: "#FFCC80", fontWeight: "900", fontSize: 12 },
  cardStar: { position: "absolute", top: 4, left: 5 },
  cardCheck: { position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: "#9EE37D", alignItems: "center", justifyContent: "center" },
  cardLock: { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },

  stage: { flex: 1, minHeight: 90, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  stageLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", borderWidth: 2 },
  stageLock: { position: "absolute", top: 4, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  outfitName: { color: "#fff", fontWeight: "900", fontSize: 22, letterSpacing: 2, textAlign: "center", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, borderWidth: 1 },
  tagText: { fontWeight: "900", fontSize: 11, letterSpacing: 1.2 },
  lockInfo: { alignSelf: "stretch", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.28)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  lockRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  lockTitle: { color: "#fff", fontWeight: "900", fontSize: 14 },
  lockNeed: { flex: 1, textAlign: "right", color: "#CAB39C", fontWeight: "700", fontSize: 12 },
  lockSub: { color: "#E1D4C8", fontSize: 12 },
  lockTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.14)", overflow: "hidden" },
  lockFill: { height: "100%", borderRadius: 3 },
  cta: { alignSelf: "stretch", minHeight: MIN_TOUCH + 4, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 14, borderBottomWidth: 4, borderBottomColor: "rgba(0,0,0,0.3)", shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  ctaText: { color: "#111", fontWeight: "900", letterSpacing: 1.2, fontSize: 15, flexShrink: 1 },
});

export default CollectionScreen;
