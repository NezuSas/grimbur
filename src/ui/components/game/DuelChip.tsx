import React from "react";
import GlyphIcon from '../GlyphIcon';
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "../Text";
import { useT } from "../../../i18n/useT";
import type { DuelView } from "../../../screens/game/useDuel";

type Props = {
  duel: DuelView;
  /** The hero's floor and score right now, to tell who is ahead. */
  level: number;
  score: number;
  top: number;
};

/** A small panel under the HUD during a duel: each rival's name, floor and score, coloured by whether the player is ahead of them. */
const DuelChip = ({ duel, level, score, top }: Props) => {
  const { t } = useT();
  if (!duel.active) return null;
  if (duel.offline) {
    return (
      <View pointerEvents="none" style={[styles.wrap, { top }]} accessible accessibilityLabel={t("duel.chip.offline")} accessibilityLiveRegion="polite">
        <View style={[styles.chip, { borderColor: "#FF8A80AA" }]}>
          <Ionicons name="cloud-offline" size={14} color="#FF8A80" />
          <Text style={styles.text} numberOfLines={1} maxFontSizeMultiplier={1.1}>{t("duel.chip.offline")}</Text>
        </View>
      </View>
    );
  }
  if (duel.rivals.length === 0) {
    return (
      <View pointerEvents="none" style={[styles.wrap, { top }]} accessible accessibilityLabel={t("duel.chip.waiting")}>
        <View style={[styles.chip, { borderColor: "#b9b4d4AA" }]}>
          <GlyphIcon name="bolt" size={15} />
          <Text style={styles.text} numberOfLines={1} maxFontSizeMultiplier={1.1}>{t("duel.chip.waiting")}</Text>
        </View>
      </View>
    );
  }
  // At most three rows; the best rivals first (so the panel always shows who the player has to catch).
  const rows = [...duel.rivals].sort((a, b) => (b.victory ? 1 : 0) - (a.victory ? 1 : 0) || b.level - a.level || b.score - a.score).slice(0, 3);
  const label = rows.map(r => (r.status === "away" ? t("duel.chip.away", { name: r.name }) : t("duel.chip.line", { name: r.name, floor: r.level, score: r.score }))).join(". ");
  return (
    <View pointerEvents="none" style={[styles.wrap, { top }]} accessible accessibilityLabel={label} accessibilityLiveRegion="polite">
      <View style={styles.panel}>
        {rows.map(r => {
          const ahead = level !== r.level ? level > r.level : score > r.score;
          const color = r.status === "away" ? "#D6C4B2" : r.status === "done" ? "#80DEEA" : ahead ? "#9EE37D" : "#FF8A80";
          return (
            <View key={r.pid} style={styles.row}>
              <Ionicons name={r.status === "done" ? "flag" : "flash"} size={13} color={color} />
              <Text style={styles.text} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                {r.status === "away" ? t("duel.chip.away", { name: r.name }) : t("duel.chip.line", { name: r.name, floor: r.level, score: r.score })}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default DuelChip;

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 25 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(28, 19, 11,0.92)", borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, maxWidth: "70%" },
  panel: { backgroundColor: "rgba(28, 19, 11,0.92)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.25)", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, gap: 1, maxWidth: "70%" },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  text: { color: "#fff", fontWeight: "800", fontSize: 12, flexShrink: 1 },
});
