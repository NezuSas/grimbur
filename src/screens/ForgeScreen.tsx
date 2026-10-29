import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, FlatList, ImageBackground, ScrollView, StyleSheet, View } from "react-native";
import { useWindowDimensions } from "../ui/layout/scaledWindow";
import Text from "../ui/components/Text";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "../navigation/types";
import { useGameLayout } from "../ui/layout/useGameLayout";
import {
  UPGRADES,
  UpgradeCategory,
  UpgradeId,
  UpgradeInfo,
  affordableCount,
  canAfford,
  levelOf,
  maxLevel,
  metaEffects,
  nextCost,
  recommendedUpgrade,
  shopOrder,
} from "../core/stats/forge";
import type { TranslationKey } from "../i18n/en";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { buyUpgrade, getLocalStats, peekLocalStats } from "../services/localStats";
import { analytics } from "../services/analytics";
import { haptic, NotificationFeedbackType } from "../shared/haptics";
import { emitSound } from "../audio/audioEventBus";
import { useT } from "../i18n/useT";
import { achievementText, forgeText } from "../i18n/keys";
import { rewardFor, splitNames } from "../core/stats/achievements";
import ScreenHeader from "../ui/components/ScreenHeader";
import PressScale from "../ui/components/PressScale";
import EmberIcon from "../ui/components/EmberIcon";
import { riseDelay } from "../ui/components/Rise";
import { useSettingsStore } from "../state/settings/store";
import { EMBER, GOLD, Balance, Burst, Badge, Pips, Rise, BuyButton } from "./forge/parts";

type Props = NativeStackScreenProps<RootStackParamList, "ForgeScreen">;

type Filter = "all" | UpgradeCategory;
const FILTERS: readonly Filter[] = ["all", "power", "economy", "relics"];
const TILE = 132;
const GAP = 8;

type TileProps = { info: UpgradeInfo; stats: LocalStats; selected: boolean; burst: number; index: number; onPress: (id: UpgradeId) => void };

/** One upgrade in the wall: its picture, its level and what the next one costs (glowing when the player can pay it). */
const Tile = memo(({ info, stats, selected, burst, index, onPress }: TileProps) => {
  const { t } = useT();
  const level = levelOf(stats, info.id);
  const max = maxLevel(info.id);
  const cost = nextCost(stats, info.id);
  const affordable = canAfford(stats, info.id);
  const maxed = cost === null;
  const name = forgeText(t, info.id, "name");
  return (
    <Rise delay={riseDelay(index, 60)}>
      <PressScale
        onPress={() => onPress(info.id)}
        style={[styles.tile, affordable && styles.tileReady, maxed && styles.tileMaxed, selected && styles.tileSelected]}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${name}. ${t("forge.level", { level, max })}. ${maxed ? t("forge.maxed") : t("forge.needs", { cost })}`}
      >
        <Badge info={info} size={52} maxed={maxed} strike={burst} />
        <Text style={styles.tileName} numberOfLines={2} maxFontSizeMultiplier={1.05}>
          {name}
        </Text>
        <View style={styles.tilePips}>
          {Array.from({ length: max }, (_, i) => (
            <View key={i} style={[styles.tilePip, i < level && { backgroundColor: maxed ? GOLD : EMBER }]} />
          ))}
        </View>
        <View style={[styles.cost, affordable && styles.costReady, maxed && styles.costMaxed]}>
          {maxed ? (
            <Ionicons name="checkmark" size={13} color={GOLD} />
          ) : (
            <>
              <EmberIcon size={12} />
              <Text style={[styles.costText, affordable && { color: "#1a0f00" }]} maxFontSizeMultiplier={1.05}>
                {cost}
              </Text>
            </>
          )}
        </View>
        <Burst run={burst} />
      </PressScale>
    </Rise>
  );
});

const ForgeScreen: React.FC<Props> = ({ navigation }) => {
  const { t, plural } = useT();
  const { width } = useWindowDimensions();
  const { insets } = useGameLayout();
  const [stats, setStats] = useState<LocalStats>(() => peekLocalStats() ?? EMPTY_STATS);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [burst, setBurst] = useState<{ id: UpgradeId; run: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [howOpen, setHowOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<UpgradeId | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const toastFade = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      getLocalStats()
        .then(next => {
          setStats(next);
          setLoaded(true);
          // The explanation is open the first time, folded away once the player owns something.
          setHowOpen(Object.values(next.forge).every(level => !level));
        })
        .catch(() => {});
    }, []),
  );
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const showToast = useCallback(
    (text: string) => {
      setToast(text);
      toastFade.setValue(0);
      Animated.timing(toastFade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => {
        Animated.timing(toastFade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast(null));
      }, 2800);
    },
    [toastFade],
  );

  const buying = useRef(false);
  const buy = useCallback(
    async (id: UpgradeId) => {
      if (busy || buying.current) return; // the ref answers at once; the state only after the next render
      buying.current = true;
      setBusy(true);
      setError(false);
      try {
        const cost = nextCost(stats, id) ?? 0;
        const result = await buyUpgrade(id);
        if (result) {
          const next = result.stats;
          analytics.track("forge_purchase", { upgrade: id, level: levelOf(next, id), cost });
          setStats(next);
          setBurst({ id, run: Date.now() });
          emitSound("FORGE_HAMMER");
          haptic.notify(NotificationFeedbackType.Success);
          const name = forgeText(t, id, "name");
          if (result.achievements.length > 0) {
            const { shown, more } = splitNames(result.achievements);
            const names = shown.map(a => achievementText(t, a, "name")).join(", ") + (more > 0 ? ` +${more}` : "");
            showToast(t("forge.boughtAchievement", { name, names, embers: rewardFor(result.achievements) }));
          } else {
            showToast(t("forge.bought", { name }));
          }
        }
      } catch {
        setError(true);
      } finally {
        buying.current = false;
        setBusy(false);
      }
    },
    [busy, showToast, t, stats],
  );

  const narrow = width < 600;
  const featured = useMemo(() => recommendedUpgrade(stats), [stats]);
  const ready = useMemo(() => affordableCount(stats), [stats]);
  const owned = UPGRADES.filter(u => levelOf(stats, u.id) > 0).length;
  const effects = useMemo(() => metaEffects(stats.forge), [stats.forge]);

  // The player's current gear as short lines.
  const gear: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string }[] = [];
  if (effects.arrows) gear.push({ icon: "arrow-forward-circle", text: t("forge.eq.arrows", { n: effects.arrows }) });
  if (effects.coinBonus) gear.push({ icon: "diamond", text: t("forge.eq.gems", { percent: Math.round(effects.coinBonus * 100) }) });
  if (effects.exploreBonus) gear.push({ icon: "compass", text: t("forge.eq.explore", { percent: Math.round(effects.exploreBonus * 100) }) });
  if (effects.draftBonus) gear.push({ icon: "albums", text: t("forge.eq.draft", { n: effects.draftBonus }) });
  if (effects.reach) gear.push({ icon: "locate", text: t("forge.eq.reach", { n: effects.reach }) });
  if (effects.shield) gear.push({ icon: "shield-checkmark", text: t("forge.eq.shield") });
  if (effects.startRelics.length) gear.push({ icon: "sparkles", text: t("forge.eq.relics", { n: effects.startRelics.length }) });
  const embersLevel = levelOf(stats, "fortune");
  if (embersLevel) gear.push({ icon: "flame", text: t("forge.eq.embers", { percent: embersLevel * 15 }) });

  const list = shopOrder(stats).filter(u => (filter === "all" ? true : u.category === filter));
  const readyIn = (f: Filter) => UPGRADES.filter(u => (f === "all" || u.category === f) && canAfford(stats, u.id)).length;

  // What the showcase shows: the tapped upgrade, else the one worth buying now, else the first in the list.
  const selected = UPGRADES.find(u => u.id === selectedId) ?? featured ?? list[0] ?? UPGRADES[0];
  const selCost = nextCost(stats, selected.id);
  const selReady = canAfford(stats, selected.id);
  const isFeatured = !!featured && featured.id === selected.id;
  const kicker = selCost === null ? t("forge.maxed") : isFeatured ? (selReady ? t("forge.featured.buy") : t("forge.featured.goal")) : t(`forge.filter.${selected.category}` as TranslationKey);

  const columns = Math.max(1, Math.floor((gridWidth + GAP) / (TILE + GAP)));
  const tileWidth = gridWidth > 0 ? Math.floor((gridWidth - GAP * (columns - 1)) / columns) : TILE;
  const pick = useCallback((id: UpgradeId) => setSelectedId(id), []);

  // The showcase breathes softly when its upgrade can be bought, so the eye lands there without an arrow.
  const calm = useSettingsStore(s => s.reduceFlash);
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!selReady || calm) {
      breathe.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [selReady, calm, breathe]);

  const strike = burst && burst.id === selected.id ? burst.run : 0;

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(13, 10, 7,0.88)" }} edges={["top", "left", "right"]}>
        <ScreenHeader
          title={t("forge.title")}
          subtitle={t("forge.hint")}
          onBack={() => navigation.goBack()}
          right={<Balance value={stats.embers} label={plural("forge.balance", stats.embers)} />}
        />

        <View style={[styles.body, narrow && styles.bodyNarrow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <ScrollView style={[styles.side, narrow && styles.sideNarrow]} contentContainerStyle={styles.sideContent} showsVerticalScrollIndicator={false}>
            {error ? (
              <Text style={styles.error} accessibilityLiveRegion="assertive">
                {t("forge.error")}
              </Text>
            ) : null}

            {loaded && !featured && selCost === null && filter === "all" ? (
              <Text style={styles.allBought} maxFontSizeMultiplier={1.2}>
                {t("forge.allBought")}
              </Text>
            ) : null}

            <Animated.View
              key={selected.id}
              style={[styles.show, selReady && styles.showReady, selCost === null && styles.showMaxed, { transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] }) }] }]}
            >
              <Text style={[styles.kicker, selReady && { color: EMBER }, selCost === null && { color: GOLD }]} numberOfLines={2} maxFontSizeMultiplier={1.1}>
                {kicker.toLocaleUpperCase()}
              </Text>
              <View style={styles.showTop}>
                <Badge info={selected} size={narrow ? 64 : 76} maxed={selCost === null} strike={strike} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.showName} numberOfLines={2} maxFontSizeMultiplier={1.15}>
                    {forgeText(t, selected.id, "name")}
                  </Text>
                  <Pips level={levelOf(stats, selected.id)} max={maxLevel(selected.id)} label={t("forge.level", { level: levelOf(stats, selected.id), max: maxLevel(selected.id) })} />
                </View>
              </View>
              <Text style={styles.desc} numberOfLines={3} maxFontSizeMultiplier={1.15}>
                {forgeText(t, selected.id, "desc")}
              </Text>
              <BuyButton info={selected} stats={stats} busy={busy} onBuy={buy} big />
              {!selReady && selCost !== null ? (
                <Text style={styles.missing} maxFontSizeMultiplier={1.15}>
                  {t("forge.missing", { count: selCost - stats.embers })} · {t("forge.tip.earn")}
                </Text>
              ) : null}
              <Burst run={strike} />
            </Animated.View>

            <View style={styles.gear}>
              <View style={styles.gearHead}>
                <Text style={styles.gearTitle} maxFontSizeMultiplier={1.1}>
                  {t("forge.eq.title").toLocaleUpperCase()}
                </Text>
                <Text style={styles.owned} maxFontSizeMultiplier={1.1}>
                  {owned}/{UPGRADES.length}
                </Text>
              </View>
              {gear.length === 0 ? (
                <Text style={styles.gearEmpty} maxFontSizeMultiplier={1.15}>
                  {t("forge.eq.empty")}
                </Text>
              ) : (
                <View style={styles.gearGrid}>
                  {gear.map(g => (
                    <View key={g.text} style={styles.gearChip}>
                      <Ionicons name={g.icon} size={14} color={EMBER} />
                      <Text style={styles.gearText} numberOfLines={2} maxFontSizeMultiplier={1.1}>
                        {g.text}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <PressScale onPress={() => setHowOpen(o => !o)} style={styles.how} accessibilityRole="button" accessibilityState={{ expanded: howOpen }} accessibilityLabel={t("forge.how.title")}>
              <View style={styles.howHead}>
                <Ionicons name="information-circle" size={16} color={EMBER} />
                <Text style={styles.howTitle} maxFontSizeMultiplier={1.1} numberOfLines={2}>
                  {howOpen ? t("forge.how.title") : t("forge.how.short")}
                </Text>
                <Ionicons name={howOpen ? "chevron-up" : "chevron-down"} size={16} color={EMBER} />
              </View>
              {howOpen
                ? ([
                    ["flame", "forge.how.earn"],
                    ["infinite", "forge.how.keep"],
                    ["flag", "forge.how.apply"],
                  ] as const).map(([icon, key]) => (
                    <View key={key} style={styles.howItem}>
                      <Ionicons name={icon} size={15} color={EMBER} />
                      <Text style={styles.howText} maxFontSizeMultiplier={1.15}>
                        {t(key)}
                      </Text>
                    </View>
                  ))
                : null}
              <Text style={styles.footer} maxFontSizeMultiplier={1.1}>
                {t("forge.dailyNote")}
              </Text>
            </PressScale>
          </ScrollView>

          <View style={styles.browse}>
            <View style={styles.filters} accessibilityRole="tablist">
              {FILTERS.map(f => {
                const on = filter === f;
                const count = readyIn(f);
                return (
                  <PressScale
                    key={f}
                    onPress={() => setFilter(f)}
                    hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${t(`forge.filter.${f}` as TranslationKey)}${count ? `, ${t("forge.ready", { count })}` : ""}`}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                      {t(`forge.filter.${f}` as TranslationKey)}
                    </Text>
                    {count > 0 && (
                      <View style={styles.chipBadge}>
                        <Text style={styles.chipBadgeText} allowFontScaling={false}>
                          {count}
                        </Text>
                      </View>
                    )}
                  </PressScale>
                );
              })}
              {ready > 0 && !narrow ? (
                <Text style={styles.readyNote} maxFontSizeMultiplier={1.1} numberOfLines={1}>
                  {t("forge.ready", { count: ready })}
                </Text>
              ) : null}
            </View>

            <View style={{ flex: 1 }} onLayout={e => setGridWidth(e.nativeEvent.layout.width)}>
              {gridWidth > 0 ? (
                <FlatList
                  key={`${columns}-${filter}`}
                  data={list}
                  numColumns={columns}
                  keyExtractor={u => u.id}
                  contentContainerStyle={{ gap: GAP, paddingBottom: 16 }}
                  columnWrapperStyle={columns > 1 ? { gap: GAP } : undefined}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item, index }) => (
                    <View style={{ width: tileWidth }}>
                      <Tile info={item} stats={stats} selected={item.id === selected.id} burst={burst && burst.id === item.id ? burst.run : 0} index={index} onPress={pick} />
                    </View>
                  )}
                />
              ) : null}
            </View>
          </View>
        </View>

        {toast && (
          <Animated.View style={[styles.toast, { opacity: toastFade, bottom: 16 + insets.bottom }]} pointerEvents="none" accessibilityLiveRegion="polite">
            <Ionicons name="checkmark-circle" size={20} color="#1a0f00" />
            <Text style={styles.toastText} maxFontSizeMultiplier={1.2}>
              {toast}
            </Text>
          </Animated.View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  error: { color: "#FF5252", fontWeight: "800", textAlign: "center" },
  allBought: { color: GOLD, fontWeight: "900", fontSize: 14, textAlign: "center" },

  body: { flex: 1, flexDirection: "row", gap: 12, paddingHorizontal: 12, paddingTop: 2 },
  bodyNarrow: { flexDirection: "column" },
  side: { width: "38%", maxWidth: 400, flexGrow: 0 },
  sideNarrow: { width: "100%", maxWidth: undefined, maxHeight: "55%" },
  sideContent: { gap: 8, paddingBottom: 8 },
  browse: { flex: 1, gap: 8 },

  show: { borderRadius: 20, borderWidth: 2, borderColor: "rgba(255,171,64,0.3)", backgroundColor: "rgba(36,28,19,0.92)", padding: 12, gap: 7, overflow: "hidden" },
  showReady: { borderColor: EMBER, backgroundColor: "rgba(255,171,64,0.12)", shadowColor: EMBER, shadowOpacity: 0.5, shadowRadius: 14, elevation: 8 },
  showMaxed: { borderColor: "rgba(255,213,79,0.55)", backgroundColor: "rgba(255,213,79,0.07)" },
  kicker: { color: "#E1D4C8", fontWeight: "900", letterSpacing: 1.6, fontSize: 10.5 },
  showTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  showName: { color: "#fff", fontWeight: "900", fontSize: 18 },
  desc: { color: "#E4D8CD", fontSize: 12.5, lineHeight: 17 },
  missing: { color: "#CAB39C", fontSize: 11.5, textAlign: "center" },

  gear: { borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(36,28,19,0.85)", padding: 10, gap: 6 },
  gearHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  gearTitle: { color: EMBER, fontWeight: "900", letterSpacing: 2, fontSize: 10.5 },
  owned: { color: "#B8997A", fontSize: 11.5, fontWeight: "800" },
  gearGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  gearChip: { flexBasis: "47%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 10, backgroundColor: "rgba(255,171,64,0.08)" },
  gearText: { color: "#F3EEEA", fontSize: 11.5, fontWeight: "700", flexShrink: 1 },
  gearEmpty: { color: "#CAB39C", fontSize: 12.5 },

  how: { borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,171,64,0.3)", backgroundColor: "rgba(255,171,64,0.06)", padding: 10, gap: 6 },
  howHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  howTitle: { color: EMBER, fontWeight: "900", fontSize: 11.5, flex: 1 },
  howItem: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  howText: { flex: 1, color: "#F2ECE6", fontSize: 12 },
  footer: { color: "#B8997A", fontSize: 11 },

  filters: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.05)" },
  chipOn: { backgroundColor: EMBER, borderColor: EMBER },
  chipText: { color: "#EAE1D8", fontWeight: "800", fontSize: 12.5 },
  chipTextOn: { color: "#1a0f00" },
  chipBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#FF5252", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  chipBadgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  readyNote: { color: EMBER, fontWeight: "800", fontSize: 12, marginLeft: 2, flexShrink: 1 },

  tile: { alignItems: "center", gap: 5, paddingTop: 10, paddingBottom: 8, paddingHorizontal: 6, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(36,28,19,0.88)", overflow: "hidden", minHeight: 150 },
  tileReady: { borderColor: EMBER, backgroundColor: "rgba(255,171,64,0.1)" },
  tileMaxed: { borderColor: "rgba(255,213,79,0.45)", backgroundColor: "rgba(255,213,79,0.06)" },
  tileSelected: { borderColor: "#FFE08A", borderWidth: 2.5, backgroundColor: "rgba(255,213,79,0.18)" },
  tileName: { color: "#fff", fontWeight: "800", fontSize: 12, textAlign: "center", lineHeight: 14, minHeight: 28 },
  tilePips: { flexDirection: "row", gap: 3 },
  tilePip: { width: 10, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.16)" },
  cost: { flexDirection: "row", alignItems: "center", gap: 3, minWidth: 56, justifyContent: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  costReady: { backgroundColor: EMBER, borderColor: EMBER },
  costMaxed: { backgroundColor: "rgba(255,213,79,0.12)", borderColor: "rgba(255,213,79,0.5)" },
  costText: { color: "#EAE1D8", fontWeight: "900", fontSize: 12 },

  toast: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "88%",
    backgroundColor: EMBER,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  toastText: { color: "#1a0f00", fontWeight: "900", fontSize: 14, flexShrink: 1 },
});

export default ForgeScreen;
