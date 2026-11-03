import React from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import OverlayContainer from "../../ui/components/game/OverlayContainer";
import { PopButton, PopupPanel, popupTitleStyle } from "../../ui/components/game/popup";
import { useWindowDimensions } from "../../ui/layout/scaledWindow";
import { useT } from "../../i18n/useT";
import { formatSolveTime } from "./shareText";
import KeyHint from "../../ui/components/KeyHint";

const GOLD = "#FFD54F";
const GEM = require("../../assets/sprites/items/Icon_Gem.webp");

type Props = {
  /** "Puzzle 15", "Puzzle of the day #3", ... */
  title: string;
  /** The level's name (Explorer, Legend...). */
  tier: string;
  tint: string;
  rows: number;
  cols: number;
  gems: number;
  /** Best time in seconds (0: none yet). */
  best: number;
  /** Legend time in seconds (0: the puzzle has no crown). */
  legend: number;
  crowned: boolean;
  /** One mistake ends the try. */
  strict: boolean;
  /** No hints (the weekly challenge). */
  noHints: boolean;
  onStart: () => void;
};

/**
 * The card a puzzle opens on: what it is, what it asks (the gems to reach, the board's size), what is at stake (the best time
 * to beat, the crown's time, a strict rule) and one button. The clock only starts when it is closed.
 */
export default function PuzzleIntro({ title, tier, tint, rows, cols, gems, best, legend, crowned, strict, noHints, onStart }: Props) {
  const { t } = useT();
  const { width } = useWindowDimensions();
  return (
    <OverlayContainer dim={0.72}>
      <PopupPanel tint={tint} width={Math.min(width * 0.9, 440)}>
        <Text style={[styles.kicker, { color: tint }]} maxFontSizeMultiplier={1.1}>
          {`${tier}  ·  ${rows}×${cols}`.toLocaleUpperCase()}
        </Text>
        <Text style={popupTitleStyle(tint)} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.15}>
          {title.toLocaleUpperCase()}
        </Text>
        <View style={styles.goal}>
          <SpriteImage source={GEM} style={{ width: 28, height: 28 }} resizeMode="contain" />
          <Text style={styles.goalText} maxFontSizeMultiplier={1.15}>
            {gems === 1 ? t("puzzle.goal1") : t("puzzle.goal", { n: gems })}
          </Text>
        </View>
        <View style={styles.chips}>
          {legend > 0 ? (
            <View style={[styles.chip, crowned && styles.chipGold]}>
              <MaterialCommunityIcons name="crown" size={15} color={crowned ? GOLD : "#d8c7a8"} />
              <Text style={[styles.chipText, crowned && { color: GOLD }]} maxFontSizeMultiplier={1.1}>
                {crowned ? t("puzzle.intro.crowned") : t("puzzle.intro.crown", { time: formatSolveTime(legend) })}
              </Text>
            </View>
          ) : null}
          {best > 0 ? (
            <View style={styles.chip}>
              <Ionicons name="timer-outline" size={14} color="#d8c7a8" />
              <Text style={styles.chipText} maxFontSizeMultiplier={1.1}>
                {t("puzzle.record.best", { best: formatSolveTime(best) })}
              </Text>
            </View>
          ) : null}
          {strict ? (
            <View style={[styles.chip, styles.chipRed]}>
              <Ionicons name="skull-outline" size={14} color="#FF8A80" />
              <Text style={[styles.chipText, { color: "#FFCDD2" }]} maxFontSizeMultiplier={1.1}>
                {t("puzzle.intro.strict")}
              </Text>
            </View>
          ) : null}
          {noHints ? (
            <View style={[styles.chip, styles.chipRed]}>
              <Ionicons name="bulb-outline" size={14} color="#FF8A80" />
              <Text style={[styles.chipText, { color: "#FFCDD2" }]} maxFontSizeMultiplier={1.1}>
                {t("puzzle.intro.noHints")}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.stars} maxFontSizeMultiplier={1.1}>
          {t("puzzle.intro.stars")}
        </Text>
        <View style={{ alignSelf: "stretch" }}>
          <PopButton label={t("puzzle.intro.play")} icon="play" tint={tint} onPress={onStart} style={{ alignSelf: "stretch" }} />
          <KeyHint text="Enter" style={{ top: -6, left: 6 }} />
        </View>
      </PopupPanel>
    </OverlayContainer>
  );
}

const styles = StyleSheet.create({
  kicker: { fontWeight: "900", fontSize: 11, letterSpacing: 2 },
  goal: { flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "stretch", padding: 10, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.35)" },
  goalText: { flex: 1, color: "#FFF3E0", fontWeight: "800", fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
  chipGold: { borderColor: GOLD, backgroundColor: "rgba(255,213,79,0.12)" },
  chipRed: { borderColor: "rgba(255,82,82,0.6)", backgroundColor: "rgba(255,82,82,0.1)" },
  chipText: { color: "#E6D6C2", fontWeight: "800", fontSize: 12 },
  stars: { color: "#bfb3a6", fontSize: 11.5, textAlign: "center" },
});
