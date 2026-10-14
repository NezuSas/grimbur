import React, { memo, useEffect, useRef, useState } from "react";
import { StyleSheet, View, TouchableOpacity, Animated } from "react-native";
import Text from "./Text";
import { Ionicons } from "@expo/vector-icons";
import ScoreCounter from "./ScoreCounter";
import { Character } from "../../data/characters";
import { useGameLayout, MIN_TOUCH } from "../layout/useGameLayout";
import { formatTime } from "../../shared/utils/formatTime";
import { useT } from "../../i18n/useT";
import SpriteImage from "./SpriteImage";
import type { SessionClock } from "../../core/feedback/clock";

type Props = {
  score: number;
  attackValue: number;
  coins: number;
  character: Character;
  level: number;
  /** Total floors of the expedition; shows `level/floors` when set. */
  floors?: number;
  /** The run clock; only the timer text subscribes to it, so a tick never re-renders the bar. */
  clock: SessionClock;
  shield?: boolean;
  /** Kill combo in progress (the pip shows from x2); `comboMax` is its cap. */
  combo?: number;
  comboMax?: number;
  /** Changes whenever a shield (or feather) soaks a hit: the shield icon blinks red. */
  shieldBreakKey?: number;
  /** Peak pop scale of the gem counter (grows with the gem streak). */
  gemPop?: number;
  /** Reduced motion. */
  calm?: boolean;
  /** Hearts the Wumpus has left; when set (lair floor) it replaces the gem counter. */
  bossHearts?: number;
  /** When provided, a pause button is shown next to the timer. */
  onPause?: () => void;
};

/** The HUD never scales text beyond this, so it always fits the fixed bar height. */
const HUD_FONT_CAP = 1.15;

/** Windows narrower than this get the compact HUD. */
const COMPACT_WIDTH = 560;

/** The elapsed time, kept in its own component so only this text updates every second. */
const ClockText: React.FC<{ clock: SessionClock; style: object; maxFontSizeMultiplier: number }> = ({ clock, style, maxFontSizeMultiplier }) => {
  const [seconds, setSeconds] = useState(clock.get());
  useEffect(() => {
    setSeconds(clock.get());
    return clock.subscribe(setSeconds);
  }, [clock]);
  return (
    <Text style={style} maxFontSizeMultiplier={maxFontSizeMultiplier} numberOfLines={1}>
      {formatTime(seconds)}
    </Text>
  );
};

/** The shield icon; when a hit is soaked it stays a moment, blinking red, instead of just vanishing. */
const ShieldBadge: React.FC<{ shield: boolean; breakKey: number; calm: boolean; label: string }> = ({ shield, breakKey, calm, label }) => {
  const [ghost, setGhost] = useState(false);
  const blink = useRef(new Animated.Value(0)).current;
  const lastKey = useRef(breakKey);
  useEffect(() => {
    if (breakKey === lastKey.current) return;
    lastKey.current = breakKey;
    setGhost(true);
    blink.setValue(0);
    const run = Animated.sequence(
      calm
        ? [Animated.timing(blink, { toValue: 1, duration: 200, useNativeDriver: true }), Animated.delay(250)]
        : [
            Animated.timing(blink, { toValue: 1, duration: 90, useNativeDriver: true }),
            Animated.timing(blink, { toValue: 0.2, duration: 90, useNativeDriver: true }),
            Animated.timing(blink, { toValue: 1, duration: 90, useNativeDriver: true }),
            Animated.timing(blink, { toValue: 0, duration: 260, useNativeDriver: true }),
          ],
    );
    run.start(() => setGhost(false));
    return () => run.stop();
  }, [breakKey, calm, blink]);
  if (!shield && !ghost) return null;
  return (
    <View style={[styles.shieldBadge, !shield && styles.shieldBadgeBroken]} accessible accessibilityLabel={label}>
      <SpriteImage source={require("../../assets/sprites/items/Icon_Shield.png")} style={{ width: 22, height: 22 }} resizeMode="contain" />
      {!shield && <Animated.View pointerEvents="none" style={[styles.shieldBlink, { opacity: blink }]} />}
    </View>
  );
};

const ScoreBar: React.FC<Props> = memo(
  ({ score, attackValue, coins, character, level, floors, clock, shield = false, combo = 0, comboMax = 3, shieldBreakKey = 0, gemPop, calm = false, bossHearts, onPause }) => {
    const { t, plural } = useT();
    const { hudHeight, insets, fontSize, spacing, screenWidth } = useGameLayout();
    // Portrait and split-screen windows: the avatar goes and the sides take only what they need.
    const compact = screenWidth < COMPACT_WIDTH;

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
        <View style={compact ? styles.leftCompact : styles.leftGroup}>
          {!compact && (
          <View
            style={[styles.avatarWrapper, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <SpriteImage
              source={character.scoreImage}
              style={{ width: avatarSize * 0.85, height: avatarSize * 0.85 }}
              resizeMode="contain"
            />
          </View>
          )}

          <View style={[styles.timeContainer, { marginLeft: compact ? 0 : spacing(10) }]}>
            <Text style={styles.timeLabel} maxFontSizeMultiplier={HUD_FONT_CAP} numberOfLines={1}>
              {t("hud.time").toLocaleUpperCase()}
            </Text>
            <ClockText clock={clock} style={[styles.timeValue, { fontSize: fontSize(20) }]} maxFontSizeMultiplier={HUD_FONT_CAP} />
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
              {t("hud.floor").toLocaleUpperCase()}
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
          <ShieldBadge shield={shield} breakKey={shieldBreakKey} calm={calm} label={t("a11y.shieldActive")} />
          {combo >= 2 && (
            <View style={[styles.comboPip, combo >= comboMax && styles.comboPipMax]} accessible accessibilityLabel={`x${combo} combo`}>
              <Ionicons name="flame" size={14} color={combo >= comboMax ? "#3b2600" : "#FFB300"} />
              <Text style={[styles.comboText, combo >= comboMax && { color: "#3b2600" }]} maxFontSizeMultiplier={HUD_FONT_CAP} numberOfLines={1}>
                x{combo}
              </Text>
            </View>
          )}
        </View>

        {/* RIGHT: counters */}
        <View style={compact ? styles.rightCompact : styles.rightGroup}>
          {bossHearts !== undefined ? (
            <ScoreCounter
              icon={require("../../assets/sprites/enemies/Wumpus_Boss.png")}
              value={`${bossHearts}`}
              label={t("hud.bossHearts").toLocaleUpperCase()}
              iconDim={statIconSize}
              compact={compact}
              a11yLabel={t("a11y.bossHearts", { count: bossHearts })}
            />
          ) : (
            <ScoreCounter
              icon={require("../../assets/sprites/items/Icon_Gem.png")}
              value={coins}
              popScale={gemPop}
              iconDim={statIconSize}
              compact={compact}
              a11yLabel={plural("a11y.gemsLeft", coins)}
            />
          )}
          <ScoreCounter
            icon={require("../../assets/sprites/items/Icon_Arrows.png")}
            value={attackValue}
            iconDim={statIconSize}
            compact={compact}
            a11yLabel={t("a11y.arrowsLeft", { count: attackValue })}
          />
          <ScoreCounter
            iconNode={<Ionicons name="trophy" size={Math.round(statIconSize * 0.78)} color="#FFD54F" />}
            value={score}
            iconDim={statIconSize}
            compact={compact}
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
  leftCompact: { flexGrow: 0, flexShrink: 0, flexDirection: "row", alignItems: "center" },
  rightCompact: { flexGrow: 0, flexShrink: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
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
  shieldBadgeBroken: { borderColor: "#FF1744", backgroundColor: "rgba(255,23,68,0.18)" },
  shieldBlink: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, borderRadius: 14, backgroundColor: "rgba(255,23,68,0.75)" },
  comboPip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: "rgba(255,179,0,0.18)",
    borderWidth: 1,
    borderColor: "#FFB300",
  },
  comboPipMax: { backgroundColor: "#FFD54F", borderColor: "#FFF8E1" },
  comboText: { color: "#FFD54F", fontWeight: "900", fontSize: 13, includeFontPadding: false },
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
