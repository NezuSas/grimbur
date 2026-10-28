import { MIN_TOUCH } from "../../ui/layout/useGameLayout";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
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
import { useRollTo } from "../../ui/useRollTo";
import { Burst } from "../../ui/components/Burst";

/** The anvil sparks now live with the shared UI (the board throws gems with them); the Forge keeps its import. */
export { Burst, SPARKS } from "../../ui/components/Burst";

export const EMBER = "#FFAB40";
export const GOLD = "#FFD54F";

/** The ember balance: the number rolls to its new value and the chip pops, so paying feels like paying. */
export const Balance: React.FC<{ value: number; label: string }> = ({ value, label }) => {
  const calm = useSettingsStore(s => s.reduceFlash);
  const pop = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  const shown = useRollTo(value, calm);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (calm) return;
    Animated.sequence([
      Animated.timing(pop, { toValue: 1.25, duration: 120, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [value, pop, calm]);

  return (
    <Animated.View style={[styles.balance, { transform: [{ scale: pop }] }]} accessible accessibilityLiveRegion="polite" accessibilityLabel={label}>
      <EmberIcon size={20} />
      <Text style={styles.balanceValue} maxFontSizeMultiplier={1.2}>
        {shown}
      </Text>
    </Animated.View>
  );
};

/** A block that rises and fades in after `delay` ms, so the screen builds itself instead of appearing (instant when calm). */
export const Rise: React.FC<{ delay?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }> = ({ delay = 0, style, children }) => {
  const calm = useSettingsStore(s => s.reduceFlash);
  const v = useRef(new Animated.Value(calm ? 1 : 0)).current;
  useEffect(() => {
    if (calm) {
      v.setValue(1);
      return;
    }
    Animated.timing(v, { toValue: 1, duration: 320, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [calm, delay, v]);
  return (
    <Animated.View style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
};

/**
 * The upgrade's picture: a relic's artwork, its own painted icon, or (as a last resort) its emoji.
 * `strike` (a purchase timestamp) lands the hammer: a quick squash, a wobbling rebound and an impact ring.
 */
export const Badge: React.FC<{ info: UpgradeInfo; size: number; maxed: boolean; strike?: number }> = ({ info, size, maxed, strike = 0 }) => {
  const calm = useSettingsStore(s => s.reduceFlash);
  const art = (info.relic && RELIC_IMAGES[info.relic]) || FORGE_ICONS[info.id];
  const hit = useRef(new Animated.Value(2)).current; // 0→1 squash, 1→2 rebound; resting at 2 (scale 1)
  const ring = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!strike || calm) return;
    hit.setValue(0);
    ring.setValue(0);
    Animated.sequence([
      Animated.timing(hit, { toValue: 1, duration: 70, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.spring(hit, { toValue: 2, friction: 3.2, tension: 160, useNativeDriver: true }),
    ]).start();
    Animated.timing(ring, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [strike, calm, hit, ring]);
  const scale = hit.interpolate({ inputRange: [0, 1, 1.4, 2], outputRange: [1, 0.82, 1.14, 1] });
  const rotate = hit.interpolate({ inputRange: [0, 1, 1.5, 2], outputRange: ["0deg", "-7deg", "4deg", "0deg"] });
  return (
    <Animated.View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, transform: [{ scale }, { rotate }] }, maxed && styles.badgeMaxed]}>
      {art ? (
        <SpriteImage source={art} style={{ width: size * 0.72, height: size * 0.72 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : (
        <Text style={{ fontSize: size * 0.5 }}>{info.icon}</Text>
      )}
      {strike && !calm ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              opacity: ring.interpolate({ inputRange: [0, 0.08, 1], outputRange: [0, 0.9, 0] }),
              transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.7] }) }],
            },
          ]}
        />
      ) : null}
    </Animated.View>
  );
};

/** Pips with the next one pulsing; a pip that just lit up pops in, so "level up" is visible without reading. */
export const Pips: React.FC<{ level: number; max: number; label: string }> = ({ level, max, label }) => {
  const calm = useSettingsStore(s => s.reduceFlash);
  const prev = useRef(level);
  const pop = useRef(new Animated.Value(1)).current;
  const [lit, setLit] = useState(-1);
  useEffect(() => {
    if (level > prev.current && !calm) {
      setLit(level - 1);
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, friction: 3.5, tension: 140, useNativeDriver: true }).start();
    }
    prev.current = level;
  }, [level, calm, pop]);
  return (
    <View style={styles.pips} accessible accessibilityLabel={label}>
      {Array.from({ length: max }, (_, i) =>
        i === lit ? (
          <Animated.View key={i} style={[styles.pip, styles.pipOn, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]} />
        ) : (
          <View key={i} style={[styles.pip, i < level && styles.pipOn, i === level && styles.pipNext]} />
        ),
      )}
    </View>
  );
};

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
        <Badge info={info} size={54} maxed={maxed} strike={burst} />
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
  balanceValue: { color: EMBER, fontSize: 20, fontWeight: "900" },
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(20, 15, 40, 0.88)",
    padding: 10,
    gap: 8,
    overflow: "hidden",
  },
  cardAffordable: { borderColor: EMBER, backgroundColor: "rgba(255,171,64,0.1)" },
  cardMaxed: { borderColor: "rgba(255,213,79,0.5)", backgroundColor: "rgba(255,213,79,0.07)" },
  // flex: 1 so a short description grows to match its row's tallest card and every buy button sits on the same line.
  cardTop: { flexDirection: "row", gap: 12, alignItems: "center", flex: 1 },
  badge: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,171,64,0.14)",
    borderWidth: 2,
    borderColor: "rgba(255,171,64,0.55)",
  },
  badgeMaxed: { borderColor: GOLD, backgroundColor: "rgba(255,213,79,0.16)" },
  cardText: { flex: 1, gap: 3 },
  name: { color: "#fff", fontWeight: "900", fontSize: 16 },
  desc: { color: "#cfc9e8", fontSize: 12.5, lineHeight: 17 },
  pips: { flexDirection: "row", gap: 5, marginTop: 3 },
  pip: { width: 20, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.16)" },
  pipOn: { backgroundColor: EMBER },
  pipNext: { borderWidth: 1.5, borderColor: "rgba(255,171,64,0.8)", backgroundColor: "transparent" },

  cta: { minHeight: MIN_TOUCH, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, overflow: "hidden" },
  ctaBig: { minHeight: 50, borderRadius: 16 },
  ctaBuy: { backgroundColor: EMBER, borderBottomWidth: 4, borderBottomColor: "rgba(0,0,0,0.3)" },
  ctaGlow: { ...StyleSheet.absoluteFill, backgroundColor: "#fff" },
  ctaBuyText: { color: "#1a0f00", fontWeight: "900", fontSize: 15, letterSpacing: 1 },
  ctaLocked: { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "rgba(255,171,64,0.28)" },
  ctaLockedText: { color: "#d8d2f0", fontWeight: "800", fontSize: 14 },
  ctaMaxed: { backgroundColor: "rgba(255,213,79,0.12)", borderWidth: 1, borderColor: "rgba(255,213,79,0.5)" },
  ctaMaxedText: { color: GOLD, fontWeight: "900", letterSpacing: 2, fontSize: 13 },

  ring: { position: "absolute", borderWidth: 3, borderColor: "#FFF3D6" },
});
