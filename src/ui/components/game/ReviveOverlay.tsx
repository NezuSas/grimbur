import React, { useEffect, useRef } from "react";
import { Animated, Easing, ImageBackground, StyleSheet, View, useWindowDimensions } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Text from "../Text";
import EmberIcon from "../EmberIcon";
import SpriteImage from "../SpriteImage";
import OverlayContainer from "./OverlayContainer";
import { PopButton, PopLink } from "./popup";
import { useT } from "../../../i18n/useT";
import { useSettingsStore } from "../../../state/settings/store";
import { REVIVE_ARROWS } from "../../../core/engine/revive";

type Props = {
  visible: boolean;
  price: number;
  embers: number;
  /** Revives already used in this run. */
  used: number;
  busy: boolean;
  /** The fallen hero (its defeat pose). */
  hero?: ImageSourcePropType;
  onRevive: () => void;
  onDecline: () => void;
};

const FIRE = "#FF9A3C";
const PHOENIX = require("../../../assets/sprites/relics/phoenix.png");
const GIFTS: { key: string; art: ImageSourcePropType; text: "revive.gift.back" | "revive.gift.shield" | "revive.gift.arrows" }[] = [
  { key: "back", art: require("../../../assets/sprites/tools/Tool_Undo.png"), text: "revive.gift.back" },
  { key: "shield", art: require("../../../assets/sprites/items/Icon_Shield.png"), text: "revive.gift.shield" },
  { key: "arrows", art: require("../../../assets/sprites/items/Icon_Arrows.png"), text: "revive.gift.arrows" },
];

/**
 * The second chance, right after the hero falls: the fallen hero with a phoenix feather rising over them on the left; on
 * the right what coming back gives, the price in embers on the big button and a quiet way out.
 */
const ReviveOverlay = ({ visible, price, embers, used, busy, hero, onRevive, onDecline }: Props) => {
  const { t } = useT();
  const { width, height } = useWindowDimensions();
  const calm = useSettingsStore(s => s.reduceFlash);
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible || calm) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rise, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(rise, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, calm, rise]);
  if (!visible) return null;

  const cardW = Math.min(width * 0.94, 720);
  const stacked = cardW < 520;
  const art = Math.min(height * 0.4, 170);

  return (
    <OverlayContainer>
      <View style={[styles.card, { width: cardW }, stacked && { flexDirection: "column" }]}>
        <ImageBackground source={require("../../../assets/sprites/backgrounds/Cover_Background.png")} style={StyleSheet.absoluteFill} resizeMode="cover" imageStyle={{ opacity: 0.25 }} />
        <LinearGradient colors={["rgba(60,30,12,0.85)", "rgba(18,11,6,0.97)"]} style={StyleSheet.absoluteFill} pointerEvents="none" />

        {/* ── The fallen hero, and the feather that can lift them ───────────── */}
        <View style={[styles.left, stacked && { width: "100%" }]}>
          <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>{t("revive.kicker").toLocaleUpperCase()}</Text>
          <Text style={styles.title} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.15}>
            {t("revive.title").toLocaleUpperCase()}
          </Text>
          <View style={{ width: art * 1.3, height: art, alignItems: "center", justifyContent: "flex-end" }}>
            {[1, 0.75, 0.5].map(k => (
              <View key={k} style={[styles.glow, { width: art * k, height: art * k, borderRadius: art, top: (art * (1 - k)) / 2 }]} />
            ))}
            <Animated.View
              style={[
                styles.feather,
                { opacity: rise.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }), transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }, { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] },
              ]}
            >
              <SpriteImage source={PHOENIX} style={{ width: art * 0.42, height: art * 0.42 }} resizeMode="contain" />
            </Animated.View>
            {hero ? <SpriteImage source={hero} style={{ width: art * 1.25, height: art * 0.9 }} resizeMode="contain" /> : null}
          </View>
        </View>

        {/* ── What coming back gives, and the choice ────────────────────────── */}
        <View style={[styles.right, stacked && { width: "100%" }]}>
          <View style={styles.gifts}>
            {GIFTS.map(g => (
              <View key={g.key} style={styles.gift}>
                <SpriteImage source={g.art} style={styles.giftArt} resizeMode="contain" />
                <Text style={styles.giftText} numberOfLines={2} maxFontSizeMultiplier={1.1}>
                  {t(g.text, { n: REVIVE_ARROWS })}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.body} numberOfLines={2} maxFontSizeMultiplier={1.15}>
            {t("revive.marked")}
          </Text>
          <PopButton
            label={
              price === 0 ? (
                `${t("revive.cta").toLocaleUpperCase()}  ·  ${t("revive.free").toLocaleUpperCase()}`
              ) : (
                <>{`${t("revive.cta").toLocaleUpperCase()}  ·  `}<EmberIcon size={16} /> {price}</>
              )
            }
            icon="heart"
            tint={FIRE}
            busy={busy}
            onPress={onRevive}
            accessibilityLabel={`${t("revive.cta")}: ${price}`}
          />
          <View style={styles.metaRow}>
            <EmberIcon size={13} />
            <Text style={styles.meta} maxFontSizeMultiplier={1.15}>
              {t("revive.balance", { n: embers })}
              {used > 0 ? `  ·  ${t("revive.used", { n: used })}` : ""}
            </Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <PopLink label={t("revive.decline")} onPress={onDecline} disabled={busy} />
          </View>
        </View>
      </View>
    </OverlayContainer>
  );
};

export default ReviveOverlay;

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 26, borderWidth: 2.5, borderColor: FIRE + "B3", overflow: "hidden", shadowColor: FIRE, shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 18 },
  left: { flex: 1, alignItems: "center", gap: 2 },
  right: { flex: 1.15, gap: 8, alignItems: "stretch" },
  kicker: { color: FIRE, fontWeight: "900", fontSize: 12, letterSpacing: 2.5 },
  title: { color: "#fff", fontWeight: "900", fontSize: 22, letterSpacing: 1.5, textAlign: "center", textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  glow: { position: "absolute", backgroundColor: FIRE, opacity: 0.07 },
  feather: { position: "absolute", top: 0, zIndex: 2 },
  gifts: { flexDirection: "row", gap: 8 },
  gift: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,154,60,0.35)", backgroundColor: "rgba(0,0,0,0.35)" },
  giftArt: { width: 34, height: 34 },
  giftText: { color: "#F1E4D6", fontSize: 11.5, fontWeight: "800", textAlign: "center" },
  body: { color: "#CAB39C", fontSize: 12, fontWeight: "600", textAlign: "center" },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  meta: { color: "#C2A88F", fontSize: 12.5, fontWeight: "700" },
});
