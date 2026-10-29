import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  FlatList,
  ImageBackground,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { RootStackParamList } from "../navigation/types";
import {
  ACHIEVEMENT_THEMES,
  achievementArt,
  achievementTheme,
  themeArt,
  type AchievementTheme,
} from "../ui/achievementArt";
import SpriteImage from "../ui/components/SpriteImage";
import Rise, { riseDelay } from "../ui/components/Rise";
import PressScale from "../ui/components/PressScale";
import Text from "../ui/components/Text";
import EmberIcon from "../ui/components/EmberIcon";
import ScreenHeader from "../ui/components/ScreenHeader";
import CosmeticPreview from "./collection/CosmeticPreview";
import { useWindowDimensions } from "../ui/layout/scaledWindow";
import { useGameLayout } from "../ui/layout/useGameLayout";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_REWARD,
  TIER_ORDER,
  AchievementInfo,
  AchievementTier,
} from "../core/stats/achievements";
import { COSMETICS } from "../core/cosmetics/cosmetics";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { closestAchievements } from "../core/stats/goals";
import {
  getLocalStats,
  peekLocalStats,
  syncAchievements,
} from "../services/localStats";
import characters from "../data/characters";
import { useT } from "../i18n/useT";
import { useSettingsStore } from "../state/settings/store";
import { achievementText, cosmeticText } from "../i18n/keys";
import type { TranslationKey } from "../i18n/en";

type Props = NativeStackScreenProps<RootStackParamList, "AchievementsScreen">;
type Filter = "all" | "todo" | "done";
type Theme = AchievementTheme | "all";

const GOLD = "#F2C14E";
const TIER_COLOR: Record<AchievementTier, string> = {
  easy: "#A5D6A7",
  medium: "#90CAF9",
  hard: "#FFAB91",
  legend: "#CE93D8",
};
const TILE = 96;
const TILE_GAP = 8;

const progressOf = (a: AchievementInfo, stats: LocalStats) => {
  const p = a.progress ? a.progress(stats) : null;
  return p && p.target > 0
    ? {
        current: Math.min(p.current, p.target),
        target: p.target,
        ratio: Math.min(1, p.current / p.target),
      }
    : null;
};

/** The frames and titles an achievement hands out besides its embers. */
const cosmeticRewards = (id: string) =>
  COSMETICS.filter(
    (c) => c.unlock?.kind === "achievement" && c.unlock.id === id,
  );

type TileProps = {
  a: AchievementInfo;
  unlockedOn: string | undefined;
  ratio: number | null;
  selected: boolean;
  index: number;
  onPress: (id: string) => void;
};

/** One emblem in the wall: bright when earned, dim with its bar when still open, ringed in gold when it is the one on show. */
const Tile = memo(
  ({ a, unlockedOn, ratio, selected, index, onPress }: TileProps) => {
    const { t } = useT();
    const name = achievementText(t, a.id, "name");
    const earned = unlockedOn !== undefined;
    return (
      <Rise delay={riseDelay(index, 40)}>
        <PressScale
          onPress={() => onPress(a.id)}
          style={[
            styles.tile,
            earned ? styles.tileEarned : styles.tileOpen,
            selected && styles.tileSelected,
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={`${name}. ${unlockedOn ? t("ach.unlockedOn", { date: unlockedOn }) : t("ach.locked")}`}
        >
          <View
            style={[styles.tierDot, { backgroundColor: TIER_COLOR[a.tier] }]}
          />
          <SpriteImage
            source={achievementArt(a)}
            style={[styles.tileArt, !earned && styles.artLocked]}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          {earned ? (
            <View style={styles.tileCheck}>
              <Ionicons name="checkmark" size={12} color="#1a0f00" />
            </View>
          ) : null}
          <Text
            style={[styles.tileName, !earned && { color: "#CDBFB1" }]}
            numberOfLines={2}
            maxFontSizeMultiplier={1.05}
          >
            {name}
          </Text>
          {!earned && ratio !== null ? (
            <View style={styles.tileTrack}>
              <View
                style={[
                  styles.tileFill,
                  { width: `${Math.max(4, Math.round(ratio * 100))}%` },
                ]}
              />
            </View>
          ) : null}
        </PressScale>
      </Rise>
    );
  },
);

/** A soft glow that breathes behind an earned emblem (still when calm). */
const Glow = ({ size, color }: { size: number; color: string }) => {
  const calm = useSettingsStore((s) => s.reduceFlash);
  const v = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    if (calm) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0.6,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [calm, v]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] }),
        transform: [{ scale: v }],
      }}
    />
  );
};

const AchievementsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useT();
  const { width, height } = useWindowDimensions();
  const { insets } = useGameLayout();
  const [stats, setStats] = useState<LocalStats>(
    () => peekLocalStats() ?? EMPTY_STATS,
  );
  const setAchievementsSeen = useSettingsStore((st) => st.setAchievementsSeen);
  const [filter, setFilter] = useState<Filter>("all");
  const [theme, setTheme] = useState<Theme>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [browseWidth, setBrowseWidth] = useState(0);

  useFocusEffect(
    useCallback(() => {
      // Unlocks what the numbers already satisfy first, so a full bar never sits next to a locked emblem.
      syncAchievements()
        .then((r) => r.stats)
        .catch(() => getLocalStats())
        .then((loaded) => {
          setStats(loaded);
          setAchievementsSeen(Object.keys(loaded.achievements).length); // clears the red dot on the cover
        })
        .catch(() => {});
    }, []),
  );

  const earnedOf = (id: string) => id in stats.achievements;

  // Open ones first (the nearest to done on top, easy before hard), then the earned ones, newest first.
  const ordered = useMemo(() => {
    const open = ACHIEVEMENTS.filter((a) => !(a.id in stats.achievements)).sort(
      (x, y) => {
        const rx = progressOf(x, stats)?.ratio ?? 0;
        const ry = progressOf(y, stats)?.ratio ?? 0;
        return ry - rx || TIER_ORDER[x.tier] - TIER_ORDER[y.tier];
      },
    );
    const earned = ACHIEVEMENTS.filter((a) => a.id in stats.achievements).sort(
      (a, b) =>
        stats.achievements[b.id].localeCompare(stats.achievements[a.id]),
    );
    return [...open, ...earned];
  }, [stats]);

  const byTheme = useMemo(() => {
    const m = new Map<AchievementTheme, { done: number; total: number }>();
    for (const a of ACHIEVEMENTS) {
      const k = achievementTheme(a);
      const c = m.get(k) ?? { done: 0, total: 0 };
      c.total += 1;
      if (a.id in stats.achievements) c.done += 1;
      m.set(k, c);
    }
    return m;
  }, [stats]);

  const visible = ordered.filter(
    (a) =>
      (theme === "all" || achievementTheme(a) === theme) &&
      (filter === "all" || (filter === "done") === earnedOf(a.id)),
  );

  const nextGoals = useMemo(
    () =>
      closestAchievements(stats, 3).map((g) =>
        ACHIEVEMENTS.find((x) => x.id === g.id)!,
      ),
    [stats],
  );
  const done = Object.keys(stats.achievements).filter((id) =>
    ACHIEVEMENTS.some((a) => a.id === id),
  ).length;
  const total = ACHIEVEMENTS.length;
  const pending = ACHIEVEMENTS.filter((a) => !earnedOf(a.id)).reduce(
    (sum, a) => sum + ACHIEVEMENT_REWARD[a.tier],
    0,
  );

  // What the showcase shows: the tapped emblem, else the goal closest to done, else the first one listed.
  const selected =
    ACHIEVEMENTS.find((a) => a.id === selectedId) ??
    nextGoals[0] ??
    visible[0] ??
    ordered[0];

  const narrow = width < 640;
  const columns = Math.max(
    1,
    Math.floor((browseWidth + TILE_GAP) / (TILE + TILE_GAP)),
  );
  const tileWidth =
    browseWidth > 0
      ? Math.floor((browseWidth - TILE_GAP * (columns - 1)) / columns)
      : TILE;

  const pick = useCallback((id: string) => setSelectedId(id), []);

  // Most phones on their side are under 430 px tall: the showcase tightens up so the whole column fits.
  const showcase = selected ? (
    <Showcase
      a={selected}
      stats={stats}
      earned={earnedOf(selected.id)}
      compact={narrow || height < 430}
    />
  ) : null;

  return (
    <ImageBackground
      fadeDuration={0}
      resizeMethod="none"
      source={require("../assets/sprites/backgrounds/Cover_Background.png")}
      style={styles.root}
      resizeMode="cover"
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "rgba(13, 10, 7,0.88)" }}
        edges={["top", "left", "right"]}
      >
        <ScreenHeader
          title={t("ach.title")}
          subtitle={t("ach.progress", { done, total })}
          onBack={() => navigation.goBack()}
          right={
            <View
              style={styles.headerChip}
              accessible
              accessibilityLabel={t("ach.pending", { embers: pending })}
            >
              <EmberIcon size={16} />
              <Text style={styles.headerChipText} maxFontSizeMultiplier={1.1}>
                +{pending.toLocaleString()}
              </Text>
            </View>
          }
        />

        <View
          style={[
            styles.body,
            narrow && styles.bodyNarrow,
            { paddingBottom: Math.max(insets.bottom, 8) },
          ]}
        >
          <ScrollView
            style={[styles.side, narrow && styles.sideNarrow]}
            contentContainerStyle={styles.sideContent}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={styles.overall}
              accessible
              accessibilityLabel={t("ach.percent", {
                n: Math.round((done / total) * 100),
              })}
            >
              <Text style={styles.overallBig} maxFontSizeMultiplier={1.1}>
                {done}
                <Text style={styles.overallSmall}>/{total}</Text>
              </Text>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    { width: `${Math.round((done / total) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.overallPct} maxFontSizeMultiplier={1.1}>
                {Math.round((done / total) * 100)}%
              </Text>
            </View>

            {showcase}

            {nextGoals.length > 0 && !narrow ? (
              <View style={styles.almost}>
                <Text style={styles.almostTitle} maxFontSizeMultiplier={1.1}>
                  {t("ach.almost").toLocaleUpperCase()}
                </Text>
                <View style={styles.almostRow}>
                  {nextGoals.map((g) => {
                    const p = progressOf(g, stats);
                    const on = g.id === selected?.id;
                    return (
                      <PressScale
                        key={g.id}
                        onPress={() => pick(g.id)}
                        style={[styles.almostItem, on && styles.almostItemOn]}
                        accessibilityRole="button"
                        accessibilityLabel={`${achievementText(t, g.id, "name")}. ${p ? `${p.current}/${p.target}` : ""}`}
                      >
                        <SpriteImage
                          source={achievementArt(g)}
                          style={styles.almostArt}
                          resizeMode="contain"
                          accessibilityIgnoresInvertColors
                        />
                        <Text
                          style={styles.almostPct}
                          maxFontSizeMultiplier={1.05}
                        >
                          {p ? `${Math.round(p.ratio * 100)}%` : ""}
                        </Text>
                      </PressScale>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.browse}>
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0 }}
                contentContainerStyle={styles.themes}
              >
                {(["all", ...ACHIEVEMENT_THEMES] as Theme[]).map((k) => {
                  const on = theme === k;
                  const count =
                    k === "all"
                      ? { done, total }
                      : (byTheme.get(k) ?? { done: 0, total: 0 });
                  if (count.total === 0) return null;
                  const complete = count.done === count.total;
                  const label = t(`ach.theme.${k}` as TranslationKey);
                  return (
                    <PressScale
                      key={k}
                      onPress={() => setTheme(k)}
                      style={[
                        styles.theme,
                        on && styles.themeOn,
                        complete && !on && styles.themeComplete,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${label}. ${count.done}/${count.total}`}
                    >
                      {k === "all" ? (
                        <Ionicons
                          name="trophy"
                          size={18}
                          color={on ? "#1a0f00" : GOLD}
                        />
                      ) : (
                        <SpriteImage
                          source={themeArt(k)}
                          style={styles.themeArt}
                          resizeMode="contain"
                          accessibilityIgnoresInvertColors
                        />
                      )}
                      <View>
                        {on || k === "all" ? (
                          <Text
                            style={[styles.themeName, on && styles.themeTextOn]}
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.05}
                          >
                            {label}
                          </Text>
                        ) : null}
                        <Text
                          style={[
                            styles.themeCount,
                            on && styles.themeTextOn,
                            complete && !on && { color: GOLD },
                          ]}
                          maxFontSizeMultiplier={1.05}
                        >
                          {count.done}/{count.total}
                        </Text>
                      </View>
                    </PressScale>
                  );
                })}
              </ScrollView>
              {/* The families run off the right edge: the fade says the row goes on. */}
              <LinearGradient
                pointerEvents="none"
                colors={["rgba(13,10,7,0)", "rgba(13,10,7,0.95)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.themesFade}
              />
            </View>

            <View style={styles.filters}>
              {(["all", "todo", "done"] as const).map((key) => (
                <PressScale
                  key={key}
                  onPress={() => setFilter(key)}
                  hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                  style={[styles.chip, filter === key && styles.chipOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === key }}
                  accessibilityLabel={t(`ach.filter.${key}` as TranslationKey)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filter === key && styles.themeTextOn,
                    ]}
                    maxFontSizeMultiplier={1.05}
                  >
                    {t(
                      `ach.filter.${key}` as TranslationKey,
                    ).toLocaleUpperCase()}
                  </Text>
                </PressScale>
              ))}
            </View>

            <View
              style={{ flex: 1 }}
              onLayout={(e) => setBrowseWidth(e.nativeEvent.layout.width)}
            >
              {browseWidth > 0 ? (
                <FlatList
                  key={`${columns}-${theme}-${filter}`}
                  data={visible}
                  numColumns={columns}
                  keyExtractor={(a) => a.id}
                  contentContainerStyle={{ gap: TILE_GAP, paddingBottom: 16 }}
                  columnWrapperStyle={
                    columns > 1 ? { gap: TILE_GAP } : undefined
                  }
                  initialNumToRender={24}
                  ListEmptyComponent={
                    <Text style={styles.empty} maxFontSizeMultiplier={1.2}>
                      {t("ach.empty")}
                    </Text>
                  }
                  renderItem={({ item, index }) => (
                    <View style={{ width: tileWidth }}>
                      <Tile
                        a={item}
                        unlockedOn={stats.achievements[item.id]}
                        ratio={progressOf(item, stats)?.ratio ?? null}
                        selected={item.id === selected?.id}
                        index={index}
                        onPress={pick}
                      />
                    </View>
                  )}
                />
              ) : null}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

/** The emblem on show: big, with its family, tier, what it asks, how far along it is and everything it pays. */
const Showcase = ({
  a,
  stats,
  earned,
  compact,
}: {
  a: AchievementInfo;
  stats: LocalStats;
  earned: boolean;
  compact: boolean;
}) => {
  const { t } = useT();
  const p = progressOf(a, stats);
  const theme = achievementTheme(a);
  const extras = cosmeticRewards(a.id);
  const art = compact ? 70 : 96;
  const tier = TIER_COLOR[a.tier];
  return (
    <Rise
      key={a.id}
      style={[
        styles.show,
        compact && styles.showCompact,
        earned ? styles.showEarned : styles.showOpen,
      ]}
    >
      <View style={styles.showTop}>
        <View
          style={{
            width: art,
            height: art,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {earned ? <Glow size={art * 1.05} color={GOLD} /> : null}
          <SpriteImage
            source={achievementArt(a)}
            style={[{ width: art, height: art }, !earned && styles.artLocked]}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          {!earned ? (
            <View style={styles.showLock}>
              <Ionicons name="lock-closed" size={14} color="#EAE1D8" />
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.tags}>
            <Text
              style={styles.themeTag}
              numberOfLines={1}
              maxFontSizeMultiplier={1.05}
            >
              {t(`ach.theme.${theme}` as TranslationKey).toLocaleUpperCase()}
            </Text>
            <View style={[styles.tier, { borderColor: tier + "99" }]}>
              <Text
                style={[styles.tierText, { color: tier }]}
                maxFontSizeMultiplier={1.05}
              >
                {t(`ach.tier.${a.tier}` as TranslationKey).toLocaleUpperCase()}
              </Text>
            </View>
          </View>
          <Text
            style={[styles.showName, compact && { fontSize: 16 }]}
            numberOfLines={2}
            maxFontSizeMultiplier={1.1}
          >
            {achievementText(t, a.id, "name")}
          </Text>
          <Text
            style={styles.showDesc}
            numberOfLines={3}
            maxFontSizeMultiplier={1.15}
          >
            {achievementText(t, a.id, "desc")}
          </Text>
        </View>
      </View>

      {earned ? (
        <View style={styles.dateRow}>
          <Ionicons name="checkmark-circle" size={16} color="#9EE37D" />
          <Text style={styles.date} maxFontSizeMultiplier={1.1}>
            {t("ach.unlockedOn", { date: stats.achievements[a.id] })}
          </Text>
        </View>
      ) : p ? (
        <View style={styles.showProgress}>
          <View style={styles.showTrack}>
            <View
              style={[
                styles.showFill,
                { width: `${Math.max(2, Math.round(p.ratio * 100))}%` },
              ]}
            />
          </View>
          <Text style={styles.showCount} maxFontSizeMultiplier={1.1}>
            {p.current.toLocaleString()}/{p.target.toLocaleString()}
          </Text>
        </View>
      ) : (
        <Text style={styles.hint} maxFontSizeMultiplier={1.1}>
          {t("ach.noProgress")}
        </Text>
      )}

      <View style={styles.rewards}>
        <View
          style={[styles.reward, earned && styles.rewardDone]}
          accessible
          accessibilityLabel={`${t("ach.reward")}: ${ACHIEVEMENT_REWARD[a.tier]}`}
        >
          <EmberIcon size={15} />
          <Text
            style={[styles.rewardText, earned && { color: "#9EE37D" }]}
            maxFontSizeMultiplier={1.05}
          >
            {earned ? t("ach.rewardClaimed") : `+${ACHIEVEMENT_REWARD[a.tier]}`}
          </Text>
        </View>
        {extras.map((c) => (
          <View
            key={c.id}
            style={styles.extra}
            accessible
            accessibilityLabel={`${t("ach.unlocks")}: ${cosmeticText(t, c.id)}`}
          >
            <CosmeticPreview
              id={c.id}
              size={30}
              portrait={characters[0].scoreImage}
              small
            />
            <Text
              style={styles.extraText}
              numberOfLines={1}
              maxFontSizeMultiplier={1.05}
            >
              {cosmeticText(t, c.id)}
            </Text>
          </View>
        ))}
      </View>
    </Rise>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  headerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,171,64,0.14)",
    borderWidth: 1.5,
    borderColor: "rgba(255,171,64,0.6)",
  },
  headerChipText: { color: "#FFAB40", fontWeight: "900", fontSize: 15 },

  body: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 2,
  },
  bodyNarrow: { flexDirection: "column" },
  side: { width: "38%", maxWidth: 420, flexGrow: 0 },
  sideContent: { gap: 8, paddingBottom: 6 },
  sideNarrow: { width: "100%", maxWidth: undefined, maxHeight: "50%" },
  browse: { flex: 1, gap: 6 },

  overall: { flexDirection: "row", alignItems: "center", gap: 8 },
  overallBig: { color: GOLD, fontWeight: "900", fontSize: 22 },
  overallSmall: { color: "#CDBFB1", fontWeight: "800", fontSize: 14 },
  overallPct: { color: "#DCCEBF", fontWeight: "800", fontSize: 12 },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 4, backgroundColor: GOLD },

  show: { borderRadius: 18, borderWidth: 1.5, padding: 12, gap: 8 },
  showCompact: { padding: 10, gap: 6 },
  showEarned: {
    backgroundColor: "rgba(242,193,78,0.1)",
    borderColor: "rgba(242,193,78,0.6)",
  },
  showOpen: {
    backgroundColor: "rgba(36,28,19,0.88)",
    borderColor: "rgba(255,255,255,0.14)",
  },
  showTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  showLock: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#413223",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  tags: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  themeTag: {
    color: GOLD,
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  tier: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 5,
    paddingVertical: 0,
  },
  tierText: { fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  showName: { color: "#fff", fontWeight: "900", fontSize: 18 },
  showDesc: { color: "#DCCEBF", fontSize: 13 },
  showProgress: { flexDirection: "row", alignItems: "center", gap: 8 },
  showTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  showFill: { height: "100%", borderRadius: 5, backgroundColor: "#90CAF9" },
  showCount: { color: "#EAE1D8", fontWeight: "900", fontSize: 13 },
  hint: { color: "#BFAE9C", fontSize: 12, fontStyle: "italic" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  date: { color: "#B7F2A0", fontSize: 13, fontWeight: "800" },
  rewards: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  reward: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    minHeight: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,171,64,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,171,64,0.55)",
  },
  rewardDone: {
    backgroundColor: "rgba(158,227,125,0.1)",
    borderColor: "rgba(158,227,125,0.5)",
  },
  rewardText: { color: "#FFAB40", fontWeight: "900", fontSize: 13 },
  extra: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 10,
    paddingLeft: 2,
    minHeight: 30,
    maxWidth: 200,
    borderRadius: 15,
    backgroundColor: "rgba(206,147,216,0.12)",
    borderWidth: 1,
    borderColor: "rgba(206,147,216,0.55)",
  },
  extraText: {
    color: "#E1BEE7",
    fontWeight: "800",
    fontSize: 12,
    flexShrink: 1,
  },

  almost: { gap: 5 },
  almostTitle: {
    color: GOLD,
    fontWeight: "900",
    letterSpacing: 2,
    fontSize: 11,
  },
  almostRow: { flexDirection: "row", gap: 8 },
  almostItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(242,193,78,0.35)",
    backgroundColor: "rgba(242,193,78,0.07)",
  },
  almostItemOn: { borderColor: GOLD, backgroundColor: "rgba(242,193,78,0.18)" },
  almostArt: { width: 30, height: 30 },
  almostPct: { color: "#EAE1D8", fontWeight: "900", fontSize: 12 },

  themes: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
    paddingRight: 28,
  },
  themesFade: { position: "absolute", right: 0, top: 0, bottom: 0, width: 36 },
  theme: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 40,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(232,176,74,0.35)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  themeOn: { backgroundColor: "#E8B04A", borderColor: "#E8B04A" },
  themeComplete: {
    borderColor: GOLD,
    backgroundColor: "rgba(242,193,78,0.12)",
  },
  themeArt: { width: 28, height: 28 },
  themeName: { color: "#EAE1D8", fontWeight: "900", fontSize: 12 },
  themeCount: { color: "#CDBFB1", fontWeight: "800", fontSize: 11 },
  themeTextOn: { color: "#1a0f00" },

  filters: { flexDirection: "row", gap: 6 },
  chip: {
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: GOLD, borderColor: GOLD },
  chipText: {
    color: "#EAE1D8",
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 1,
  },
  empty: { color: "#CAB39C", fontSize: 13, padding: 12 },

  tile: {
    alignItems: "center",
    gap: 3,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    minHeight: 116,
  },
  tileEarned: {
    backgroundColor: "rgba(242,193,78,0.09)",
    borderColor: "rgba(242,193,78,0.45)",
  },
  tileOpen: {
    backgroundColor: "rgba(36,28,19,0.8)",
    borderColor: "rgba(255,255,255,0.1)",
  },
  tileSelected: {
    borderColor: "#FFE08A",
    borderWidth: 2.5,
    backgroundColor: "rgba(242,193,78,0.2)",
  },
  tileArt: { width: 54, height: 54 },
  // Not earned yet: the emblem is there but dim, so the goal is visible without looking won.
  artLocked: { opacity: 0.35 },
  tierDot: {
    position: "absolute",
    top: 7,
    left: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  tileCheck: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#9EE37D",
    alignItems: "center",
    justifyContent: "center",
  },
  tileName: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 13,
  },
  tileTrack: {
    alignSelf: "stretch",
    marginHorizontal: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  tileFill: { height: "100%", borderRadius: 2, backgroundColor: "#90CAF9" },
});

export default AchievementsScreen;
