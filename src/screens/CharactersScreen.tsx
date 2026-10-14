// src/screens/CharactersScreen.tsx
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ImageBackground,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Text from "../ui/components/Text";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import characters from "../data/characters";
import { RootStackParamList } from "../navigation/types";
import { useFocusEffect } from "@react-navigation/native";
import { emitSound } from "../audio/audioEventBus";
import { SafeAreaView } from "react-native-safe-area-context";
import { GAME_CONFIG } from "../config/gameConfig";
import { getLocalStats } from "../services/localStats";
import { EMPTY_STATS, LocalStats } from "../core/stats/runStats";
import { isHeroUnlocked } from "../core/stats/heroUnlocks";
import { cycleHero, heroLockProgress, startingHero } from "../core/stats/heroProgress";
import { HEROES } from "../core/engine/heroes";
import { abilityCooldown } from "../core/engine/shop";
import { MIN_TOUCH } from "../ui/layout/useGameLayout";
import { ABILITY_ART } from "../ui/toolArt";
import { Ionicons } from "@expo/vector-icons";
import { useT } from "../i18n/useT";
import { heroText, unlockText } from "../i18n/keys";
import { useSettingsStore } from "../state/settings/store";
import { MAX_ASCENSION, ascensionRuleKey } from "../core/engine/ascension";
import { metaEffects } from "../core/stats/forge";
import { dailyKey } from "../core/engine/seed";
import { haptic } from "../shared/haptics";
import type { TranslationKey } from "../i18n/en";
import SpriteImage from "../ui/components/SpriteImage";
import { SKIN_ACCENT, skinArt, type SkinId } from "../data/skinArt";
import { equippedSkin, ownedSkins } from "../core/skins/ownership";
import { equipSkinFor, peekLocalStats } from "../services/localStats";
import { skinText } from "../i18n/keys";

type Props = NativeStackScreenProps<RootStackParamList, "CharactersScreen">;

/** Accent per hero, in the same hue as the character but softer than a pure screen colour. */
const HERO_ACCENT = ["#69C3DE", "#E5737E", "#97C46E", "#E8BA52"] as const;
const accentOf = (heroIndex: number) => HERO_ACCENT[heroIndex] ?? "#E8BA52";
const HERO_COUNT = characters.length;

/** A few motes of the hero's colour that rise behind it, so the stage feels alive. */
const SPARKS = [
  { x: 0.16, duration: 3200, delay: 0, size: 5 },
  { x: 0.3, duration: 2600, delay: 700, size: 4 },
  { x: 0.44, duration: 3600, delay: 300, size: 6 },
  { x: 0.58, duration: 2900, delay: 1200, size: 4 },
  { x: 0.7, duration: 3300, delay: 500, size: 5 },
  { x: 0.84, duration: 2700, delay: 1500, size: 4 },
] as const;

const Spark = ({ color, x, duration, delay, size, rise }: { color: string; x: number; duration: number; delay: number; size: number; rise: number }) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, duration, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        bottom: 24,
        left: `${x * 100}%`,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] }),
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -rise] }) }],
      }}
    />
  );
};

type ThumbProps = { heroIndex: number; skin: SkinId; selected: boolean; locked: boolean; size: number; onPress: (heroIndex: number) => void };

/** A small round portrait in the roster under the stage: the selected one is bigger and ringed in its colour. */
const Thumb = memo(({ heroIndex, skin, selected, locked, size, onPress }: ThumbProps) => {
  const { t } = useT();
  const accent = accentOf(heroIndex);
  const box = selected ? size + 12 : size;
  const name = heroText(t, heroIndex, "name");
  return (
    <TouchableOpacity
      onPress={() => onPress(heroIndex)}
      activeOpacity={0.8}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={t("heroes.rosterItem", { name, state: locked ? t("heroes.state.locked") : t("heroes.state.open") })}
      style={[
        styles.thumb,
        { width: box, height: box, borderRadius: box / 2, borderColor: selected ? accent : "rgba(255,255,255,0.22)", borderWidth: selected ? 3 : 1.5 },
        selected && { shadowColor: accent, shadowOpacity: 0.9, shadowRadius: 12, elevation: 10, backgroundColor: accent + "33" },
      ]}
    >
      <SpriteImage
        source={skinArt(heroIndex, skin).scoreImage}
        style={{ width: box * 0.82, height: box * 0.82, borderRadius: box * 0.41, ...(locked ? { tintColor: "#0b0716" } : null) }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      {locked && (
        <View style={styles.thumbLock}>
          <Ionicons name="lock-closed" size={Math.max(10, size * 0.3)} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
});

type SwatchProps = { heroIndex: number; skin: SkinId; previewing: boolean; owned: boolean; equipped: boolean; onPress: (skin: SkinId) => void };

/**
 * One outfit in the picker: a round chip in the outfit's colour with a check when it is worn. The selection ring is the
 * border of a fixed-size wrapper (not a scale or a shadow, which Android and iOS draw differently and which made the ring
 * spill out of the chip), so every state takes exactly the same space.
 */
const SWATCH = 32;
const RING = 3;
const Swatch = memo(({ heroIndex, skin, previewing, owned, equipped, onPress }: SwatchProps) => {
  const { t } = useT();
  const color = skin === "classic" ? accentOf(heroIndex) : SKIN_ACCENT[skin];
  const box = SWATCH + (RING + 2) * 2;
  return (
    <TouchableOpacity
      onPress={() => onPress(skin)}
      activeOpacity={0.8}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
      accessibilityRole="button"
      accessibilityState={{ selected: previewing }}
      accessibilityLabel={`${skinText(t, skin)}. ${owned ? (equipped ? t("skin.equipped") : t("skin.owned")) : t("heroes.state.locked")}`}
      style={[styles.swatchRing, { width: box, height: box, borderRadius: box / 2, borderColor: previewing ? "#fff" : "transparent" }]}
    >
      <View style={[styles.swatch, { backgroundColor: color + (owned ? "" : "55") }]}>
        {!owned && <Ionicons name="lock-closed" size={13} color="#fff" />}
        {equipped && <Ionicons name="checkmark" size={18} color="#111" />}
      </View>
    </TouchableOpacity>
  );
});

const CharactersScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t, plural } = useT();
  const { width, height } = useWindowDimensions();
  const mode = route.params?.mode ?? "expedition";
  const tutorialSeen = useSettingsStore(s => s.tutorialSeen);
  const lastHero = useSettingsStore(s => s.lastHero);
  const setLastHero = useSettingsStore(s => s.setLastHero);
  const calm = useSettingsStore(s => s.reduceFlash);
  const [stats, setStats] = useState<LocalStats>(() => peekLocalStats() ?? EMPTY_STATS);
  // Until the saved stats arrive, every hero but the first looks locked and the depth and Forge bonuses are unknown.
  const [statsLoaded, setStatsLoaded] = useState(() => peekLocalStats() !== null);
  const [depth, setDepth] = useState(0);
  const devHero = __DEV__ ? route.params?.devHero : undefined;
  const [selected, setSelected] = useState(() => devHero ?? (lastHero >= 0 && lastHero < HERO_COUNT ? lastHero : 0));
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const depthInitialised = useRef(false);
  const dir = useRef(1);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  // The hero slides in, the name slams in behind it, and everything keeps a slow idle motion.
  const pop = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (calm) {
      pop.setValue(1);
      return;
    }
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
  }, [selected, pop, calm]);
  useEffect(() => {
    if (calm) return;
    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(float, { toValue: 1, duration: 2300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(float, { toValue: 0, duration: 2300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(halo, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(halo, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [calm, float, halo]);

  useFocusEffect(
    useCallback(() => {
      emitSound("SELECTION_SCREEN_START");
      getLocalStats()
        .then(loaded => {
          setStats(loaded);
          setStatsLoaded(true);
          // Start on the deepest unlocked depth the first time, and on the hero played last.
          if (!depthInitialised.current) {
            depthInitialised.current = true;
            setDepth(GAME_CONFIG.dev.unlockAllHeroes ? 0 : loaded.maxAscension);
            if (devHero === undefined) setSelected(startingHero(lastHero, loaded, HERO_COUNT));
          }
        })
        .catch(() => setStatsLoaded(true)); // unreadable storage: play with the defaults
      return () => emitSound("SELECTION_SCREEN_STOP");
    }, [lastHero, devHero]),
  );

  const isLocked = (heroIndex: number) => !GAME_CONFIG.dev.unlockAllHeroes && !isHeroUnlocked(heroIndex, stats);

  const go = useCallback((target: number) => {
    if (target === selectedRef.current) return;
    dir.current = target > selectedRef.current ? 1 : -1;
    haptic.impact();
    setSelected(target);
  }, []);
  const step = useCallback((by: number) => go(cycleHero(selectedRef.current, by, HERO_COUNT)), [go]);

  // Swiping the stage flips through the heroes.
  const stepRef = useRef(step);
  stepRef.current = step;
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderRelease: (_e, g) => {
          if (g.dx < -40) stepRef.current(1);
          else if (g.dx > 40) stepRef.current(-1);
        },
      }),
    [],
  );

  const handleSelect = useCallback(
    (heroIndex: number) => {
      if (!statsLoaded) return;
      setLastHero(heroIndex);
      // First-time players get the guided tutorial before their first expedition.
      if (!tutorialSeen && mode === "expedition") {
        navigation.navigate("TutorialScreen", { characterIndex: heroIndex, skin: equippedSkin(stats, heroIndex), ascension: depth, meta: metaEffects(stats.forge) });
        return;
      }
      navigation.navigate("GameScreen", { characterIndex: heroIndex, skin: equippedSkin(stats, heroIndex), mode, ascension: mode === "expedition" ? depth : 0, meta: metaEffects(stats.forge) });
      emitSound("GAME_MUSIC_START");
    },
    [navigation, mode, tutorialSeen, depth, stats, statsLoaded, setLastHero],
  );

  // Tapping an owned outfit wears it at once (buying and browsing the rest happen in the collection screen).
  const onSwatch = useCallback(
    (skin: SkinId) => {
      const hero = selectedRef.current;
      if (equippedSkin(stats, hero) === skin) return;
      haptic.impact();
      void equipSkinFor(hero, skin).then(next => next && setStats(next));
    },
    [stats],
  );

  // ── Sizes: everything scales with the window, never below what a phone needs ─────────────────────────────
  const short = height < 360;
  const ui = Math.max(0.85, Math.min(1.5, width / 900, height / 540));
  const nameSize = Math.round((short ? 34 : 42) * ui);
  const heroTitleSize = Math.round(13 * ui);
  const bodySize = Math.round(13 * ui);
  const thumbSize = Math.round(Math.max(40, Math.min(58, 44 * ui)));
  const locked = isLocked(selected) || !statsLoaded;
  const wornSkin = equippedSkin(stats, selected);
  const shownSkin: SkinId = wornSkin;
  const art = skinArt(selected, shownSkin);
  const accent = shownSkin === "classic" ? accentOf(selected) : SKIN_ACCENT[shownSkin];
  const ctaDisabled = locked;
  const perks = HEROES[selected]?.perks;
  const ability = perks?.ability ?? null;
  const name = heroText(t, selected, "name");
  const progress = heroLockProgress(selected, stats);
  const wins = stats.heroWins[selected] ?? 0;
  const played = stats.heroesUsed.includes(selected);

  const maxDepth = GAME_CONFIG.dev.unlockAllHeroes ? MAX_ASCENSION : stats.maxAscension;
  // The difficulty picker only appears once there is something to choose (after the first victory).
  const showDepth = mode === "expedition" && maxDepth > 0;
  const modeTitle = t(`heroes.mode.${mode}` as TranslationKey);
  const modeRule = t(`heroes.mode.${mode}.rule` as TranslationKey) + (mode === "daily" ? `  ${dailyKey()}` : "");
  const modeTint = mode === "daily" ? "#FF9A3C" : mode === "endless" ? "#B39DDB" : "#E8BA52";

  // The hero fills the stage above the roster.
  const rosterH = thumbSize + 14;
  const heroH = Math.max(80, stage.h - rosterH - 10);
  const heroW = Math.max(80, stage.w * 0.94);
  const slide = (dir.current * 36) / Math.max(ui, 1);

  const heroMotion = {
    opacity: pop.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.9, 1] }),
    transform: [
      { translateX: pop.interpolate({ inputRange: [0, 1], outputRange: [slide, 0] }) },
      { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
      { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -7 * ui] }) },
    ],
  };
  const haloSize = Math.min(stage.w, stage.h) * 1.05;

  return (
    <ImageBackground fadeDuration={0} resizeMethod="none" source={require("../assets/sprites/backgrounds/Cover_Background.png")} style={styles.root} resizeMode="cover">
      <StatusBar hidden />
      <View style={styles.dim} />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.row}>
          {/* ── The stage: the hero, big, in its own light ─────────────────────────────────────────────── */}
          <View style={styles.stage} onLayout={e => setStage({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} {...swipe.panHandlers}>
            {stage.w > 0 && (
              <>
                {/* Light from above and a halo behind, in the colour of the chosen hero */}
                <LinearGradient
                  pointerEvents="none"
                  colors={[accent + "00", accent + (locked ? "14" : "33"), accent + "00"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.beam, { width: stage.w * 0.8, left: stage.w * 0.1 }]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.haloWrap,
                    {
                      width: haloSize,
                      height: haloSize,
                      borderRadius: haloSize / 2,
                      top: (stage.h - rosterH - haloSize) / 2 + 4,
                      left: (stage.w - haloSize) / 2,
                      opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
                      transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.04] }) }],
                    },
                  ]}
                >
                  <View style={[styles.haloRing, { backgroundColor: accent + (locked ? "10" : "1C"), borderRadius: haloSize / 2 }]} />
                  <View style={[styles.haloRing, { backgroundColor: accent + (locked ? "14" : "26"), width: "74%", height: "74%", borderRadius: haloSize }]} />
                  <View style={[styles.haloRing, { backgroundColor: accent + (locked ? "18" : "30"), width: "50%", height: "50%", borderRadius: haloSize }]} />
                </Animated.View>
                {!calm && !locked && SPARKS.map((s, i) => <Spark key={i} color={accent} x={s.x} duration={s.duration} delay={s.delay} size={s.size} rise={heroH * 0.7} />)}

                {/* Floor glow under the feet */}
                <View pointerEvents="none" style={[styles.pedestal, { bottom: rosterH + heroH * 0.05, width: Math.min(heroW * 0.5, heroH * 0.55), backgroundColor: accent + (locked ? "26" : "77") }]} />

                {/* The hero itself. A locked hero is a dark silhouette: it asks to be unlocked. */}
                <Animated.View pointerEvents="none" style={[styles.heroBox, { height: heroH, width: heroW, bottom: rosterH + 6 }, heroMotion]}>
                  <SpriteImage
                    source={art.playerImage}
                    style={{ width: "100%", height: "100%", ...(locked ? { tintColor: "#06030f", opacity: 0.92 } : null) }}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                  {locked && (
                    <View style={styles.silhouetteLock}>
                      <Ionicons name="lock-closed" size={Math.round(40 * ui)} color="#fff" />
                    </View>
                  )}
                </Animated.View>

                {/* Chevrons: previous / next hero */}
                <TouchableOpacity style={[styles.chevron, { left: 4 }]} onPress={() => step(-1)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("heroes.prev")}>
                  <Ionicons name="chevron-back" size={26} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chevron, { right: 4 }]} onPress={() => step(1)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("heroes.next")}>
                  <Ionicons name="chevron-forward" size={26} color="#fff" />
                </TouchableOpacity>

                {/* Roster */}
                <View style={[styles.roster, { height: rosterH }]}>
                  {characters.map((_, i) => (
                    <Thumb key={i} heroIndex={i} skin={equippedSkin(stats, i)} selected={i === selected} locked={isLocked(i)} size={thumbSize} onPress={go} />
                  ))}
                </View>
              </>
            )}
          </View>

          {/* ── The panel: who they are, what they bring, and the button ──────────────────────────────── */}
          <View style={styles.panel}>
            <ScrollView contentContainerStyle={[styles.panelContent, !short && styles.panelContentCentered]} showsVerticalScrollIndicator={false}>
              <View style={styles.kickerRow}>
                <Text style={[styles.kicker, { color: modeTint }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {(short ? modeTitle : `${modeTitle} · ${t("heroes.title")}`).toLocaleUpperCase()}
                </Text>
                {showDepth && (
                  <View style={styles.depth}>
                    <TouchableOpacity
                      style={[styles.depthButton, depth <= 0 && { opacity: 0.35 }]}
                      onPress={() => setDepth(d => Math.max(0, d - 1))}
                      disabled={depth <= 0}
                      accessibilityRole="button"
                      accessibilityLabel={t("a11y.depthLower")}
                    >
                      <Ionicons name="remove" size={18} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.depthLabel} accessible accessibilityLabel={`${t("heroes.depth")}: ${t(`ascension.label.${depth}` as TranslationKey)}. ${t(ascensionRuleKey(depth) as TranslationKey)}`}>
                      <Text style={styles.depthText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                        🔥 {t(`ascension.label.${depth}` as TranslationKey).toLocaleUpperCase()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.depthButton, depth >= maxDepth && { opacity: 0.35 }]}
                      onPress={() => setDepth(d => Math.min(maxDepth, d + 1))}
                      disabled={depth >= maxDepth}
                      accessibilityRole="button"
                      accessibilityLabel={t("a11y.depthRaise")}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              {!short && (
                <Text style={styles.modeRule} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                  {modeRule}
                </Text>
              )}

              {/* Name and title: the biggest text on the screen */}
              <Animated.View style={{ opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1.18, 1] }) }] }}>
                <Text style={[styles.name, { fontSize: nameSize, textShadowColor: accent }]} numberOfLines={1} adjustsFontSizeToFit accessibilityRole="header" maxFontSizeMultiplier={1.15}>
                  {name.toLocaleUpperCase()}
                </Text>
                <Text style={[styles.title, { color: accent, fontSize: heroTitleSize }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                  {heroText(t, selected, "title").toLocaleUpperCase()}
                </Text>
                <View style={[styles.rule, { backgroundColor: accent }]} />
              </Animated.View>

              {/* The outfits you own: tap one to wear it. The rest of the collection has its own screen. */}
              {!locked ? (
                <View style={styles.skinBox}>
                  <Text style={[styles.cardLabel, { color: accent }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                    {`${t("skin.outfit")} · ${skinText(t, shownSkin)}`.toLocaleUpperCase()}
                  </Text>
                  <View style={styles.swatches}>
                    {ownedSkins(stats, selected).map(id => (
                      <Swatch key={id} heroIndex={selected} skin={id} previewing={id === shownSkin} owned equipped={id === wornSkin} onPress={onSwatch} />
                    ))}
                    <TouchableOpacity
                      style={[styles.collectionButton, { borderColor: accent }]}
                      onPress={() => navigation.navigate("CollectionScreen", { hero: selected })}
                      accessibilityRole="button"
                      accessibilityLabel={t("collection.view")}
                    >
                      <Ionicons name="albums" size={16} color={accent} />
                      <Text style={[styles.collectionText, { color: accent }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                        {t("collection.view").toLocaleUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {/* A locked hero says, first of all, how to open it */}
              {locked && progress ? (
              <View style={styles.lockInfo} accessible>
                <Ionicons name="lock-closed" size={16} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lockTitle} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                    {unlockText(t, selected)}
                  </Text>
                  <Text style={styles.lockSub} maxFontSizeMultiplier={1.2}>
                    {progress.kind === "floor" ? t("heroes.progress.floor", { have: progress.have, need: progress.need }) : t("heroes.progress.victory")}
                  </Text>
                  {progress.kind === "floor" && (
                    <View style={styles.lockTrack}>
                      <View style={[styles.lockFill, { width: `${Math.round((progress.have / progress.need) * 100)}%`, backgroundColor: accent }]} />
                    </View>
                  )}
                </View>
              </View>
              ) : null}

              {/* What they bring: the passive power and the active ability */}
              <View style={[styles.card, { borderLeftColor: accent }]}>
                <Text style={[styles.cardLabel, { color: accent }]} maxFontSizeMultiplier={1.2}>
                  {t("heroes.passive").toLocaleUpperCase()}
                </Text>
                <Text style={[styles.cardName, { fontSize: bodySize + 3 }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                  {heroText(t, selected, "perk")}
                </Text>
                <Text style={[styles.cardDesc, { fontSize: bodySize }]} numberOfLines={short ? 2 : 3} maxFontSizeMultiplier={1.2}>
                  {heroText(t, selected, "desc")}
                </Text>
              </View>
              {ability && (
                <View style={[styles.card, { borderLeftColor: accent }]}>
                  <View style={styles.abilityHead}>
                    <View style={[styles.abilityIcon, { borderColor: accent, backgroundColor: accent + "26" }]}>
                      <SpriteImage source={ABILITY_ART[ability]} style={{ width: styles.abilityIcon.width - 6, height: styles.abilityIcon.height - 6 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardLabel, { color: accent }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                        {`${t("heroes.active")} · ${t("heroes.recharge", { n: abilityCooldown(ability) })}`.toLocaleUpperCase()}
                      </Text>
                      <Text style={[styles.cardName, { fontSize: bodySize + 3 }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                        {t(`ability.${ability}.name` as TranslationKey)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.cardDesc, { fontSize: bodySize }]} numberOfLines={short ? 2 : 3} maxFontSizeMultiplier={1.2}>
                    {t(`ability.${ability}.desc` as TranslationKey)}
                  </Text>
                </View>
              )}

              {/* The hero's record */}
              {!locked ? (
                <View style={styles.recordRow}>
                  <Ionicons name={wins > 0 ? "trophy" : played ? "checkmark-circle" : "sparkles"} size={15} color={accent} />
                  <Text style={[styles.recordText, { color: accent }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                    {wins > 0 ? plural("heroes.wins", wins) : played ? t("heroes.played") : t("heroes.newHero")}
                  </Text>
                </View>
              ) : null}
            </ScrollView>

            {/* The call to action never scrolls away */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={ctaDisabled}
              onPress={() => handleSelect(selected)}
              accessibilityRole="button"
              accessibilityState={{ disabled: ctaDisabled }}
              accessibilityLabel={locked ? `${name}. ${t("heroes.locked")}. ${unlockText(t, selected)}` : t("heroes.pick", { name })}
              style={[styles.cta, { backgroundColor: ctaDisabled ? "rgba(255,255,255,0.14)" : accent }, !ctaDisabled && { shadowColor: accent }]}
            >
              <Text style={[styles.ctaText, ctaDisabled && { color: "#d8d2f0" }, { fontSize: Math.round(16 * Math.min(ui, 1.3)) }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
                {(locked ? unlockText(t, selected) || t("heroes.locked") : t("heroes.pick", { name })).toLocaleUpperCase()}
              </Text>
              {!ctaDisabled && <Ionicons name="chevron-forward" size={22} color="#111" />}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.backButton, { top: 10, left: 14 }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.back")}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(4,2,14,0.55)" },
  safe: { flex: 1 },
  row: { flex: 1, flexDirection: "row" },

  stage: { flex: 1.12, overflow: "hidden" },
  beam: { position: "absolute", top: 0, bottom: 0 },
  haloWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
  haloRing: { position: "absolute", width: "100%", height: "100%" },
  pedestal: { position: "absolute", alignSelf: "center", height: 14, borderRadius: 40, transform: [{ scaleY: 0.8 }] },
  heroBox: { position: "absolute", alignSelf: "center", alignItems: "center", justifyContent: "center" },
  silhouetteLock: { position: "absolute", alignSelf: "center", top: "38%", padding: 10, borderRadius: 40, backgroundColor: "rgba(0,0,0,0.55)" },
  chevron: {
    position: "absolute",
    top: "40%",
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  roster: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  thumb: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)", overflow: "visible" },
  thumbLock: { position: "absolute", right: -2, bottom: -2, backgroundColor: "#1a1030", borderRadius: 10, padding: 3, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" },

  panel: { flex: 1, paddingRight: 14, paddingLeft: 4, paddingTop: 8, paddingBottom: 10, gap: 8 },
  panelContent: { gap: 8, paddingBottom: 4 },
  panelContentCentered: { flexGrow: 1, justifyContent: "center" },
  kickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 34, paddingLeft: 0 },
  kicker: { fontWeight: "900", letterSpacing: 2, fontSize: 11, flexShrink: 1 },
  modeRule: { color: "#cfc9e8", fontSize: 12, marginTop: -4 },
  depth: { flexDirection: "row", alignItems: "center", gap: 6 },
  depthButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,112,67,0.35)", borderWidth: 1, borderColor: "#FF7043", alignItems: "center", justifyContent: "center" },
  depthLabel: { minWidth: 84, alignItems: "center" },
  depthText: { color: "#FF9A5C", fontWeight: "900", letterSpacing: 1, fontSize: 12 },

  name: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 4,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  title: { fontWeight: "800", letterSpacing: 3, marginTop: 0 },
  rule: { height: 3, width: 54, borderRadius: 2, marginTop: 6 },

  card: {
    backgroundColor: "rgba(18,12,36,0.78)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderLeftWidth: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 2,
  },
  cardLabel: { fontWeight: "900", letterSpacing: 1.5, fontSize: 10 },
  cardName: { color: "#fff", fontWeight: "900" },
  cardDesc: { color: "#d4d0e8" },
  abilityHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  abilityIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: "center", justifyContent: "center" },

  skinBox: { gap: 6 },
  collectionButton: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 34, paddingHorizontal: 10, borderRadius: 17, borderWidth: 1.5, backgroundColor: "rgba(255,255,255,0.05)" },
  collectionText: { fontWeight: "900", fontSize: 11, letterSpacing: 1 },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 4, alignItems: "center", paddingVertical: 2 },
  swatchRing: { borderWidth: RING, alignItems: "center", justifyContent: "center" },
  swatch: { width: SWATCH, height: SWATCH, borderRadius: SWATCH / 2, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  recordRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 2 },
  recordText: { fontWeight: "800", fontSize: 12, flexShrink: 1 },
  lockInfo: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 10, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  lockTitle: { color: "#fff", fontWeight: "900", fontSize: 14 },
  lockSub: { color: "#c9c3e6", fontSize: 12, marginTop: 1 },
  lockTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.14)", marginTop: 6, overflow: "hidden" },
  lockFill: { height: "100%", borderRadius: 3 },

  cta: {
    minHeight: MIN_TOUCH + 6,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 4,
    borderBottomColor: "rgba(0,0,0,0.3)",
    shadowOpacity: 0.7,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  ctaText: { color: "#111", fontWeight: "900", letterSpacing: 1.5 },

  backButton: {
    position: "absolute",
    zIndex: 100,
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: MIN_TOUCH / 2,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
});

export default CharactersScreen;
