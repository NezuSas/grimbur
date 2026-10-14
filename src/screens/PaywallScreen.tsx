import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ImageBackground, Linking, Pressable, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Text from "../ui/components/Text";
import ScreenHeader from "../ui/components/ScreenHeader";
import SpriteImage from "../ui/components/SpriteImage";
import { MIN_TOUCH, useGameLayout } from "../ui/layout/useGameLayout";
import { RootStackParamList } from "../navigation/types";
import { GAME_CONFIG } from "../config/gameConfig";
import { analytics } from "../services/analytics";
import { buyFullGame, getPurchaseProvider, loadProduct, monetizationConfig, restorePurchases, type ProductInfo } from "../services/entitlements";
import { useEntitlementsStore } from "../state/entitlements/store";
import { haptic, NotificationFeedbackType } from "../shared/haptics";
import { emitSound } from "../audio/audioEventBus";
import { useT } from "../i18n/useT";

type Props = NativeStackScreenProps<RootStackParamList, "PaywallScreen">;

const GOLD = "#F2C14E";

type Busy = "buying" | "restoring" | null;
type Notice = { tone: "info" | "error" | "ok"; text: string } | null;

/**
 * The offer for the one-time unlock. It is opened from the cover (endless), after the last free floor and from the
 * demo-complete card. Declining always leads back to the game: nothing here blocks the free part.
 */
export default function PaywallScreen({ navigation, route }: Props) {
  const { t } = useT();
  const { fontSize } = useGameLayout();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const source = route.params?.source ?? "cover";
  const cfg = monetizationConfig();
  const provider = getPurchaseProvider();
  const owned = useEntitlementsStore(s => s.fullUnlocked);

  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const mounted = useRef(true);
  const dismissed = useRef(false);

  useEffect(() => {
    mounted.current = true;
    analytics.track("paywall_view", { source });
    loadProduct().then(p => mounted.current && setProduct(p));
    return () => {
      mounted.current = false;
    };
  }, [source]);

  const leave = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("CoverScreen");
  }, [navigation]);

  const decline = useCallback(() => {
    if (!dismissed.current) {
      dismissed.current = true;
      analytics.track("paywall_dismiss", { source });
    }
    leave();
  }, [leave, source]);

  const onBuy = useCallback(async () => {
    if (busy) return;
    setBusy("buying");
    setNotice(null);
    analytics.track("paywall_purchase_started", { source });
    const outcome = await buyFullGame();
    if (!mounted.current) return;
    setBusy(null);
    if (outcome.status === "success") {
      analytics.track("paywall_purchase_succeeded", { source });
      haptic.notify(NotificationFeedbackType.Success);
      emitSound("LEVEL_UP");
      return;
    }
    analytics.track("paywall_purchase_failed", { source, reason: outcome.status });
    haptic.notify(NotificationFeedbackType.Warning);
    if (outcome.status === "cancelled") setNotice({ tone: "info", text: t("paywall.cancelled") });
    else if (outcome.status === "unavailable") setNotice({ tone: "info", text: t("paywall.unavailable") });
    else setNotice({ tone: "error", text: t("paywall.error") });
  }, [busy, source, t]);

  const onRestore = useCallback(async () => {
    if (busy) return;
    setBusy("restoring");
    setNotice(null);
    const outcome = await restorePurchases();
    if (!mounted.current) return;
    setBusy(null);
    analytics.track("paywall_restore", { source, result: outcome.status });
    if (outcome.status === "restored") {
      haptic.notify(NotificationFeedbackType.Success);
      setNotice({ tone: "ok", text: t("paywall.restored") });
    } else if (outcome.status === "nothing") setNotice({ tone: "info", text: t("paywall.nothingToRestore") });
    else if (outcome.status === "unavailable") setNotice({ tone: "info", text: t("paywall.unavailable") });
    else setNotice({ tone: "error", text: t("paywall.restoreError") });
  }, [busy, source, t]);

  const open = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const price = product?.price ?? cfg.fallbackPrice;
  const unavailable = !provider.available;
  const wide = width >= 640 && width > height;
  const short = height < 420;
  const contentWidth = Math.min(width - Math.max(insets.left, 12) - Math.max(insets.right, 12), 1000);
  const gap = short ? 8 : 12;
  const body = fontSize(14);
  const context =
    source === "floor" || source === "demo"
      ? t("paywall.context.floor", { floor: route.params?.floor ?? cfg.freeFloors })
      : source === "endless"
      ? t("paywall.context.endless")
      : null;

  const features: { icon: keyof typeof Ionicons.glyphMap; tint: string; text: string }[] = [
    { icon: "layers", tint: "#4FC3F7", text: t("paywall.feat.floors", { from: cfg.freeFloors + 1, to: GAME_CONFIG.expedition.floors }) },
    { icon: "skull", tint: "#FF7043", text: t("paywall.feat.wumpus") },
    { icon: "infinite", tint: "#B39DDB", text: t("paywall.feat.endless") },
    { icon: "heart", tint: "#F06292", text: t("paywall.feat.support") },
  ];

  const pitch = (
    <View style={[styles.card, styles.pitch, wide && { flex: 1 }, short && { padding: 12, gap: 8 }]}>
      <View style={styles.pitchHead}>
        {!short && (
          <View style={styles.medallion}>
            <SpriteImage source={require("../assets/sprites/enemies/Wumpus_Boss.png")} style={{ width: 62, height: 62 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.headline, { fontSize: Math.min(fontSize(24), 30) }]} numberOfLines={2} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
            {t("paywall.headline").toLocaleUpperCase()}
          </Text>
          <Text style={[styles.tagline, { fontSize: body }]} maxFontSizeMultiplier={1.2}>
            {context ?? t("paywall.tagline")}
          </Text>
        </View>
      </View>

      <View style={{ gap: short ? 6 : 9 }}>
        {features.map(f => (
          <View key={f.icon} style={styles.feature} accessible accessibilityLabel={f.text}>
            <View style={[styles.featureIcon, { borderColor: f.tint + "99", backgroundColor: f.tint + "22" }]}>
              <Ionicons name={f.icon} size={18} color={f.tint} />
            </View>
            <Text style={[styles.featureText, { fontSize: body }]} maxFontSizeMultiplier={1.2}>
              {f.text}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.free, { fontSize: Math.max(12, body - 2) }]} maxFontSizeMultiplier={1.2}>
        {t("paywall.free", { floors: cfg.freeFloors })}
      </Text>
    </View>
  );

  const success = (
    <View style={[styles.card, styles.buy, wide && { flex: 1 }, { borderColor: "#76FF03", alignItems: "center" }]} accessibilityLiveRegion="polite">
      <Ionicons name="checkmark-circle" size={short ? 40 : 56} color="#76FF03" />
      <Text style={styles.successTitle} accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
        {t("paywall.success.title").toLocaleUpperCase()}
      </Text>
      <Text style={[styles.successBody, { fontSize: body }]} maxFontSizeMultiplier={1.2}>
        {t("paywall.success.body")}
      </Text>
      <Pressable style={[styles.cta, { alignSelf: "stretch" }]} onPress={leave} accessibilityRole="button" accessibilityLabel={t("paywall.success.continue")}>
        <LinearGradient colors={["#F7D774", "#E8A93A"]} style={styles.ctaFill}>
          <Text style={styles.ctaText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.15}>
            {t("paywall.success.continue").toLocaleUpperCase()}
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  const noticeColor = notice?.tone === "error" ? "#FF8A80" : notice?.tone === "ok" ? "#9ee37d" : "#d9d3f0";

  const buy = (
    <View style={[styles.card, styles.buy, wide && { flex: 1 }, short && { padding: 12, gap: 8 }]}>
      <View style={styles.priceBlock} accessible accessibilityLabel={`${t("paywall.oneTime")}: ${price}`}>
        <Text style={styles.oneTime} maxFontSizeMultiplier={1.2}>
          {t("paywall.oneTime").toLocaleUpperCase()}
        </Text>
        <Text style={[styles.price, { fontSize: short ? 32 : 40 }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
          {price}
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.cta, (unavailable || busy) && { opacity: 0.55 }, pressed && { transform: [{ scale: 0.98 }] }]}
        onPress={onBuy}
        disabled={unavailable || !!busy}
        accessibilityRole="button"
        accessibilityState={{ disabled: unavailable || !!busy, busy: busy === "buying" }}
        accessibilityLabel={t("paywall.buy", { price })}
      >
        <LinearGradient colors={["#F7D774", "#E8A93A"]} style={styles.ctaFill}>
          {busy === "buying" ? <ActivityIndicator color="#1a1030" /> : <Ionicons name="lock-open" size={22} color="#1a1030" />}
          <Text style={styles.ctaText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.15}>
            {(busy === "buying" ? t("paywall.buying") : t("paywall.buyShort")).toLocaleUpperCase()}
          </Text>
        </LinearGradient>
      </Pressable>

      {unavailable && !notice ? (
        <Text style={[styles.notice, { color: "#FFCC80" }]} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.2}>
          {t("paywall.unavailable")}
        </Text>
      ) : null}
      {notice ? (
        <Text style={[styles.notice, { color: noticeColor }]} accessibilityLiveRegion="assertive" maxFontSizeMultiplier={1.2}>
          {notice.text}
        </Text>
      ) : null}

      <TouchableOpacity
        style={[styles.secondary, busy === "restoring" && { opacity: 0.7 }]}
        onPress={onRestore}
        disabled={!!busy}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityState={{ busy: busy === "restoring" }}
        accessibilityLabel={t("paywall.restore")}
      >
        {busy === "restoring" ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="refresh" size={18} color="#fff" />}
        <Text style={styles.secondaryText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.15}>
          {(busy === "restoring" ? t("paywall.restoring") : t("paywall.restore")).toLocaleUpperCase()}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.decline} onPress={decline} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t("paywall.noThanks")}>
        <Text style={styles.declineText} numberOfLines={2} maxFontSizeMultiplier={1.2}>
          {t("paywall.noThanks")}
        </Text>
      </TouchableOpacity>

      <Text style={styles.promise} maxFontSizeMultiplier={1.2}>
        {t("paywall.promise")}
      </Text>
    </View>
  );

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <SafeAreaView style={{ flex: 1, backgroundColor: "rgba(6,4,16,0.9)" }}>
        <ScreenHeader title={t("paywall.title")} onBack={decline} />
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", padding: gap, paddingBottom: gap + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: contentWidth, gap }}>
            <View style={[styles.columns, { gap }, !wide && { flexDirection: "column" }]}>
              {pitch}
              {owned ? success : buy}
            </View>

            <View style={styles.links} accessibilityLabel={t("a11y.paywallLinks")}>
              <TouchableOpacity style={styles.link} onPress={() => open(cfg.termsUrl)} accessibilityRole="link" accessibilityLabel={t("paywall.terms")}>
                <Text style={styles.linkText} maxFontSizeMultiplier={1.2}>
                  {t("paywall.terms")}
                </Text>
              </TouchableOpacity>
              <Text style={styles.linkDot}>·</Text>
              <TouchableOpacity style={styles.link} onPress={() => open(cfg.privacyUrl)} accessibilityRole="link" accessibilityLabel={t("paywall.privacy")}>
                <Text style={styles.linkText} maxFontSizeMultiplier={1.2}>
                  {t("paywall.privacy")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0E0B1F" },
  columns: { flexDirection: "row", alignItems: "stretch" },
  card: {
    backgroundColor: "rgba(16,12,30,0.92)",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(242,193,78,0.5)",
    padding: 16,
    gap: 12,
  },
  pitch: { justifyContent: "center" },
  pitchHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  medallion: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,170,60,0.16)",
    borderWidth: 2,
    borderColor: "rgba(242,193,78,0.7)",
  },
  headline: { color: GOLD, fontWeight: "900", letterSpacing: 2 },
  tagline: { color: "#e6e1fa", fontWeight: "700" },
  feature: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureIcon: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  featureText: { flex: 1, color: "#fff", fontWeight: "700" },
  free: { color: "#9fd8a8", fontWeight: "700" },
  buy: { justifyContent: "center", alignItems: "stretch" },
  priceBlock: { alignItems: "center" },
  oneTime: { color: "#9a9ab0", fontWeight: "900", fontSize: 12, letterSpacing: 2 },
  price: { color: "#FFD54F", fontWeight: "900" },
  cta: { borderRadius: 18, overflow: "hidden", borderBottomWidth: 4, borderBottomColor: "#B07A1C" },
  ctaFill: { minHeight: MIN_TOUCH + 8, flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  ctaText: { color: "#1a1030", fontWeight: "900", fontSize: 18, letterSpacing: 2, flexShrink: 1 },
  notice: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  secondary: {
    minHeight: MIN_TOUCH,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
  },
  secondaryText: { color: "#fff", fontWeight: "900", fontSize: 13, letterSpacing: 1, flexShrink: 1 },
  decline: { minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  declineText: { color: "#c9c3e6", fontWeight: "700", fontSize: 14, textDecorationLine: "underline", textAlign: "center" },
  promise: { color: "#8f8fa8", fontSize: 12, fontWeight: "600", textAlign: "center" },
  successTitle: { color: "#76FF03", fontWeight: "900", fontSize: 22, letterSpacing: 2, textAlign: "center" },
  successBody: { color: "#e6e1fa", fontWeight: "600", textAlign: "center" },
  links: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  link: { minHeight: MIN_TOUCH - 8, paddingHorizontal: 10, justifyContent: "center" },
  linkText: { color: "#a9a3c8", fontSize: 12, fontWeight: "700", textDecorationLine: "underline" },
  linkDot: { color: "#a9a3c8", fontSize: 12 },
});
