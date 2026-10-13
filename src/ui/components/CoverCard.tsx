import React from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Pressable, useWindowDimensions } from "react-native";
import Text from "./Text";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ModeCard from "./ModeCard";
import StreakBadge from "./StreakBadge";
import SpriteImage from "./SpriteImage";
import { MIN_TOUCH } from "../layout/useGameLayout";
import { haptic } from "../../shared/haptics";
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

/** A round icon button with its name underneath: the menu dock. */
const DockButton = ({ icon, label, onPress, ui }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; ui: number }) => (
  <Pressable
    onPress={() => {
      haptic.impact();
      onPress();
    }}
    style={({ pressed }) => [styles.dockItem, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <View style={[styles.dockCircle, { width: 52 * ui, height: 52 * ui, borderRadius: 26 * ui }]}>
      <Ionicons name={icon} size={24 * ui} color="#F2C14E" />
    </View>
    <Text style={[styles.dockLabel, { fontSize: 11 * ui }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>
      {label}
    </Text>
  </Pressable>
);

/**
 * The cover. There is no panel around everything: the title stands on the cave, the game modes are separate
 * cards, and the secondary screens are a row of round icons. Wide landscape windows put the title on the left
 * and the menu on the right; narrow ones stack everything in a column.
 */
const CoverCard: React.FC<Props> = ({
  onPressPlay,
  onPressDaily,
  onPressEndless,
  streak,
  dailyDone,
  endlessUnlocked,
  bestEndlessFloor,
  onPressScores,
  onPressInstructions,
  onPressForge,
  onPressAchievements,
  onPressSettings,
}) => {
  const { t } = useT();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const wide = width >= 640 && width > height;
  // Phones keep the base sizes; roomier screens grow the cards, icons and text up to 1.5x.
  const ui = Math.max(1, Math.min(1.5, width / 900, height / 540));
  const menuWidth = wide ? Math.min(520 * ui, width * 0.5) : Math.min(width - 32, 560 * Math.min(ui, 1.25));
  // Room left for the title once the menu has taken its share (side margins and the gap between them included).
  // Wide screens keep clear of the torches that frame the cave on both sides.
  const sideMargin = wide ? Math.max(16, width * (width >= 1000 ? 0.12 : 0.07)) : 16;
  const leftWidth = wide ? width - menuWidth - sideMargin * 2 - 24 : width - 32;
  const titleSize = wide
    ? Math.max(28, Math.min(72, height * 0.17, leftWidth / 5.4))
    : Math.max(34, Math.min(56, width * 0.13, leftWidth / 5.4));
  const showArt = height >= 400 && (wide ? width >= 760 : height >= 700);
  const artSize = Math.min(wide ? height * 0.3 : 150, 210);
  const sideRow = menuWidth >= 480;

  const title = (
    <View style={[styles.titleBlock, wide ? { flex: 1 } : { marginBottom: 6 }]}>
      <Text style={[styles.titleMain, { fontSize: titleSize, letterSpacing: titleSize * 0.08 }]} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>
        WUMPUS
      </Text>
      <Text style={[styles.titleSub, { fontSize: titleSize * 0.4, letterSpacing: titleSize * 0.14 }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>
        ADVENTURES
      </Text>
      <Text style={styles.tagline} maxFontSizeMultiplier={1.2}>
        {t("cover.tagline")}
      </Text>
      {showArt && (
        <View
          style={[
            styles.medallion,
            { width: artSize * 1.3, height: artSize * 1.3, borderRadius: artSize * 0.65, marginTop: 14 },
          ]}
        >
          <View style={[styles.medallionGlow, { width: artSize * 1.05, height: artSize * 1.05, borderRadius: artSize * 0.525 }]} />
          <SpriteImage
            source={require("../../assets/sprites/enemies/Wumpus_Boss.png")}
            style={{ width: artSize, height: artSize }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
      )}
    </View>
  );

  const menu = (
    <View style={[styles.menu, { width: menuWidth }]}>
      <ModeCard ui={ui} featured icon="compass" tint="#F2C14E" title={t("cover.mode.expedition")} subtitle={t("cover.mode.expedition.sub")} onPress={onPressPlay} />
      <View style={[styles.modeRow, !sideRow && { flexDirection: "column" }]}>
        <ModeCard
          ui={ui}
          icon="calendar"
          tint="#FF9A3C"
          title={t("cover.mode.daily")}
          subtitle={streak > 0 ? t(dailyDone ? "cover.streak.done" : "cover.streak.risk", { count: streak }) : t("cover.mode.daily.sub")}
          onPress={onPressDaily}
          leading={<StreakBadge days={streak} doneToday={dailyDone} />}
        />
        <ModeCard
          ui={ui}
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

      <View style={styles.dock}>
        <DockButton ui={ui} icon="hammer" label={t("cover.forge")} onPress={onPressForge} />
        <DockButton ui={ui} icon="podium" label={t("cover.rankings")} onPress={onPressScores} />
        <DockButton ui={ui} icon="ribbon" label={t("cover.achievements")} onPress={onPressAchievements} />
        <DockButton ui={ui} icon="help-circle" label={t("cover.manual")} onPress={onPressInstructions} />
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          wide && styles.contentWide,
          {
            paddingTop: Math.max(insets.top, 10),
            paddingBottom: Math.max(insets.bottom, 10),
            paddingLeft: Math.max(insets.left, sideMargin),
            paddingRight: Math.max(insets.right, sideMargin),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {title}
        {menu}
      </ScrollView>

      <TouchableOpacity
        style={[styles.settings, { top: Math.max(insets.top, 10), right: Math.max(insets.right, 12) }]}
        onPress={onPressSettings}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={t("a11y.settings")}
      >
        <Ionicons name="settings-outline" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, width: "100%" },
  scroll: { flex: 1, width: "100%" },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  contentWide: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 24 },
  titleBlock: { alignItems: "center", justifyContent: "center" },
  titleMain: {
    color: "#F2C14E",
    fontWeight: "900",
    letterSpacing: 6,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  titleSub: {
    color: "#ffffff",
    fontWeight: "800",
    letterSpacing: 10,
    textAlign: "center",
    marginTop: -6,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    color: "#f0ecff",
    fontWeight: "600",
    fontSize: 13,
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 8,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  medallion: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10, 7, 24, 0.62)",
    borderWidth: 3,
    borderColor: "rgba(242, 193, 78, 0.7)",
    shadowColor: "#FF9A3C",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 22,
    elevation: 12,
  },
  // A warm light behind the beast: it is what lifts a purple monster off a purple cave.
  medallionGlow: { position: "absolute", backgroundColor: "rgba(255, 170, 60, 0.2)" },
  menu: { gap: 8 },
  modeRow: { flexDirection: "row", gap: 8 },
  dock: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 24,
    backgroundColor: "rgba(10, 7, 24, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  dockItem: { flex: 1, alignItems: "center", gap: 4, minHeight: MIN_TOUCH + 18 },
  dockCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(242,193,78,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(242,193,78,0.55)",
  },
  dockLabel: { color: "#e6e1fa", fontSize: 11, fontWeight: "700", letterSpacing: 0.5, maxWidth: "100%" },
  settings: {
    position: "absolute",
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: "rgba(10,7,24,0.65)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default CoverCard;
