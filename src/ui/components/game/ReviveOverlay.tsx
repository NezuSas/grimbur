import React from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Text from "../Text";
import OverlayContainer from "./OverlayContainer";
import { MIN_TOUCH } from "../../layout/useGameLayout";
import { useT } from "../../../i18n/useT";

type Props = {
  visible: boolean;
  price: number;
  embers: number;
  /** Revives still available in this run (this one included). */
  left: number;
  busy: boolean;
  onRevive: () => void;
  onDecline: () => void;
};

/** The second chance: come back from a death for embers. It appears right after the hero falls, before the result card. */
const ReviveOverlay = ({ visible, price, embers, left, busy, onRevive, onDecline }: Props) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  if (!visible) return null;
  return (
    <OverlayContainer>
      <View style={[styles.card, { width: Math.min(width * 0.86, 420) }]}>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {t("revive.title").toLocaleUpperCase()}
        </Text>
        <Text style={styles.body} maxFontSizeMultiplier={1.3}>
          {t("revive.body")}
        </Text>
        <TouchableOpacity
          style={[styles.cta, busy && { opacity: 0.6 }]}
          onPress={onRevive}
          disabled={busy}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${t("revive.cta")}: ${price}`}
        >
          {busy ? (
            <ActivityIndicator color="#1a1200" />
          ) : (
            <Text style={styles.ctaText} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
              ❤️  {t("revive.cta").toLocaleUpperCase()}  ·  🔥 {price}
            </Text>
          )}
        </TouchableOpacity>
        <Text style={styles.meta} maxFontSizeMultiplier={1.2}>
          {t("revive.balance", { n: embers.toLocaleString() })}  ·  {t("revive.left", { n: left })}
        </Text>
        <TouchableOpacity style={styles.decline} onPress={onDecline} disabled={busy} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t("revive.decline")}>
          <Text style={styles.declineText} maxFontSizeMultiplier={1.3}>
            {t("revive.decline")}
          </Text>
        </TouchableOpacity>
      </View>
    </OverlayContainer>
  );
};

export default ReviveOverlay;

const styles = StyleSheet.create({
  card: { backgroundColor: "#1a1226", borderRadius: 24, borderWidth: 2, borderColor: "#FF8A80", paddingHorizontal: 20, paddingVertical: 18, alignItems: "center", gap: 12 },
  title: { color: "#FF8A80", fontSize: 20, fontWeight: "900", letterSpacing: 3 },
  body: { color: "#d7d2ee", fontSize: 14.5, lineHeight: 21, textAlign: "center" },
  cta: { width: "100%", minHeight: MIN_TOUCH + 8, backgroundColor: "#FFAB40", borderRadius: 16, paddingHorizontal: 12, justifyContent: "center", alignItems: "center", borderBottomWidth: 4, borderBottomColor: "rgba(0,0,0,0.3)" },
  ctaText: { color: "#1a1200", fontWeight: "900", fontSize: 17, letterSpacing: 1 },
  meta: { color: "#9d97ba", fontSize: 12.5, fontWeight: "700" },
  decline: { minHeight: MIN_TOUCH, paddingHorizontal: 18, justifyContent: "center" },
  declineText: { color: "#b9b4d4", fontWeight: "800", fontSize: 14, textDecorationLine: "underline" },
});
