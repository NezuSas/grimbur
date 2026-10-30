import React, { useEffect, useRef, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Animated, Easing, useWindowDimensions } from "react-native";
import Text from "./Text";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ModeCard from "./ModeCard";
import PlayButton from "./PlayButton";
import EmberParticles from "./EmberParticles";
import { useSettingsStore } from "../../state/settings/store";
import StreakBadge from "./StreakBadge";
import { LinearGradient } from "expo-linear-gradient";
import SpriteImage from "./SpriteImage";
import PressScale from "./PressScale";
import { BOSS_FRAMES } from "./BossSprite";
import { MIN_TOUCH } from "../layout/useGameLayout";
import { haptic } from "../../shared/haptics";
import { emitSound } from "../../audio/audioEventBus";
import EmberIcon from "./EmberIcon";
import { useT } from "../../i18n/useT";
import GoalLine from "./GoalLine";
import type { Goal } from "../../core/stats/goals";
import { formatCountdown } from "../../core/stats/countdown";

/** The painted title (the name is a brand, so it is never translated). */
const LOGO = require("../../assets/sprites/ui/Logo_Grimbur.png");
const LOGO_RATIO = 1024 / 422;

type Props = {
  /** An expedition saved half-way: its floor, and whether it is an endless run. */
  savedRun: { floor: number; endless: boolean } | null;
  onPressResume: () => void;
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
  /** Pressing Play really opens the tutorial (never done nor skipped): only then is it promised. */
  tutorialPending: boolean;
  /** Something affordable in the Forge: a dot on its icon. */
  forgeBadge: boolean;
  /** Achievements unlocked since the screen was last opened: a dot on its icon. */
  achievementsBadge: boolean;
  /** Something can be bought (or claimed) in the outfit collection: a dot on its icon. */
  collectionBadge: boolean;
  /** Missions are ready to claim: a dot on their icon. */
  missionsBadge: boolean;
  onPressScores: () => void;
  onPressFriends: () => void;
  onPressInstructions: () => void;
  onPressForge: () => void;
  onPressAchievements: () => void;
  onPressCollection: () => void;
  onPressMissions: () => void;
  onPressSettings: () => void;
};

/** The Grimbur breathes: a slow, small swell so the cover is alive without being noisy. */
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
const DOCK_ART = {
  forge: require("../../assets/sprites/ui/Icon_Hammer.png"),
  missions: require("../../assets/sprites/ui/Icon_Flag.png"),
  rankings: require("../../assets/sprites/ui/Icon_Trophy.png"),
  friends: require("../../assets/sprites/ui/Icon_Swords.png"),
  collection: require("../../assets/sprites/cosmetics/Frame_Gold.png"),
  achievements: require("../../assets/sprites/ui/Icon_Medal.png"),
  manual: require("../../assets/sprites/ui/Icon_Puzzle.png"),
} as const;

const DockButton = ({ art, label, onPress, ui, dot, dotLabel, size }: { art: keyof typeof DOCK_ART; label: string; onPress: () => void; ui: number; dot?: boolean; dotLabel?: string; size: number }) => (
  <PressScale
    onPress={() => {
      haptic.impact();
      emitSound("UI_TAP");
      onPress();
    }}
    style={styles.dockItem}
    accessibilityRole="button"
    accessibilityLabel={dot && dotLabel ? `${label}. ${dotLabel}` : label}
  >
    <View style={[styles.dockCircle, { width: size, height: size, borderRadius: size / 2 }]}>
      <SpriteImage source={DOCK_ART[art]} style={{ width: size * 0.72, height: size * 0.72 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      {dot ? <View style={styles.dot} /> : null}
    </View>
    <Text style={[styles.dockLabel, { fontSize: Math.min(11.5 * ui, Math.max(10, size / 4)) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.1}>
      {label}
    </Text>
  </PressScale>
);

/**
 * The cover. There is no panel around everything: the title stands on the cave, the game modes are separate
 * cards, and the secondary screens are a row of round icons. Wide landscape windows put the title on the left
 * and the menu on the right; narrow ones stack everything in a column.
 */
const CoverCard: React.FC<Props> = ({
  savedRun,
  onPressResume,
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
  tutorialPending,
  forgeBadge,
  achievementsBadge,
  collectionBadge,
  onPressScores,
  onPressFriends,
  onPressInstructions,
  onPressForge,
  onPressMissions,
  missionsBadge,
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
  // The Grimbur half-closes its three eyes every few seconds: alive, not a poster.
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (calm) return;
    let hold: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      setBlink(true);
      hold = setTimeout(() => setBlink(false), 900);
    }, 4600);
    return () => {
      clearInterval(id);
      if (hold) clearTimeout(hold);
    };
  }, [calm]);
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
  const menuWidth = wide ? Math.min(540 * ui, width * 0.54) : Math.min(width - 32, 560 * Math.min(ui, 1.25));
  // Seven round buttons share the dock: they shrink on a narrow menu instead of touching each other.
  const dockSize = Math.max(38, Math.min(54 * ui, Math.floor((menuWidth - 16) / 7) - 6));
  // Room left for the title once the menu has taken its share (side margins and the gap between them included).
  // Wide screens keep clear of the torches that frame the cave on both sides.
  const sideMargin = wide ? Math.max(16, width * (width >= 1000 ? 0.12 : 0.07)) : 16;
  const leftWidth = wide ? width - menuWidth - sideMargin * 2 - 24 : width - 32;
  const titleSize = wide
    ? Math.max(28, Math.min(72, height * 0.17, leftWidth / 5.4))
    : Math.max(34, Math.min(56, width * 0.13, leftWidth / 5.4));
  const showArt = wide ? height >= 330 : height >= 700;
  const artSize = Math.min(wide ? height * 0.42 : 150, 260);
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

  const shade = Math.min(leftWidth * 1.1, 620);
  const title = (
    <View style={[styles.titleBlock, wide ? { flex: 1 } : { marginBottom: 6 }]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        {[1, 0.8, 0.6].map((k, i) => (
          <View key={i} style={{ position: "absolute", width: shade * k, height: shade * k * 0.75, borderRadius: shade, backgroundColor: "rgba(8,5,2,0.28)" }} />
        ))}
      </View>
      <SpriteImage
        source={LOGO}
        style={{ width: Math.min(leftWidth, titleSize * 5.6), height: Math.min(leftWidth, titleSize * 5.6) / LOGO_RATIO }}
        resizeMode="contain"
        accessible
        accessibilityRole="header"
        accessibilityLabel="Grimbur"
      />
      <Text style={[styles.titleSub, { fontSize: titleSize * 0.4, letterSpacing: titleSize * 0.14 }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>
        {t("cover.subtitle")}
      </Text>
      <Text style={styles.tagline} maxFontSizeMultiplier={1.2}>
        {t("cover.tagline")}
      </Text>
      {showArt && (
        <View style={{ width: artSize * 1.2, height: artSize * 0.92, alignItems: "center", justifyContent: "flex-end", marginTop: 2 }}>
          {/* A pool of firelight under the beast lifts it off the dark cave */}
          {[1, 0.75, 0.5].map((k, i) => (
            <View key={i} style={[styles.floorLight, { width: artSize * 1.1 * k, height: artSize * 0.22 * k, borderRadius: artSize, bottom: artSize * 0.02 * (1 - k) }]} />
          ))}
          <Breathing calm={calm}>
            <SpriteImage
              source={blink ? BOSS_FRAMES.breathe : BOSS_FRAMES.idle}
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
          <EmberIcon size={18} />
          <Text style={styles.chipText} maxFontSizeMultiplier={1.15}>
            {embers}
          </Text>
        </View>
      </View>
      {savedRun && (
        <ModeCard
          ui={ui}
          compactCard={short}
          icon="play"
          tint="#F2C14E"
          title={savedRun.endless ? t("cover.resume.endless") : t("cover.resume")}
          subtitle={t("cover.resume.floor", { floor: savedRun.floor })}
          onPress={onPressResume}
        />
      )}
      <PlayButton
        ui={ui}
        calm={calm}
        compact={short}
        title={t("cover.playBig")}
        subtitle={firstRun && tutorialPending ? t("cover.firstRun") : savedRun ? t("cover.newRunNote") : t("cover.mode.expedition.sub")}
        footnote={bestScore > 0 ? t("cover.best", { score: bestScore, floor: bestFloor }) : undefined}
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
        {!firstRun && <DockButton ui={ui} size={dockSize} art="forge" label={t("cover.forge")} onPress={onPressForge} dot={forgeBadge} dotLabel={t("a11y.badgeForge")} />}
        {!firstRun && <DockButton ui={ui} size={dockSize} art="missions" label={t("cover.missions")} onPress={onPressMissions} dot={missionsBadge} dotLabel={t("a11y.badgeMissions")} />}
        {!firstRun && <DockButton ui={ui} size={dockSize} art="rankings" label={t("cover.rankings")} onPress={onPressScores} />}
        {/* Friends stays reachable on a fresh install: a player invited with a challenge code must be able to enter it. */}
        <DockButton ui={ui} size={dockSize} art="friends" label={t("cover.friends")} onPress={onPressFriends} />
        {!firstRun && <DockButton ui={ui} size={dockSize} art="collection" label={t("cover.collection")} onPress={onPressCollection} dot={collectionBadge} dotLabel={t("a11y.badgeCollection")} />}
        {!firstRun && <DockButton ui={ui} size={dockSize} art="achievements" label={t("cover.achievements")} onPress={onPressAchievements} dot={achievementsBadge} dotLabel={t("a11y.badgeAchievements")} />}
        <DockButton ui={ui} size={dockSize} art="manual" label={t("cover.manual")} onPress={onPressInstructions} />
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient pointerEvents="none" colors={["rgba(8,5,2,0.62)", "rgba(8,5,2,0.15)", "rgba(8,5,2,0.6)"]} locations={[0, 0.48, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.5)"]} start={{ x: 0.5, y: 0.55 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
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
  lockedHint: { color: "#F8F6F3", fontSize: 12, fontWeight: "700", textAlign: "center", textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 6 },
  tagline: {
    color: "#F8F6F3",
    fontWeight: "600",
    fontSize: 13,
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 8,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  floorLight: { position: "absolute", bottom: 0, backgroundColor: "rgba(255,150,50,0.1)" },
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
    backgroundColor: "rgba(16, 10, 5, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(242,193,78,0.25)",
  },
  dockSolo: { flexDirection: "row", justifyContent: "center", marginTop: 2 },
  dockItem: { flex: 1, alignItems: "center", gap: 4, minHeight: MIN_TOUCH + 18 },
  dockCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(40,26,12,0.9)",
    borderWidth: 1.5,
    borderColor: "rgba(242,193,78,0.6)",
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
    borderColor: "#2A2016",
  },
  dockLabel: { color: "#F3EEE8", fontSize: 11, fontWeight: "700", letterSpacing: 0.5, maxWidth: "100%", textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 6 },
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
