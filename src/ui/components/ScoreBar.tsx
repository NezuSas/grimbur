import React, { memo } from "react";
import { StyleSheet, View, Image, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScoreCounter from "./ScoreCounter";
import { Character } from "../../data/characters";
import { useGameLayout, MIN_TOUCH } from "../layout/useGameLayout";
import { formatTime } from "../../shared/utils/formatTime";
import { useT } from "../../i18n/useT";

type Props = {
  score: number;
  attackValue: number;
  coins: number;
  character: Character;
  level: number;
  /** Total floors of the expedition; shows `level/floors` when set. */
  floors?: number;
  time: number;
  shield?: boolean;
  /** When provided, a pause button is shown next to the timer. */
  onPause?: () => void;
};

/** The HUD never scales text beyond this, so it always fits the fixed bar height. */
const HUD_FONT_CAP = 1.15;

const ScoreBar: React.FC<Props> = memo(
  ({ score, attackValue, coins, character, level, floors, time, shield = false, onPause }) => {
    const { t, plural } = useT();
    const { hudHeight, insets, fontSize, spacing } = useGameLayout();

    const avatarSize = Math.round(hudHeight * 0.62);
    const statIconSize = Math.round(hudHeight * 0.5);

    return (
      <View
        style={[
          styles.container,
          {
            height: hudHeight,
            paddingLeft: spacing(16) + insets.left,
            paddingRight: spacing(16) + insets.right,
          },
        ]}
      >
        {/* LEFT: avatar, timer, pause */}
        <View style={styles.leftGroup}>
          <View
            style={[styles.avatarWrapper, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Image
              source={character.scoreImage}
              style={{ width: avatarSize * 0.85, height: avatarSize * 0.85 }}
              resizeMode="contain"
            />
          </View>

          <View style={[styles.timeContainer, { marginLeft: spacing(10) }]}>
            <Text style={styles.timeLabel} maxFontSizeMultiplier={HUD_FONT_CAP} numberOfLines={1}>
              {t("hud.time").toLocaleUpperCase()}
            </Text>
            <Text
              style={[styles.timeValue, { fontSize: fontSize(20) }]}
              maxFontSizeMultiplier={HUD_FONT_CAP}
              numberOfLines={1}
            >
              {formatTime(time)}
            </Text>
          </View>

          {onPause && (
            <TouchableOpacity
              onPress={onPause}
              style={[styles.pauseButton, { marginLeft: spacing(12) }]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={t("a11y.pause")}
            >
              <Ionicons name="pause" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* CENTER: floor indicator (+ shield) */}
        <View style={styles.centerGroup}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelLabel} maxFontSizeMultiplier={HUD_FONT_CAP} numberOfLines={1}>
              {(floors ? t("hud.floor") : t("hud.level")).toLocaleUpperCase()}
            </Text>
            <Text
              style={[styles.levelText, { fontSize: floors ? 22 : 26 }]}
              maxFontSizeMultiplier={HUD_FONT_CAP}
              numberOfLines={1}
              accessibilityLabel={floors ? t("hud.floorOf", { level, floors }) : String(level)}
            >
              {floors ? t("hud.floorOf", { level, floors }) : level}
            </Text>
          </View>
          {shield && (
            <View style={styles.shieldBadge} accessible accessibilityLabel={t("a11y.shieldActive")}>
              <Ionicons name="shield-checkmark" size={18} color="#4FC3F7" />
            </View>
          )}
        </View>

        {/* RIGHT: counters */}
        <View style={styles.rightGroup}>
          <ScoreCounter
            icon={require("../../assets/sprites/items/Icon_Gem.png")}
            value={coins}
            iconDim={statIconSize}
            a11yLabel={plural("a11y.gemsLeft", coins)}
          />
          <ScoreCounter
            icon={character.attackImage}
            value={attackValue}
            iconDim={statIconSize}
            a11yLabel={t("a11y.arrowsLeft", { count: attackValue })}
          />
          <ScoreCounter
            icon={character.scoreImage}
            value={score}
            iconDim={statIconSize}
            a11yLabel={`${t("over.score")} ${score}`}
          />
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  leftGroup: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
  },
  timeContainer: {
    justifyContent: "center",
    flexShrink: 1,
  },
  timeLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 1,
  },
  timeValue: {
    color: "#00BFFF",
    fontWeight: "900",
    marginTop: -2,
  },
  centerGroup: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  pauseButton: {
    width: MIN_TOUCH - 8,
    height: MIN_TOUCH - 8,
    borderRadius: (MIN_TOUCH - 8) / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  shieldBadge: {
    padding: 4,
    borderRadius: 14,
    backgroundColor: "rgba(79, 195, 247, 0.18)",
    borderWidth: 1,
    borderColor: "#4FC3F7",
  },
  rightGroup: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  avatarWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  levelBadge: {
    alignItems: "center",
    justifyContent: "center",
  },
  levelLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 1,
  },
  levelText: {
    color: "#FFD700",
    fontWeight: "900",
  },
});

export default ScoreBar;
