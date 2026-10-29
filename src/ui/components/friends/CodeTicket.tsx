import React, { useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import Text from "../Text";
import SpriteImage from "../SpriteImage";
import PressScale from "../PressScale";
import Rise from "../Rise";
import { useT } from "../../../i18n/useT";
import type { TranslationKey } from "../../../i18n/en";
import { formatChallengeCode } from "../../../core/challenge/code";
import { GAME_CONFIG } from "../../../config/gameConfig";

export const FRIEND_TINT = { challenge: "#4FC3F7", duel: "#FF8A80" } as const;
export const FRIEND_ART = { challenge: require("../../../assets/sprites/ui/Icon_Puzzle.png"), duel: require("../../../assets/sprites/ui/Icon_Swords.png") } as const;
/** Each difficulty warms from calm green to legendary violet, so a row of them reads as a climb. */
export const DEPTH_COLOR = ["#9EE37D", "#FFD54F", "#FFAB40", "#FF7043", "#E57373", "#CE93D8"];

/** A difficulty as a small coloured plate with one pip per step. */
export const DepthBadge = ({ depth }: { depth: number }) => {
  const { t } = useT();
  const c = DEPTH_COLOR[depth] ?? "#FFD54F";
  return (
    <View style={[styles.depth, { borderColor: c + "AA", backgroundColor: c + "1F" }]}>
      <View style={styles.pips}>
        {Array.from({ length: depth + 1 }, (_, i) => (
          <View key={i} style={[styles.pip, { backgroundColor: c }]} />
        ))}
      </View>
      <Text style={[styles.depthText, { color: c }]} maxFontSizeMultiplier={1.1}>
        {t(`ascension.label.${depth}` as TranslationKey).toLocaleUpperCase()}
      </Text>
    </View>
  );
};

type Props = { mode: "challenge" | "duel"; code: string; depth: number; children?: React.ReactNode };

/**
 * The code of a challenge or a duel as a ticket to hand over: big, with its difficulty, and the two ways to pass it on (copy, share)
 * right beside it. `children` go under it (the button that plays, the stake...).
 */
const CodeTicket = ({ mode, code, depth, children }: Props) => {
  const { t } = useT();
  const tint = FRIEND_TINT[mode];
  const [copied, setCopied] = useState(false);
  const pretty = formatChallengeCode(code);
  const depthName = t(`ascension.label.${depth}` as TranslationKey);

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(pretty);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // the code is on the screen
    }
  };
  const share = async () => {
    try {
      await Share.share({ message: t(mode === "duel" ? "duel.shareMessage" : "challenge.shareMessage", { code: pretty, depth: depthName, url: GAME_CONFIG.store.url }) });
    } catch (e) {
      console.warn("[friends] share failed:", e);
    }
  };

  return (
    <Rise style={[styles.ticket, { borderColor: tint + "AA" }]}>
      <View style={[styles.glow, { backgroundColor: tint }]} pointerEvents="none" />
      <View style={styles.top}>
        <SpriteImage source={FRIEND_ART[mode]} style={styles.art} resizeMode="contain" accessibilityIgnoresInvertColors />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
            {t("challenge.code").toLocaleUpperCase()}
          </Text>
          <DepthBadge depth={depth} />
        </View>
      </View>

      <View style={[styles.codeBox, { borderColor: tint + "77" }]}>
        <Text style={styles.code} selectable adjustsFontSizeToFit numberOfLines={1} accessibilityLabel={pretty.split("").join(" ")} maxFontSizeMultiplier={1.1}>
          {pretty}
        </Text>
      </View>
      <View style={styles.tools}>
        <PressScale onPress={() => void copy()} style={[styles.tool, copied && { backgroundColor: "#9EE37D", borderColor: "#9EE37D" }]} accessibilityRole="button" accessibilityLabel={copied ? t("challenge.copied") : t("challenge.copy")}>
          <Ionicons name={copied ? "checkmark" : "copy"} size={16} color={copied ? "#1a0f00" : "#EAE1D8"} />
          <Text style={[styles.toolText, copied && { color: "#1a0f00" }]} maxFontSizeMultiplier={1.1}>
            {(copied ? t("challenge.copied") : t("challenge.copy")).toLocaleUpperCase()}
          </Text>
        </PressScale>
        <PressScale onPress={() => void share()} style={[styles.tool, { backgroundColor: tint, borderColor: tint }]} accessibilityRole="button" accessibilityLabel={t("challenge.share")}>
          <Ionicons name="share-social" size={16} color="#1a0f00" />
          <Text style={[styles.toolText, { color: "#1a0f00" }]} maxFontSizeMultiplier={1.1}>
            {t("challenge.share").toLocaleUpperCase()}
          </Text>
        </PressScale>
      </View>
      <Text style={styles.fair} maxFontSizeMultiplier={1.15}>
        {t("challenge.fair")}
      </Text>
      {children}
    </Rise>
  );
};

export default CodeTicket;

const styles = StyleSheet.create({
  ticket: { gap: 8, padding: 12, borderRadius: 20, borderWidth: 1.5, backgroundColor: "rgba(48,36,22,0.92)", overflow: "hidden" },
  glow: { position: "absolute", top: -40, left: -40, width: 140, height: 140, borderRadius: 70, opacity: 0.1 },
  top: { flexDirection: "row", alignItems: "center", gap: 10 },
  art: { width: 46, height: 46 },
  kicker: { color: "#B99A7C", fontWeight: "900", fontSize: 10.5, letterSpacing: 2 },
  codeBox: { alignItems: "center", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", backgroundColor: "rgba(0,0,0,0.3)" },
  code: { alignSelf: "stretch", textAlign: "center", color: "#FFD54F", fontWeight: "900", fontSize: 28, letterSpacing: 3 },
  tools: { flexDirection: "row", gap: 6 },
  toolText: { color: "#EAE1D8", fontWeight: "900", fontSize: 11.5, letterSpacing: 1 },
  tool: { flex: 1, flexDirection: "row", gap: 6, minHeight: 38, borderRadius: 19, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.25)", backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  fair: { color: "#C4AA91", fontSize: 12, lineHeight: 16 },
  depth: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  pips: { flexDirection: "row", gap: 2 },
  pip: { width: 5, height: 5, borderRadius: 3 },
  depthText: { fontWeight: "900", fontSize: 10.5, letterSpacing: 1 },
});
