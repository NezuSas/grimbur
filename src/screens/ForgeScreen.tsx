import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, ImageBackground, Pressable, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
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
import { EMBER, GOLD, Balance, Burst, Badge, Pips, UpgradeCard, BuyButton } from "./forge/parts";

type Props = NativeStackScreenProps<RootStackParamList, "ForgeScreen">;


type Filter = "all" | UpgradeCategory;
const FILTERS: readonly Filter[] = ["all", "power", "economy", "relics"];

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
          emitSound("RELIC_PICKED");
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

  const usable = width - Math.max(insets.left, 8) - Math.max(insets.right, 8) - 16;
  const cardWidth = Math.min(usable, 1100);
  const columns = cardWidth >= 900 ? 3 : cardWidth >= 560 ? 2 : 1;
  const wide = cardWidth >= 720;

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
  const rows: UpgradeInfo[][] = [];
  for (let i = 0; i < list.length; i += columns) rows.push(list.slice(i, i + columns));
  const readyIn = (f: Filter) => UPGRADES.filter(u => (f === "all" || u.category === f) && canAfford(stats, u.id)).length;

  const featuredCost = featured ? nextCost(stats, featured.id) : null;
  const featuredReady = featured ? canAfford(stats, featured.id) : false;

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(6,4,16,0.88)" }}>
        <ScreenHeader
          title={t("forge.title")}
          subtitle={t("forge.hint")}
          onBack={() => navigation.goBack()}
          right={<Balance value={stats.embers} label={plural("forge.balance", stats.embers)} />}
        />

        <ScrollView
          style={{ alignSelf: "center", width: cardWidth }}
          contentContainerStyle={{ padding: 8, paddingBottom: 40 + insets.bottom, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="assertive">
              {t("forge.error")}
            </Text>
          ) : null}

          {/* Featured: the one thing to do right now */}
          {loaded && (featured || stats.embers >= 0) && (
            <View style={[styles.topRow, !wide && { flexDirection: "column" }]}>
              <View style={[styles.featured, featuredReady && styles.featuredReady, wide && { flex: 3 }]}>
                {featured ? (
                  <>
                    <Text style={[styles.featuredKicker, featuredReady && { color: EMBER }]} maxFontSizeMultiplier={1.2}>
                      {(featuredReady ? t("forge.featured.buy") : t("forge.featured.goal")).toLocaleUpperCase()}
                    </Text>
                    <View style={styles.featuredBody}>
                      <Badge info={featured} size={wide ? 84 : 68} maxed={false} />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={styles.featuredName} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                          {forgeText(t, featured.id, "name")}
                        </Text>
                        <Text style={styles.desc} maxFontSizeMultiplier={1.2}>
                          {forgeText(t, featured.id, "desc")}
                        </Text>
                        <Pips level={levelOf(stats, featured.id)} max={maxLevel(featured.id)} label={t("forge.level", { level: levelOf(stats, featured.id), max: maxLevel(featured.id) })} />
                      </View>
                    </View>
                    <BuyButton info={featured} stats={stats} busy={busy} onBuy={buy} big />
                    {!featuredReady && featuredCost !== null && (
                      <Text style={styles.missing} maxFontSizeMultiplier={1.2}>
                        {t("forge.missing", { count: featuredCost - stats.embers })} · {t("forge.tip.earn")}
                      </Text>
                    )}
                    <Burst run={burst && burst.id === featured.id ? burst.run : 0} />
                  </>
                ) : (
                  <Text style={styles.featuredAll} maxFontSizeMultiplier={1.2}>
                    {t("forge.allBought")}
                  </Text>
                )}
              </View>

              <View style={[styles.gear, wide && { flex: 2 }]}>
                <Text style={styles.gearTitle} maxFontSizeMultiplier={1.2}>
                  {t("forge.eq.title").toLocaleUpperCase()}
                </Text>
                {gear.length === 0 ? (
                  <Text style={styles.gearEmpty} maxFontSizeMultiplier={1.2}>
                    {t("forge.eq.empty")}
                  </Text>
                ) : (
                  gear.map(g => (
                    <View key={g.text} style={styles.gearRow}>
                      <Ionicons name={g.icon} size={16} color={EMBER} />
                      <Text style={styles.gearText} maxFontSizeMultiplier={1.2}>
                        {g.text}
                      </Text>
                    </View>
                  ))
                )}
                <Text style={styles.owned} maxFontSizeMultiplier={1.2}>
                  {t("forge.owned", { owned, total: UPGRADES.length })}
                </Text>
              </View>
            </View>
          )}

          {/* How it works: open the first time, one line afterwards */}
          <Pressable onPress={() => setHowOpen(o => !o)} style={styles.how} accessibilityRole="button" accessibilityState={{ expanded: howOpen }} accessibilityLabel={t("forge.how.title")}>
            <View style={styles.howHead}>
              <Ionicons name="information-circle" size={18} color={EMBER} />
              <Text style={styles.howTitle} maxFontSizeMultiplier={1.2} numberOfLines={1}>
                {howOpen ? t("forge.how.title").toLocaleUpperCase() : t("forge.how.short")}
              </Text>
              <Ionicons name={howOpen ? "chevron-up" : "chevron-down"} size={18} color={EMBER} />
            </View>
            {howOpen && (
              <View style={[styles.howRow, columns === 1 && { flexDirection: "column" }]}>
                {([
                  ["flame", "forge.how.earn"],
                  ["infinite", "forge.how.keep"],
                  ["flag", "forge.how.apply"],
                ] as const).map(([icon, key]) => (
                  <View key={key} style={styles.howItem}>
                    <Ionicons name={icon} size={20} color={EMBER} />
                    <Text style={styles.howText} maxFontSizeMultiplier={1.2}>
                      {t(key)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Pressable>

          {/* Filters */}
          <View style={styles.filters} accessibilityRole="tablist">
            {FILTERS.map(f => {
              const on = filter === f;
              const count = readyIn(f);
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${t(`forge.filter.${f}` as TranslationKey)}${count ? `, ${t("forge.ready", { count })}` : ""}`}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                    {t(`forge.filter.${f}` as TranslationKey)}
                  </Text>
                  {count > 0 && (
                    <View style={styles.chipBadge}>
                      <Text style={styles.chipBadgeText} allowFontScaling={false}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            {ready > 0 && (
              <Text style={styles.readyNote} maxFontSizeMultiplier={1.2} numberOfLines={1}>
                {t("forge.ready", { count: ready })}
              </Text>
            )}
          </View>

          {rows.map((row, r) => (
            <View key={r} style={styles.sectionRow}>
              {row.map(item => (
                <UpgradeCard key={item.id} info={item} stats={stats} columns={columns} busy={busy} burst={burst && burst.id === item.id ? burst.run : 0} onBuy={buy} />
              ))}
              {row.length < columns && Array.from({ length: columns - row.length }, (_, k) => <View key={`pad${k}`} style={{ flex: 1 }} />)}
            </View>
          ))}

          <Text style={styles.footer} maxFontSizeMultiplier={1.2}>
            {t("forge.dailyNote")}
          </Text>
        </ScrollView>

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
  footer: { color: "#8f8aa8", fontSize: 12, textAlign: "center", marginTop: 6 },

  topRow: { flexDirection: "row", gap: 12 },
  featured: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,171,64,0.35)",
    backgroundColor: "rgba(30,20,50,0.92)",
    padding: 14,
    gap: 10,
    overflow: "hidden",
  },
  featuredReady: { borderColor: EMBER, backgroundColor: "rgba(255,171,64,0.12)", shadowColor: EMBER, shadowOpacity: 0.5, shadowRadius: 14, elevation: 8 },
  featuredKicker: { color: "#c9c3e6", fontWeight: "900", letterSpacing: 2, fontSize: 11 },
  featuredBody: { flexDirection: "row", gap: 14, alignItems: "center" },
  featuredName: { color: "#fff", fontWeight: "900", fontSize: 22 },
  featuredAll: { color: GOLD, fontWeight: "900", fontSize: 16, textAlign: "center", paddingVertical: 16 },
  missing: { color: "#a8a2c4", fontSize: 12, textAlign: "center" },

  gear: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(20,15,40,0.88)",
    padding: 14,
    gap: 6,
  },
  gearTitle: { color: EMBER, fontWeight: "900", letterSpacing: 2, fontSize: 11 },
  gearRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  gearText: { color: "#e8e3fa", fontSize: 13, fontWeight: "700", flexShrink: 1 },
  gearEmpty: { color: "#a8a2c4", fontSize: 13 },
  owned: { color: "#8f8aa8", fontSize: 12, fontWeight: "700", marginTop: 2 },

  how: { borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,171,64,0.3)", backgroundColor: "rgba(255,171,64,0.06)", padding: 10, gap: 8 },
  howHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  howTitle: { color: EMBER, fontWeight: "900", letterSpacing: 1, fontSize: 12, flex: 1 },
  howRow: { flexDirection: "row", gap: 12 },
  howItem: { flex: 1, flexDirection: "row", gap: 8, alignItems: "flex-start" },
  howText: { flex: 1, color: "#e4defa", fontSize: 12.5 },

  filters: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  chipOn: { backgroundColor: EMBER, borderColor: EMBER },
  chipText: { color: "#d8d2f0", fontWeight: "800", fontSize: 13 },
  chipTextOn: { color: "#1a0f00" },
  chipBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#FF5252", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  chipBadgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  readyNote: { color: EMBER, fontWeight: "800", fontSize: 12, marginLeft: 4, flexShrink: 1 },

  sectionRow: { flexDirection: "row", gap: 10 },
  desc: { color: "#cfc9e8", fontSize: 13 },
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
