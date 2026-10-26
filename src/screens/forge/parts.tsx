import { MIN_TOUCH } from "../../ui/layout/useGameLayout";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, TouchableOpacity, View } from "react-native";
import Text from "../../ui/components/Text";
import { Ionicons } from "@expo/vector-icons";
import { UpgradeId, UpgradeInfo, canAfford, levelOf, maxLevel, nextCost } from "../../core/stats/forge";
import { RELIC_IMAGES } from "../../ui/relicImages";
import { FORGE_ICONS } from "../../ui/forgeArt";
import SpriteImage from "../../ui/components/SpriteImage";
import EmberIcon from "../../ui/components/EmberIcon";
import { LocalStats } from "../../core/stats/runStats";
import { useT } from "../../i18n/useT";
import { forgeText } from "../../i18n/keys";
import { useSettingsStore } from "../../state/settings/store";

export const EMBER = "#FFAB40";
export const GOLD = "#FFD54F";

/** The ember balance, with a small pop each time it changes (earning or spending feels like something). */
export const Balance: React.FC<{ value: number; label: string }> = ({ value, label }) => {
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
      <EmberIcon size={20} />
      <Text style={styles.balanceValue} maxFontSizeMultiplier={1.2}>
        {value}
      </Text>
    </Animated.View>
  );
};

/** A short burst of sparks from a card that was just bought. */
export const SPARKS = Array.from({ length: 10 }, (_, i) => ({ angle: (i / 10) * Math.PI * 2, dist: 34 + (i % 3) * 14 }));
export const Burst: React.FC<{ run: number }> = ({ run }) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run) return;
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [run, t]);
  if (!run) return null;
  return (
    <View style={styles.burst} pointerEvents="none">
      {SPARKS.map((s, i) => (
        <Animated.View
          key={i}
          style={[
            styles.spark,
            {
              opacity: t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(s.angle) * s.dist] }) },
                { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(s.angle) * s.dist - 10] }) },
                { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1.2, 0.2] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

/** The upgrade's picture: a relic's artwork, its own painted icon, or (as a last resort) its emoji. */
export const Badge: React.FC<{ info: UpgradeInfo; size: number; maxed: boolean }> = ({ info, size, maxed }) => {
  const art = (info.relic && RELIC_IMAGES[info.relic]) || FORGE_ICONS[info.id];
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }, maxed && styles.badgeMaxed]}>
      {art ? (
        <SpriteImage source={art} style={{ width: size * 0.72, height: size * 0.72 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : (
        <Text style={{ fontSize: size * 0.5 }}>{info.icon}</Text>
      )}
    </View>
  );
};

/** Pips with the next one pulsing, so "there is more to get" is visible without reading. */
export const Pips: React.FC<{ level: number; max: number; label: string }> = ({ level, max, label }) => (
  <View style={styles.pips} accessible accessibilityLabel={label}>
    {Array.from({ length: max }, (_, i) => (
      <View key={i} style={[styles.pip, i < level && styles.pipOn, i === level && styles.pipNext]} />
    ))}
  </View>
);

export type BuyProps = { info: UpgradeInfo; stats: LocalStats; busy: boolean; onBuy: (id: UpgradeId) => void; big?: boolean };

/** The buy button: gold and breathing when affordable, a fill bar showing how close you are when not. */
export const BuyButton: React.FC<BuyProps> = ({ info, stats, busy, onBuy, big }) => {
  const { t } = useT();
  const calm = useSettingsStore(s => s.reduceFlash);
  const cost = nextCost(stats, info.id);
  const affordable = canAfford(stats, info.id);
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!affordable || calm) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [affordable, calm, glow]);

  const name = forgeText(t, info.id, "name");
  if (cost === null) {
    return (
      <View style={[styles.cta, styles.ctaMaxed, big && styles.ctaBig]} accessible accessibilityLabel={t("forge.maxed")}>
        <Ionicons name="checkmark-circle" size={18} color={GOLD} />
        <Text style={styles.ctaMaxedText} maxFontSizeMultiplier={1.2}>
          {t("forge.maxed").toLocaleUpperCase()}
        </Text>
      </View>
    );
  }
  if (affordable) {
    return (
      <TouchableOpacity
        style={[styles.cta, styles.ctaBuy, big && styles.ctaBig]}
        onPress={() => onBuy(info.id)}
        disabled={busy}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${name}. ${t("forge.buy", { cost })}`}
      >
        <Animated.View pointerEvents="none" style={[styles.ctaGlow, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) }]} />
        <EmberIcon size={big ? 20 : 17} />
        <Text style={[styles.ctaBuyText, big && { fontSize: 18 }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {cost}   {t("forge.buyShort").toLocaleUpperCase()}
        </Text>
      </TouchableOpacity>
    );
  }
  const progress = Math.min(1, stats.embers / cost);
  return (
    <View style={[styles.cta, styles.ctaLocked, big && styles.ctaBig]} accessible accessibilityLabel={t("forge.needs", { cost })}>
      <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      <EmberIcon size={15} style={{ opacity: 0.85 }} />
      <Text style={styles.ctaLockedText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {stats.embers} / {cost}
      </Text>
    </View>
  );
};

export type CardProps = BuyProps & { columns: number; burst: number };

export const UpgradeCard = React.memo(({ info, stats, columns, busy, burst, onBuy }: CardProps) => {
  const { t } = useT();
  const level = levelOf(stats, info.id);
  const max = maxLevel(info.id);
  const cost = nextCost(stats, info.id);
  const affordable = canAfford(stats, info.id);
  const maxed = cost === null;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!burst) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.05, duration: 110, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [burst, scale]);

  return (
    <Animated.View style={[styles.card, { flex: 1 }, affordable && styles.cardAffordable, maxed && styles.cardMaxed, { transform: [{ scale }] }]}>
      <View style={styles.cardTop}>
        <Badge info={info} size={58} maxed={maxed} />
        <View style={styles.cardText}>
          <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {forgeText(t, info.id, "name")}
          </Text>
          <Text style={styles.desc} maxFontSizeMultiplier={1.2}>
            {forgeText(t, info.id, "desc")}
          </Text>
          <Pips level={level} max={max} label={t("forge.level", { level, max })} />
        </View>
      </View>
      <BuyButton info={info} stats={stats} busy={busy} onBuy={onBuy} />
      <Burst run={burst} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
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
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(20, 15, 40, 0.88)",
    padding: 12,
    gap: 10,
    overflow: "hidden",
  },
  cardAffordable: { borderColor: EMBER, backgroundColor: "rgba(255,171,64,0.1)" },
  cardMaxed: { borderColor: "rgba(255,213,79,0.5)", backgroundColor: "rgba(255,213,79,0.07)" },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  badge: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,171,64,0.14)",
    borderWidth: 2,
    borderColor: "rgba(255,171,64,0.55)",
  },
  badgeMaxed: { borderColor: GOLD, backgroundColor: "rgba(255,213,79,0.16)" },
  cardText: { flex: 1, gap: 3 },
  name: { color: "#fff", fontWeight: "900", fontSize: 17 },
  desc: { color: "#cfc9e8", fontSize: 13 },
  pips: { flexDirection: "row", gap: 6, marginTop: 3 },
  pip: { width: 22, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.16)" },
  pipOn: { backgroundColor: EMBER },
  pipNext: { borderWidth: 1.5, borderColor: "rgba(255,171,64,0.8)", backgroundColor: "transparent" },

  cta: { minHeight: MIN_TOUCH, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, overflow: "hidden" },
  ctaBig: { minHeight: 54, borderRadius: 18 },
  ctaBuy: { backgroundColor: EMBER, borderBottomWidth: 4, borderBottomColor: "rgba(0,0,0,0.3)" },
  ctaGlow: { ...StyleSheet.absoluteFill, backgroundColor: "#fff" },
  ctaBuyText: { color: "#1a0f00", fontWeight: "900", fontSize: 15, letterSpacing: 1 },
  ctaLocked: { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "rgba(255,171,64,0.28)" },
  ctaLockedText: { color: "#d8d2f0", fontWeight: "800", fontSize: 14 },
  ctaMaxed: { backgroundColor: "rgba(255,213,79,0.12)", borderWidth: 1, borderColor: "rgba(255,213,79,0.5)" },
  ctaMaxedText: { color: GOLD, fontWeight: "900", letterSpacing: 2, fontSize: 13 },

  burst: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  spark: { position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: GOLD, shadowColor: EMBER, shadowOpacity: 1, shadowRadius: 6 },

});
