import React from "react";
import { StyleSheet, View } from "react-native";
import Text from "./Text";
import GlyphIcon from "./GlyphIcon";
import { useT } from "../../i18n/useT";
import { achievementText, forgeText, heroText } from "../../i18n/keys";
import type { Goal } from "../../core/stats/goals";

type Props = {
  goal: Goal;
  /** The run just made this purchase possible: the line is lit. */
  highlight?: boolean;
  /** Smaller text for the cover. */
  small?: boolean;
  /** Size factor for big screens (1 on a phone). */
  scale?: number;
  /** Left-align and drop the bar background (the cover puts it on a dark cave). */
  align?: "left" | "center";
};

/** One "next goal" as a line of text with a thin progress bar under it. */
const GoalLine: React.FC<Props> = ({ goal, highlight = false, small = false, scale = 1, align = "left" }) => {
  const { t, plural } = useT();
  let text: string;
  switch (goal.kind) {
    case "forge": {
      const name = forgeText(t, goal.id, "name");
      text = goal.affordable ? t("goal.forgeReady", { name }) : plural("goal.forge", goal.remaining, { name });
      break;
    }
    case "hero": {
      const name = heroText(t, goal.hero, "name");
      text =
        goal.metric === "floor"
          ? t("goal.heroFloor", { name, current: goal.current, target: goal.target })
          : goal.metric === "daily"
            ? t("goal.heroDaily", { name, current: goal.current, target: goal.target })
            : goal.metric === "embers"
              ? t("goal.heroEmbers", { name, current: goal.current, target: goal.target })
              : t("goal.heroVictory", { name });
      break;
    }
    default:
      text = t("goal.achievement", { name: achievementText(t, goal.id, "name"), current: goal.current, target: goal.target });
  }
  const color = highlight ? "#9ee37d" : "#FFD9A8";
  const icon = goal.kind === "forge" ? "hammer" : goal.kind === "hero" ? "padlock" : ("trophy" as const);
  return (
    <View style={[styles.wrap, align === "center" && { alignItems: "center" }]} accessible accessibilityLabel={text}>
      <Text style={[styles.text, small && styles.small, { color, fontSize: (small ? 12 : 13) * scale }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
        <GlyphIcon name={icon} size={(small ? 11 : 12) * scale} /> {text}
      </Text>
      <View style={[styles.track, highlight && { backgroundColor: "rgba(158,227,125,0.25)" }]}>
        <View style={[styles.fill, { width: `${Math.round(Math.max(0, Math.min(1, goal.progress)) * 100)}%`, backgroundColor: highlight ? "#9ee37d" : "#FFAB40" }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 3, alignSelf: "stretch" },
  text: { fontWeight: "800", fontSize: 13 },
  small: { fontSize: 12, textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 6 },
  track: { height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.14)", overflow: "hidden" },
  fill: { height: 4, borderRadius: 2 },
});

export default GoalLine;
