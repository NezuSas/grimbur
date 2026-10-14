import React, { useEffect, useRef, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Pressable, Animated, Easing, useWindowDimensions } from "react-native";
import Text from "./Text";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ModeCard from "./ModeCard";
import PlayButton from "./PlayButton";
import EmberParticles from "./EmberParticles";
import { useSettingsStore } from "../../state/settings/store";
import StreakBadge from "./StreakBadge";
import SpriteImage from "./SpriteImage";
import { MIN_TOUCH } from "../layout/useGameLayout";
import { haptic } from "../../shared/haptics";
import { useT } from "../../i18n/useT";
import GoalLine from "./GoalLine";
import type { Goal } from "../../core/stats/goals";
import { formatCountdown } from "../../core/stats/countdown";

type Props = {
  onPressPlay: () => void;
  onPressDaily: () => void;
  onPressEndless: () => void;
  /** Current daily streak in days (0 when broken or never started). */
  streak: number;
  /** The daily has already been played today. */
  dailyDone: boolean;
  /** The endless descent opens after the first victory, floor 5 or 8 runs. */
  endlessUnlocked: boolean;
  /** How close the locked endless descent is to opening. */
  endlessProgress: { kind: "floor" | "games"; current: number; target: number };
  /** Milliseconds until the local midnight that changes the daily. */
  msLeft: number;
  /** Length of a streak that was just lost (0 when none) and the best one ever. */
  streakLost: number;
  bestStreak: number;
  /** The streak is alive only because a freeze will be spent. */
  freezeWillSave: boolean;
  /** The closest goal, shown under Play for returning players. */
  goal: Goal | null;
  /** Endless belongs to the paid full game and is not owned: the card shows a lock and the press opens the paywall. */
  endlessPaywalled?: boolean;
  bestEndlessFloor: number;
  /** Embers in the purse (shown as a chip). */
  embers: number;
  bestScore: number;
  bestFloor: number;
  /** Nothing played yet: the play button says what to expect. */
  firstRun: boolean;
  /** Something affordable in the Forge: a dot on its icon. */
  forgeBadge: boolean;
  /** Achievements unlocked since the screen was last opened: a dot on its icon. */
  achievementsBadge: boolean;
  /** Something can be bought (or claimed) in the outfit collection: a dot on its icon. */
  collectionBadge: boolean;
  onPressScores: () => void;
  onPressInstructions: () => void;
  onPressForge: () => void;
  onPressAchievements: () => void;
  onPressCollection: () => void;
  onPressSettings: () => void;
};

/** The Wumpus breathes: a slow, small swell so the cover is alive without being noisy. */
const Breathing = ({ children, calm }: { children: React.ReactNode; calm: boolean }) => {
  const swell = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (calm) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(swell, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(swell, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [calm, swell]);
  return <Animated.View style={{ transform: [{ scale: swell.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) }] }}>{children}</Animated.View>;
};

/** A round icon button with its name underneath: the menu dock. */
const DockButton = ({ icon, label, onPress, ui, dot, dotLabel }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; ui: number; dot?: boolean; dotLabel?: string }) => (
  <Pressable
    onPress={() => {
      haptic.impact();
      onPress();
    }}
    style={({ pressed }) => [styles.dockItem, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
    accessibilityRole="button"
    accessibilityLabel={dot && dotLabel ? `${label}. ${dotLabel}` : label}
  >
    <View style={[styles.dockCircle, { width: 52 * ui, height: 52 * ui, borderRadius: 26 * ui }]}>
      <Ionicons name={icon} size={24 * ui} color="#F2C14E" />
      {dot ? <View style={styles.dot} /> : null}
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
  endlessProgress,
  msLeft,
  streakLost,
  bestStreak,
  freezeWillSave,
  goal,
  endlessPaywalled = false,
  bestEndlessFloor,
  embers,
  bestScore,
  bestFloor,
  firstRun,
  forgeBadge,
  achievementsBadge,
  collectionBadge,
  onPressScores,
  onPressInstructions,
  onPressForge,
  onPressAchievements,
  onPressCollection,
  onPressSettings,
}) => {
  const { t } = useT();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const calm = useSettingsStore(st => st.reduceFlash);
  // Tapping the locked endless mode says how to open it instead of starting something else.
  const [lockedHint, setLockedHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
  }, []);
  const showLockedHint = () => {
    setLockedHint(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setLockedHint(false), 3500);
  };

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
  const short = height < 420;
  const sideRow = menuWidth >= (short ? 300 : 480);
  // On short wide windows the menu's right edge can reach the settings button: keep the ember chip clear of it.
  const menuRight = width - Math.max(insets.right, sideMargin);
  const settingsLeft = width - Math.max(insets.right, 12) - MIN_TOUCH;
  const chipClear = wide && height < 460 && menuRight > settingsLeft - 4 ? menuRight - settingsLeft + 8 : 0;

  const time = formatCountdown(msLeft);
  const dailySubtitle = dailyDone
    ? t("cover.daily.doneIn", { time })
    : freezeWillSave
    ? t("cover.daily.freeze")
    : streak > 0
    ? t("cover.daily.riskIn", { count: streak, time })
    : streakLost > 0
    ? t("cover.streak.lost", { best: bestStreak })
    : t("cover.daily.todayIn", { time });

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
          <Breathing calm={calm}>
            <SpriteImage
              source={require("../../assets/sprites/enemies/Wumpus_Boss.png")}
              style={{ width: artSize, height: artSize }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </Breathing>
        </View>
      )}
    </View>
  );

  const menu = (
    <View style={[styles.menu, { width: menuWidth, gap: short ? 6 : 8 }]}>
      <View style={[styles.chips, chipClear > 0 && { marginRight: chipClear }]}>
        <View style={styles.chip} accessible accessibilityLabel={`${embers} ${t("cover.embers")}`}>
          <Text style={styles.chipFlame}>🔥</Text>
          <Text style={styles.chipText} maxFontSizeMultiplier={1.15}>
            {embers}
          </Text>
        </View>
      </View>
      <PlayButton
        ui={ui}
        calm={calm}
        compact={short}
        title={t("cover.playBig")}
        subtitle={firstRun ? t("cover.firstRun") : t("cover.mode.expedition.sub")}
        footnote={bestScore > 0 ? t("cover.best", { score: bestScore.toLocaleString(), floor: bestFloor }) : undefined}
        onPress={onPressPlay}
      />
      {/* On very short windows the goal line would push the dock off the screen: it waits for more room. */}
      {!firstRun && goal && height >= 340 ? <GoalLine goal={goal} small scale={ui} /> : null}
      {/* The first time only the play button and the manual are offered; the rest appears after the first run. */}
      {!firstRun && (
      <View style={[styles.modeRow, !sideRow && { flexDirection: "column" }]}>
        <ModeCard
          ui={ui}
          compactCard={short}
          icon="calendar"
          tint="#FF9A3C"
          title={t("cover.mode.daily")}
          subtitle={dailySubtitle}
          onPress={onPressDaily}
          leading={<StreakBadge days={streak} doneToday={dailyDone} />}
        />
        <ModeCard
          ui={ui}
          compactCard={short}
          icon="infinite"
          tint="#B39DDB"
          title={t("cover.mode.endless")}
          subtitle={
            endlessPaywalled
              ? t("cover.mode.endless.paid")
              : endlessUnlocked
              ? bestEndlessFloor > 0
                ? t("cover.mode.endless.best", { floor: bestEndlessFloor })
                : t("cover.mode.endless.sub")
              : endlessProgress.kind === "floor"
              ? t("cover.mode.endless.progressFloor", endlessProgress)
              : t("cover.mode.endless.progressGames", endlessProgress)
          }
          locked={endlessPaywalled || !endlessUnlocked}
          onPress={endlessPaywalled || endlessUnlocked ? onPressEndless : showLockedHint}
        />
      </View>
      )}
      {lockedHint && !endlessUnlocked && (
        <Text style={styles.lockedHint} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.2}>
          {t("cover.mode.endless.locked")}
        </Text>
      )}

      {/* A lone manual button gets no box around it: a panel for one icon looks like a mistake. */}
      <View style={firstRun ? styles.dockSolo : styles.dock}>
        {!firstRun && <DockButton ui={ui} icon="hammer" label={t("cover.forge")} onPress={onPressForge} dot={forgeBadge} dotLabel={t("a11y.badgeForge")} />}
        {!firstRun && <DockButton ui={ui} icon="podium" label={t("cover.rankings")} onPress={onPressScores} />}
        {!firstRun && <DockButton ui={ui} icon="shirt" label={t("cover.collection")} onPress={onPressCollection} dot={collectionBadge} dotLabel={t("a11y.badgeCollection")} />}
        {!firstRun && <DockButton ui={ui} icon="ribbon" label={t("cover.achievements")} onPress={onPressAchievements} dot={achievementsBadge} dotLabel={t("a11y.badgeAchievements")} />}
        <DockButton ui={ui} icon="help-circle" label={t("cover.manual")} onPress={onPressInstructions} />
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      {!calm && <EmberParticles count={width >= 900 ? 18 : 12} />}
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
  lockedHint: { color: "#f0ecff", fontSize: 12, fontWeight: "700", textAlign: "center", textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 6 },
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
  dockSolo: { flexDirection: "row", justifyContent: "center", marginTop: 2 },
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
  chips: { flexDirection: "row", justifyContent: "flex-end" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: "rgba(10,7,24,0.72)",
    borderWidth: 1.5,
    borderColor: "rgba(255,171,64,0.6)",
  },
  chipFlame: { fontSize: 15 },
  chipText: { color: "#FFAB40", fontWeight: "800", fontSize: 15 },
  dot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF4D4D",
    borderWidth: 2,
    borderColor: "#1a1030",
  },
  dockLabel: { color: "#e6e1fa", fontSize: 11, fontWeight: "700", letterSpacing: 0.5, maxWidth: "100%", textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 6 },
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
