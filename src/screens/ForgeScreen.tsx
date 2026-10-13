import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, ImageBackground, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Text from "../ui/components/Text";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "../navigation/types";
import { MIN_TOUCH, useGameLayout } from "../ui/layout/useGameLayout";
import { UPGRADES, UPGRADE_CATEGORIES, UpgradeId, UpgradeInfo, canAfford, levelOf, maxLevel, nextCost } from "../core/stats/forge";
import { RELIC_IMAGES } from "../ui/relicImages";
import SpriteImage from "../ui/components/SpriteImage";
import type { TranslationKey } from "../i18n/en";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { buyUpgrade, getLocalStats } from "../services/localStats";
import { haptic, NotificationFeedbackType } from "../shared/haptics";
import { emitSound } from "../audio/audioEventBus";
import { useT } from "../i18n/useT";
import { forgeText } from "../i18n/keys";
import ScreenHeader from "../ui/components/ScreenHeader";

type Props = NativeStackScreenProps<RootStackParamList, "ForgeScreen">;

const EMBER = "#FFAB40";

/** The ember balance, with a small pop each time it changes (earning or spending feels like something). */
const Balance: React.FC<{ value: number; label: string }> = ({ value, label }) => {
  const pop = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    Animated.sequence([
      Animated.timing(pop, { toValue: 1.25, duration: 120, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [value, pop]);

  return (
    <Animated.View style={[styles.balance, { transform: [{ scale: pop }] }]} accessible accessibilityLiveRegion="polite" accessibilityLabel={label}>
      <Text style={styles.balanceFlame}>🔥</Text>
      <Text style={styles.balanceValue} maxFontSizeMultiplier={1.2}>
        {value}
      </Text>
    </Animated.View>
  );
};

type CardProps = {
  info: UpgradeInfo;
  stats: LocalStats;
  columns: number;
  busy: boolean;
  justBought: boolean;
  onBuy: (id: UpgradeId) => void;
};

const UpgradeCard = React.memo(({ info, stats, columns, busy, justBought, onBuy }: CardProps) => {
  const { t } = useT();
  const level = levelOf(stats, info.id);
  const max = maxLevel(info.id);
  const cost = nextCost(stats, info.id);
  const affordable = canAfford(stats, info.id);
  const maxed = cost === null;
  const name = forgeText(t, info.id, "name");
  const description = forgeText(t, info.id, "desc");
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!justBought) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.04, duration: 110, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [justBought, scale]);

  const progress = cost ? Math.min(1, stats.embers / cost) : 1;

  return (
    <Animated.View
      style={[
        styles.card,
        columns > 1 && { flex: 1 },
        affordable && styles.cardAffordable,
        maxed && styles.cardMaxed,
        { transform: [{ scale }] },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.badge, maxed && styles.badgeMaxed]}>
          {info.relic ? (
            <SpriteImage source={RELIC_IMAGES[info.relic]} style={styles.badgeImage} resizeMode="contain" accessibilityIgnoresInvertColors />
          ) : (
            <Text style={styles.badgeIcon}>{info.icon}</Text>
          )}
        </View>
        <View style={styles.cardText}>
          <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {name}
          </Text>
          <Text style={styles.desc} maxFontSizeMultiplier={1.2}>
            {description}
          </Text>
          <View style={styles.pips} accessible accessibilityLabel={t("forge.level", { level, max })}>
            {Array.from({ length: max }, (_, i) => (
              <View key={i} style={[styles.pip, i < level && styles.pipOn]} />
            ))}
          </View>
        </View>
      </View>

      {maxed ? (
        <View style={[styles.cta, styles.ctaMaxed]} accessible accessibilityLabel={t("forge.maxed")}>
          <Ionicons name="checkmark-circle" size={18} color="#FFD54F" />
          <Text style={styles.ctaMaxedText} maxFontSizeMultiplier={1.2}>
            {t("forge.maxed").toLocaleUpperCase()}
          </Text>
        </View>
      ) : affordable ? (
        <TouchableOpacity
          style={[styles.cta, styles.ctaBuy]}
          onPress={() => onBuy(info.id)}
          disabled={busy}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${name}. ${t("forge.buy", { cost: cost as number })}`}
        >
          <Text style={styles.ctaBuyText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            🔥 {cost}   {t("forge.buyShort").toLocaleUpperCase()}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.cta, styles.ctaLocked]} accessible accessibilityLabel={t("forge.needs", { cost: cost as number })}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
          <Text style={styles.ctaLockedText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            🔥 {stats.embers} / {cost}
          </Text>
        </View>
      )}
    </Animated.View>
  );
});

const ForgeScreen: React.FC<Props> = ({ navigation }) => {
  const { t, plural } = useT();
  const { width } = useWindowDimensions();
  const { insets } = useGameLayout();
  const [stats, setStats] = useState<LocalStats>(EMPTY_STATS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [bought, setBought] = useState<UpgradeId | null>(null);

  useFocusEffect(
    useCallback(() => {
      getLocalStats().then(setStats).catch(() => {});
    }, []),
  );

  const buy = useCallback(
    async (id: UpgradeId) => {
      if (busy) return;
      setBusy(true);
      setError(false);
      try {
        const next = await buyUpgrade(id);
        if (next) {
          setStats(next);
          setBought(id);
          emitSound("RELIC_PICKED");
          haptic.notify(NotificationFeedbackType.Success);
          setTimeout(() => setBought(current => (current === id ? null : current)), 600);
        }
      } catch {
        setError(true);
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  const usable = width - Math.max(insets.left, 8) - Math.max(insets.right, 8) - 16;
  const cardWidth = Math.min(usable, 1100);
  const columns = cardWidth >= 900 ? 3 : cardWidth >= 560 ? 2 : 1;

  // What to save up for: the cheapest upgrade that is not bought yet and not affordable.
  const goal = UPGRADES.filter(u => nextCost(stats, u.id) !== null && !canAfford(stats, u.id)).sort(
    (a, b) => (nextCost(stats, a.id) as number) - (nextCost(stats, b.id) as number),
  )[0];

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
          contentContainerStyle={{ padding: 8, paddingBottom: 24 + insets.bottom, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="assertive">
              {t("forge.error")}
            </Text>
          ) : goal ? (
            <Text style={styles.goal} maxFontSizeMultiplier={1.2}>
              {t("forge.goal", { name: forgeText(t, goal.id, "name"), missing: (nextCost(stats, goal.id) as number) - stats.embers })}
            </Text>
          ) : null}

          {UPGRADE_CATEGORIES.map(category => {
            const items = UPGRADES.filter(u => u.category === category);
            const rows: UpgradeInfo[][] = [];
            for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
            return (
              <View key={category} style={{ gap: 10 }}>
                <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
                  {t(`forge.cat.${category}` as TranslationKey).toLocaleUpperCase()}
                </Text>
                {category === "relics" && (
                  <Text style={styles.sectionHint} maxFontSizeMultiplier={1.2}>
                    {t("forge.cat.relics.hint")}
                  </Text>
                )}
                {rows.map((row, r) => (
                  <View key={r} style={styles.sectionRow}>
                    {row.map(item => (
                      <UpgradeCard key={item.id} info={item} stats={stats} columns={columns} busy={busy} justBought={bought === item.id} onBuy={buy} />
                    ))}
                    {row.length < columns && Array.from({ length: columns - row.length }, (_, k) => <View key={`pad${k}`} style={{ flex: 1 }} />)}
                  </View>
                ))}
              </View>
            );
          })}

          <Text style={styles.footer} maxFontSizeMultiplier={1.2}>
            {t("forge.dailyNote")}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  balance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: "rgba(255,171,64,0.16)",
    borderWidth: 1.5,
    borderColor: "rgba(255,171,64,0.7)",
  },
  balanceFlame: { fontSize: 20 },
  balanceValue: { color: EMBER, fontSize: 20, fontWeight: "900" },
  goal: { color: "#c9c3e6", fontSize: 13, fontWeight: "700", textAlign: "center", marginBottom: 2 },
  error: { color: "#FF5252", fontWeight: "800", textAlign: "center", marginBottom: 2 },
  footer: { color: "#8f8aa8", fontSize: 12, textAlign: "center", marginTop: 6 },
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(20, 15, 40, 0.88)",
    padding: 12,
    gap: 10,
  },
  cardAffordable: { borderColor: EMBER, backgroundColor: "rgba(255,171,64,0.1)" },
  cardMaxed: { borderColor: "rgba(255,213,79,0.5)", backgroundColor: "rgba(255,213,79,0.07)" },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  badge: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,171,64,0.14)",
    borderWidth: 2,
    borderColor: "rgba(255,171,64,0.55)",
  },
  badgeMaxed: { borderColor: "#FFD54F", backgroundColor: "rgba(255,213,79,0.16)" },
  badgeIcon: { fontSize: 32 },
  badgeImage: { width: 46, height: 46 },
  sectionTitle: { color: "#F2C14E", fontWeight: "900", letterSpacing: 2, fontSize: 14, marginTop: 6 },
  sectionHint: { color: "#a8a2c4", fontSize: 12, marginBottom: 2 },
  sectionRow: { flexDirection: "row", gap: 10 },
  cardText: { flex: 1, gap: 3 },
  name: { color: "#fff", fontWeight: "900", fontSize: 17 },
  desc: { color: "#cfc9e8", fontSize: 13 },
  pips: { flexDirection: "row", gap: 6, marginTop: 3 },
  pip: { width: 22, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.16)" },
  pipOn: { backgroundColor: EMBER },
  cta: {
    minHeight: MIN_TOUCH,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    overflow: "hidden",
  },
  ctaBuy: { backgroundColor: EMBER, borderBottomWidth: 4, borderBottomColor: "rgba(0,0,0,0.3)" },
  ctaBuyText: { color: "#1a0f00", fontWeight: "900", fontSize: 15, letterSpacing: 1 },
  ctaLocked: { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "rgba(255,171,64,0.28)" },
  ctaLockedText: { color: "#d8d2f0", fontWeight: "800", fontSize: 14 },
  ctaMaxed: { backgroundColor: "rgba(255,213,79,0.12)", borderWidth: 1, borderColor: "rgba(255,213,79,0.5)" },
  ctaMaxedText: { color: "#FFD54F", fontWeight: "900", letterSpacing: 2, fontSize: 13 },
});

export default ForgeScreen;
