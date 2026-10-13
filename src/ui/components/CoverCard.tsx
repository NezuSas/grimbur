import React from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import Text from "./Text";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CoverButton from "./CoverButton";
import ModeCard from "./ModeCard";
import StreakBadge from "./StreakBadge";
import { MIN_TOUCH, useGameLayout } from "../layout/useGameLayout";
import { useT } from "../../i18n/useT";

type Props = {
  onPressPlay: () => void;
  onPressDaily: () => void;
  onPressEndless: () => void;
  /** Current daily streak in days (0 when broken or never started). */
  streak: number;
  /** The daily has already been played today. */
  dailyDone: boolean;
  /** The endless descent opens after the first victory. */
  endlessUnlocked: boolean;
  bestEndlessFloor: number;
  onPressScores: () => void;
  onPressInstructions: () => void;
  onPressForge: () => void;
  onPressAchievements: () => void;
  onPressSettings: () => void;
};

const CoverCard: React.FC<Props> = ({ onPressPlay, onPressDaily, onPressEndless, streak, dailyDone, endlessUnlocked, bestEndlessFloor, onPressScores, onPressInstructions, onPressForge, onPressAchievements, onPressSettings }) => {
  const { t } = useT();
  const { width, height } = useWindowDimensions();
  // Short landscape phones: the four menu buttons share one row so the whole card fits without scrolling.
  const short = height < 420;
  const insets = useSafeAreaInsets();
  const { spacing, titleSize } = useGameLayout();

  const cardWidth = Math.min(width - Math.max(insets.left, 12) - Math.max(insets.right, 12) - 16, 540);
  const wide = cardWidth >= 460;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 8), paddingBottom: Math.max(insets.bottom, 8) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.cardContainer, { width: cardWidth, padding: spacing(24) }]}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={onPressSettings}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.settings")}
        >
          <Ionicons name="settings-outline" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Header */}
        <View style={[styles.header, { marginBottom: spacing(16) }]}>
          <Text
            style={[styles.title, { fontSize: Math.min(titleSize * 0.95, 34) }]}
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.2}
          >
            WUMPUS ADVENTURES
          </Text>
          <Text style={styles.tagline} maxFontSizeMultiplier={1.3}>
            {t("cover.tagline")}
          </Text>
        </View>

        {/* Game modes: each says what makes it different */}
        <View style={styles.modes}>
          <ModeCard
            featured
            icon="compass"
            tint="#F2C14E"
            title={t("cover.mode.expedition")}
            subtitle={t("cover.mode.expedition.sub")}
            onPress={onPressPlay}
          />
          <View style={[styles.modeRow, !wide && { flexDirection: "column" }]}>
            <ModeCard
              icon="calendar"
              tint="#FF9A3C"
              title={t("cover.mode.daily")}
              subtitle={streak > 0 ? t(dailyDone ? "cover.streak.done" : "cover.streak.risk", { count: streak }) : t("cover.mode.daily.sub")}
              onPress={onPressDaily}
              leading={<StreakBadge days={streak} doneToday={dailyDone} />}
            />
            <ModeCard
              icon="infinite"
              tint="#B39DDB"
              title={t("cover.mode.endless")}
              subtitle={
                endlessUnlocked
                  ? bestEndlessFloor > 0
                    ? t("cover.mode.endless.best", { floor: bestEndlessFloor })
                    : t("cover.mode.endless.sub")
                  : t("cover.mode.endless.locked")
              }
              locked={!endlessUnlocked}
              onPress={endlessUnlocked ? onPressEndless : onPressPlay}
            />
          </View>
        </View>

        <View style={[styles.menu, short && styles.menuShort]}>
          <View style={styles.half}>
            <CoverButton label={t("cover.forge")} onPress={onPressForge} variant="secondary" compact={short} />
          </View>
          <View style={styles.half}>
            <CoverButton label={t("cover.rankings")} onPress={onPressScores} variant="secondary" compact={short} />
          </View>
          <View style={styles.half}>
            <CoverButton label={t("cover.achievements")} onPress={onPressAchievements} variant="secondary" compact={short} />
          </View>
          <View style={styles.half}>
            <CoverButton label={t("cover.manual")} onPress={onPressInstructions} variant="secondary" compact={short} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, width: "100%" },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  cardContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  settingsButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: MIN_TOUCH - 6,
    height: MIN_TOUCH - 6,
    borderRadius: (MIN_TOUCH - 6) / 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  header: { alignItems: "center", paddingHorizontal: 40 },
  title: {
    color: "#F2C14E",
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 2,
  },
  tagline: {
    color: "#e6e6e6",
    fontWeight: "600",
    fontSize: 13,
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 4,
  },
  modes: { gap: 8, marginBottom: 6 },
  modeRow: { flexDirection: "row", gap: 8 },
  menu: { flexDirection: "row", flexWrap: "wrap", columnGap: 10 },
  menuShort: { flexWrap: "nowrap", columnGap: 6 },
  half: { flexBasis: "47%", flexGrow: 1, flexShrink: 1, minWidth: 0 },
  versionText: {
    color: "rgba(255, 255, 255, 0.55)",
    fontWeight: "bold",
    fontSize: 11,
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 8,
  },
});

export default CoverCard;
