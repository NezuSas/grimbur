import React from "react";
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

/** A small bar under the HUD during a duel: the rival's name, floor and score, and whether they are ahead of the player. */
const DuelChip = ({ duel, level, score, top }: Props) => {
  const { t } = useT();
  if (!duel.active) return null;
  const rival = duel.rival;
  const text =
    !rival || duel.status === "waiting"
      ? t("duel.chip.waiting")
      : duel.status === "away"
        ? t("duel.chip.away", { name: rival.name })
        : t("duel.chip.line", { name: rival.name, floor: rival.level, score: rival.score.toLocaleString() });
  const ahead = rival && (level !== rival.level ? level > rival.level : score > rival.score);
  const color = !rival || duel.status === "away" ? "#b9b4d4" : duel.status === "done" ? "#80DEEA" : ahead ? "#9EE37D" : "#FF8A80";
  return (
    <View pointerEvents="none" style={[styles.wrap, { top }]} accessible accessibilityLabel={text} accessibilityLiveRegion="polite">
      <View style={[styles.chip, { borderColor: color + "AA" }]}>
        <Ionicons name={duel.status === "done" ? "flag" : "flash"} size={14} color={color} />
        <Text style={styles.text} numberOfLines={1} maxFontSizeMultiplier={1.1}>
          {text}
        </Text>
        
      </View>
    </View>
  );
};

export default DuelChip;

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 25 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(20,12,40,0.92)", borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, maxWidth: "70%" },
  text: { color: "#fff", fontWeight: "800", fontSize: 12 },
});
