import React from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Text from "../Text";
import OverlayContainer from "./OverlayContainer";
import { PopButton, PopLink, PopupPanel, PopupTitle } from "./popup";
import { useT } from "../../../i18n/useT";

type Props = {
  visible: boolean;
  price: number;
  embers: number;
  /** Revives already used in this run. */
  used: number;
  busy: boolean;
  onRevive: () => void;
  onDecline: () => void;
};

const TINT = "#FF8A80";

/** The second chance: come back from a death for embers. It appears right after the hero falls, before the result card. */
const ReviveOverlay = ({ visible, price, embers, used, busy, onRevive, onDecline }: Props) => {
  const { t } = useT();
  const { width } = useWindowDimensions();
  if (!visible) return null;
  return (
    <OverlayContainer>
      <PopupPanel tint={TINT} width={Math.min(width * 0.86, 440)}>
        <PopupTitle tint={TINT} icon="heart" title={t("revive.title")} />
        <Text style={styles.body} maxFontSizeMultiplier={1.3}>
          {t("revive.body")}
        </Text>
        <PopButton label={`${t("revive.cta")}  ·  🔥 ${price}`} glyph="❤️" busy={busy} onPress={onRevive} accessibilityLabel={`${t("revive.cta")}: ${price}`} />
        <Text style={styles.meta} maxFontSizeMultiplier={1.2}>
          {t("revive.balance", { n: embers.toLocaleString() })}
          {used > 0 ? `  ·  ${t("revive.used", { n: used })}` : ""}
        </Text>
        <PopLink label={t("revive.decline")} onPress={onDecline} disabled={busy} />
      </PopupPanel>
    </OverlayContainer>
  );
};

export default ReviveOverlay;

const styles = StyleSheet.create({
  body: { color: "#d7d2ee", fontSize: 14.5, lineHeight: 21, textAlign: "center" },
  meta: { color: "#9d97ba", fontSize: 12.5, fontWeight: "700" },
});
