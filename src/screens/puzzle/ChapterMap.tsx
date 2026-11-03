import React, { useEffect, useRef } from "react";
import { Animated, Easing, ImageBackground, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import PressScale from "../../ui/components/PressScale";
import { useT } from "../../i18n/useT";
import type { TranslationKey } from "../../i18n/en";
import { emitSound } from "../../audio/audioEventBus";
import { PUZZLE_TIERS, PUZZLES_PER_TIER } from "../../core/puzzles/puzzles";
import { CHAPTER_STARS, MAX_STARS, chapterCrowns, chapterStars, hasCrown, isChestWaiting, isPuzzleOpen, puzzleBestTime, puzzleStarsAt, type PuzzleProgress } from "../../core/stats/puzzleProgress";
import { formatSolveTime } from "./shareText";

const STAR = require("../../assets/sprites/ui/Icon_Star.webp");
const PADLOCK = require("../../assets/sprites/ui/Icon_Padlock.webp");
const MEDAL = require("../../assets/sprites/ui/Icon_Medal.webp");
const CHEST = require("../../assets/sprites/items/Icon_Chest_Closed.webp");
const GOLD = "#D9B45A";

export const TIER_TINTS = ["#A3BF7C", "#7FAFC6", "#A397BF", "#D38C46", "#CC5249", "#E1F5FE"];

/** Each chapter is a part of the cave: its floor tiles and its backdrop, from the game's own biomes. */
const CHAPTER_ART: { open: ImageSourcePropType; shut: ImageSourcePropType; bg: ImageSourcePropType }[] = [
  // Apprentice: the mossy upper cave.
  { open: require("../../assets/sprites/tiles/Tile_Revealed_Moss.webp"), shut: require("../../assets/sprites/tiles/Tile_Hidden_Moss.webp"), bg: require("../../assets/sprites/backgrounds/Cover_Background.jpg") },
  // Tracker: the crystal halls.
  { open: require("../../assets/sprites/tiles/Tile_Revealed_Crystal.webp"), shut: require("../../assets/sprites/tiles/Tile_Hidden_Crystal.webp"), bg: require("../../assets/sprites/backgrounds/Bg_Crystal.jpg") },
  // Explorer: the violet deep.
  { open: require("../../assets/sprites/tiles/Tile_Revealed_Lair.webp"), shut: require("../../assets/sprites/tiles/Tile_Hidden_Lair.webp"), bg: require("../../assets/sprites/backgrounds/Bg_Lair.jpg") },
  // Expert: the old vault, gold underfoot.
  { open: require("../../assets/sprites/tiles/Tile_Revealed_Vault.webp"), shut: require("../../assets/sprites/tiles/Tile_Hidden_Vault.webp"), bg: require("../../assets/sprites/backgrounds/Cover_Background.jpg") },
  // Master: the magma at the bottom.
  { open: require("../../assets/sprites/tiles/Tile_Revealed_Magma.webp"), shut: require("../../assets/sprites/tiles/Tile_Hidden_Magma.webp"), bg: require("../../assets/sprites/backgrounds/Bg_Magma.jpg") },
  // Legend: the frozen deep under the lair, where one mistake ends the try.
  { open: require("../../assets/sprites/tiles/Tile_Revealed_Frost.webp"), shut: require("../../assets/sprites/tiles/Tile_Hidden_Frost.webp"), bg: require("../../assets/sprites/backgrounds/Bg_Lair.jpg") },
];

/** Where each stop of a chapter sits down the path (0 top, 1 bottom): a trail that winds down into the cave. */
const DEPTH = [0.08, 0.62, 0.3, 0.86, 0.48, 0.96];

const HEADER = 58;

/** What happened since the map was last seen, to be played on it once (`key` changes each time). */
export type MapFx = {
  key: number;
  /** Puzzles that won stars: the stars they had before. */
  gained: Record<number, number>;
  /** Where the hero stood before (when the next puzzle moved on). */
  walkFrom: number | null;
  /** The chapter just opened (the hero arrives in it from the one before). */
  unlocked: number | null;
};

type Props = {
  tier: number;
  width: number;
  height: number;
  puzzles: PuzzleProgress | undefined;
  /** The first puzzle still unsolved (where the hero stands). */
  next: number;
  heroArt: ImageSourcePropType;
  calm: boolean;
  /** Animations stop on pages out of sight. */
  active: boolean;
  fx: MapFx | null;
  onOpen: (index: number) => void;
  onChest: (tier: number) => void;
};

/**
 * One chapter of the puzzle path, drawn as a map: the chapter's part of the cave behind, its six puzzles as floor tiles on a
 * trail that winds down, the stars won and the best time under each, and the hero standing on the next one to solve. Coming
 * back from a puzzle, the new stars drop onto their tile and the hero walks on to the next one; a chapter just opened lights up.
 * All its stars won, the chapter's chest waits on its header.
 */
export default function ChapterMap({ tier, width, height, puzzles, next, heroArt, calm, active, fx, onOpen, onChest }: Props) {
  const { t } = useT();
  const tint = TIER_TINTS[tier];
  const art = CHAPTER_ART[tier];
  const first = tier * PUZZLES_PER_TIER;
  const open = isPuzzleOpen(puzzles, first);
  const got = Array.from({ length: PUZZLES_PER_TIER }, (_, k) => puzzleStarsAt(puzzles, first + k));
  const stars = chapterStars(puzzles, tier);
  const total = CHAPTER_STARS;
  const mastered = stars === total;
  const chest = isChestWaiting(puzzles, tier);
  const crowns = chapterCrowns(puzzles, tier);
  const size = PUZZLE_TIERS[tier];
  const moving = active && !calm;

  // The trail fills what is left under the header. Room is kept above a stop for the hero and under it for stars and time.
  const pathH = Math.max(120, height - HEADER - 10);
  const S = Math.round(Math.max(36, Math.min(78, pathH * 0.3, (width - 40) / 6.6)));
  // The highest stop leaves room over it for the hero's marker and its tag, under the chapter's name.
  const top = S * 1.32 + 12;
  const bottom = pathH - S * 0.5 - S * 0.62 - 4;
  const x0 = 20 + S / 2;
  const x1 = width - 20 - S / 2;
  const stops = DEPTH.map((d, k) => ({ x: x0 + ((x1 - x0) * k) / (PUZZLES_PER_TIER - 1), y: top + (bottom - top) * d }));

  // The trail: a dotted line from stop to stop, lit up to the last puzzle that is open.
  const dots: { x: number; y: number; lit: boolean; key: string }[] = [];
  for (let k = 1; k < stops.length; k++) {
    const a = stops[k - 1];
    const b = stops[k];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const count = Math.floor(dist / 11);
    const lit = isPuzzleOpen(puzzles, first + k);
    for (let j = 1; j < count; j++) {
      const f = j / count;
      const along = f * dist;
      if (along < S * 0.56 || dist - along < S * 0.56) continue;
      dots.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, lit, key: `${k}-${j}` });
    }
  }

  // The hero stands on the next puzzle when it is in this chapter.
  const hereK = next - first;
  const heroHere = hereK >= 0 && hereK < PUZZLES_PER_TIER && got[hereK] === 0;
  // Coming back: the hero walks from where it stood (in this chapter), or drops in when the chapter was just opened.
  const walkK = fx && fx.walkFrom !== null ? fx.walkFrom - first : -1;
  const walks = heroHere && fx !== null && walkK >= 0 && walkK < PUZZLES_PER_TIER && walkK !== hereK;
  const arrives = heroHere && fx !== null && fx.unlocked === tier;
  const starDelay = 250;
  const walkDelay = fx && Object.keys(fx.gained).some(i => Number(i) >= first && Number(i) < first + PUZZLES_PER_TIER) ? 1100 : 300;

  const heroPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const hop = useRef(new Animated.Value(0)).current;
  const drop = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const banner = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const target = heroHere ? stops[hereK] : null;
  const tx = target?.x ?? 0;
  const ty = target?.y ?? 0;

  // The marker's place: set at once, or walked to on a return.
  useEffect(() => {
    if (!target) return;
    if (walks && !calm) {
      const from = stops[walkK];
      heroPos.setValue({ x: from.x, y: from.y });
      // Left to finish once started: the hero always ends on the next puzzle.
      setTimeout(() => emitSound("MOVE"), walkDelay);
      Animated.sequence([
        Animated.delay(walkDelay),
        Animated.parallel([
          Animated.timing(heroPos, { toValue: { x: tx, y: ty }, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          Animated.sequence([
            Animated.timing(hop, { toValue: 1, duration: 210, easing: Easing.out(Easing.quad), useNativeDriver: false }),
            Animated.timing(hop, { toValue: 0, duration: 210, easing: Easing.in(Easing.quad), useNativeDriver: false }),
            Animated.timing(hop, { toValue: 1, duration: 210, easing: Easing.out(Easing.quad), useNativeDriver: false }),
            Animated.timing(hop, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: false }),
          ]),
        ]),
      ]).start(() => {
        heroPos.setValue({ x: tx, y: ty });
        emitSound("MOVE");
      });
      return;
    }
    heroPos.setValue({ x: tx, y: ty });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx, ty, fx?.key]);

  // A chapter just opened: once its page is in sight, a ring of light runs out from the trail's start and the hero drops onto
  // its first puzzle (the hero waits hidden until then).
  const arrived = useRef<number | null>(null);
  useEffect(() => {
    if (!arrives || calm) {
      burst.setValue(0);
      drop.setValue(1);
      return;
    }
    if (arrived.current === fx!.key) return;
    burst.setValue(0);
    drop.setValue(0);
    if (!active) return;
    arrived.current = fx!.key;
    // Started once and left to finish (a page turned meanwhile must not leave the hero hidden).
    setTimeout(() => emitSound("FAMILY_SET"), 350);
    banner.setValue(0);
    // The banner stays long enough to be read; the ring and the hero's drop play under it.
    Animated.sequence([
      Animated.delay(300),
      Animated.timing(banner, { toValue: 1, duration: 220, useNativeDriver: false }),
      Animated.delay(1500),
      Animated.timing(banner, { toValue: 0, duration: 450, useNativeDriver: false }),
    ]).start();
    Animated.sequence([
      Animated.delay(350),
      Animated.timing(burst, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.spring(drop, { toValue: 1, friction: 5, tension: 70, useNativeDriver: false }),
    ]).start(() => drop.setValue(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrives, fx?.key, active]);

  // The hero bobs gently while the chapter is in sight.
  useEffect(() => {
    if (!heroHere || !moving) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [heroHere, moving, bob]);

  const M = S * 0.64;

  return (
    <View style={[styles.panel, { width, height, borderColor: tint + "88" }]}>
      <ImageBackground source={art.bg} style={StyleSheet.absoluteFill} resizeMode="cover" imageStyle={{ opacity: 0.55 }} />
      <LinearGradient colors={["rgba(8,10,14,0.55)", "rgba(8,10,14,0.25)", "rgba(8,10,14,0.8)"]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <LinearGradient colors={[tint + "33", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0.6 }} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: tint }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.1}>
            {`${t("puzzle.chapter", { n: tier + 1 })}  ·  ${size.rows}×${size.cols}`.toLocaleUpperCase()}
          </Text>
          <Text style={[styles.name, { textShadowColor: tint + "88" }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>
            {t(`puzzle.tier.${tier}` as TranslationKey)}
          </Text>
        </View>
        {chest ? <ChestButton tint={tint} moving={moving} onPress={() => onChest(tier)} /> : null}
        <View style={styles.score} accessible accessibilityLabel={t("puzzle.totalStars", { n: stars, total })}>
          {mastered && !chest ? (
            <View style={[styles.mastered, { borderColor: GOLD }]}>
              <SpriteImage source={MEDAL} style={{ width: 16, height: 16 }} resizeMode="contain" />
              <Text style={styles.masteredText} maxFontSizeMultiplier={1.1}>
                {t("puzzle.chapterDone").toLocaleUpperCase()}
              </Text>
            </View>
          ) : null}
          <View style={styles.scoreRow}>
            {crowns > 0 ? (
              <View style={styles.crownCount} accessible accessibilityLabel={t("puzzle.crowns", { n: crowns, total: PUZZLES_PER_TIER })}>
                <MaterialCommunityIcons name="crown" size={16} color={GOLD} />
                <Text style={styles.scoreText} maxFontSizeMultiplier={1.1}>{`${crowns}/${PUZZLES_PER_TIER}`}</Text>
              </View>
            ) : null}
            <SpriteImage source={STAR} style={{ width: 18, height: 18 }} resizeMode="contain" />
            <Text style={styles.scoreText} maxFontSizeMultiplier={1.1}>{`${stars}/${total}`}</Text>
          </View>
          <View style={styles.bar}>
            <View style={[styles.fill, { width: `${Math.round((stars / total) * 100)}%`, backgroundColor: mastered ? GOLD : tint }]} />
          </View>
        </View>
      </View>

      <View style={{ position: "absolute", left: 0, top: HEADER, width, height: pathH }}>
        {dots.map(d => (
          <View key={d.key} style={[styles.dot, { left: d.x - 3, top: d.y - 3, backgroundColor: d.lit ? tint : "rgba(255,255,255,0.18)" }, d.lit && { shadowColor: tint }]} />
        ))}
        {arrives ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.burst,
              {
                left: stops[0].x - S * 2,
                top: stops[0].y - S * 2,
                width: S * 4,
                height: S * 4,
                borderRadius: S * 2,
                borderColor: tint,
                opacity: burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
                transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.2, 2.2] }) }],
              },
            ]}
          />
        ) : null}
        {stops.map((p, k) => {
          const i = first + k;
          const before = fx ? fx.gained[i] : undefined;
          return (
            <Stop
              key={i}
              index={i}
              x={p.x}
              y={p.y}
              size={S}
              tint={tint}
              open={isPuzzleOpen(puzzles, i)}
              stars={got[k]}
              popFrom={before !== undefined && !calm ? before : null}
              popKey={fx?.key ?? 0}
              popDelay={starDelay}
              best={puzzleBestTime(puzzles, i)}
              crown={hasCrown(puzzles, i)}
              here={heroHere && k === hereK}
              tile={art}
              moving={moving}
              onPress={() => onOpen(i)}
            />
          );
        })}
        {heroHere ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.marker,
              {
                width: M,
                left: Animated.subtract(heroPos.x, M / 2),
                top: Animated.add(heroPos.y, -S / 2 - S * 0.82),
                opacity: drop,
                transform: [
                  { translateY: Animated.add(Animated.multiply(hop, -S * 0.35), Animated.add(Animated.multiply(bob, -4), drop.interpolate({ inputRange: [0, 1], outputRange: [-S, 0] }))) },
                ],
              },
            ]}
          >
            <View style={[styles.markerBubble, { width: M, height: M, borderRadius: M / 2, borderColor: tint }]}>
              <SpriteImage source={heroArt} style={{ width: M - 4, height: M - 4, borderRadius: M / 2 }} resizeMode="cover" />
            </View>
            <View style={[styles.markerTip, { borderTopColor: tint }]} />
            <View style={[styles.youTag, { backgroundColor: tint }]}>
              <Text style={styles.youText} maxFontSizeMultiplier={1}>
                {t("puzzle.you").toLocaleUpperCase()}
              </Text>
            </View>
          </Animated.View>
        ) : null}
        {arrives ? (
          <Animated.View pointerEvents="none" style={[styles.openedWrap, { opacity: banner, transform: [{ scale: banner.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
            <View style={[styles.openedBanner, { borderColor: tint }]}>
              <Text style={[styles.openedText, { color: tint }]} maxFontSizeMultiplier={1.1}>
                {t("puzzle.chapterOpened").toLocaleUpperCase()}
              </Text>
            </View>
          </Animated.View>
        ) : null}
      </View>

      {!open ? (
        <View style={[StyleSheet.absoluteFill, styles.locked]} pointerEvents="none">
          <SpriteImage source={PADLOCK} style={{ width: 54, height: 54 }} resizeMode="contain" />
          <Text style={styles.lockedText} maxFontSizeMultiplier={1.15}>
            {t("puzzle.chapterLocked", { tier: t(`puzzle.tier.${Math.max(0, tier - 1)}` as TranslationKey) })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** The chapter's chest, once all its stars are won: it rocks gently until it is opened. */
function ChestButton({ tint, moving, onPress }: { tint: string; moving: boolean; onPress: () => void }) {
  const { t } = useT();
  const rock = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!moving) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rock, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.timing(rock, { toValue: -1, duration: 280, useNativeDriver: true }),
        Animated.timing(rock, { toValue: 0, duration: 140, useNativeDriver: true }),
        Animated.delay(1400),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [moving, rock]);
  return (
    <PressScale onPress={onPress} style={[styles.chest, { borderColor: GOLD, shadowColor: GOLD }]} accessibilityRole="button" accessibilityLabel={t("puzzle.chest.open")}>
      <Animated.View style={{ transform: [{ rotate: rock.interpolate({ inputRange: [-1, 1], outputRange: ["-9deg", "9deg"] }) }] }}>
        <SpriteImage source={CHEST} style={{ width: 34, height: 34 }} resizeMode="contain" />
      </Animated.View>
      <Text style={[styles.chestText, { color: tint === GOLD ? "#1a1410" : GOLD }]} maxFontSizeMultiplier={1.1}>
        {t("puzzle.chest.open").toLocaleUpperCase()}
      </Text>
    </PressScale>
  );
}

type StopProps = {
  index: number;
  x: number;
  y: number;
  size: number;
  tint: string;
  open: boolean;
  stars: number;
  /** Stars it had before the last puzzle played (the new ones drop in), or null. */
  popFrom: number | null;
  popKey: number;
  popDelay: number;
  /** Best time in seconds (0: none). */
  best: number;
  /** Three stars within the legend time. */
  crown: boolean;
  here: boolean;
  tile: { open: ImageSourcePropType; shut: ImageSourcePropType };
  moving: boolean;
  onPress: () => void;
};

/** One puzzle on the trail: a floor tile with its number, its stars on an arc under it and its best time, a halo on the next one. */
function Stop({ index, x, y, size: S, tint, open, stars, popFrom, popKey, popDelay, best, crown, here, tile, moving, onPress }: StopProps) {
  const { t } = useT();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!here || !moving) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [here, moving, pulse]);

  // New stars drop onto the tile one after the other, each with a small chime.
  const pops = useRef(Array.from({ length: MAX_STARS }, () => new Animated.Value(1))).current;
  useEffect(() => {
    if (popFrom === null || popFrom >= stars) return;
    const fresh = pops.slice(popFrom, stars);
    fresh.forEach(v => v.setValue(0));
    const timers = fresh.map((v, k) =>
      setTimeout(() => {
        emitSound("COIN_COLLECTED");
        Animated.spring(v, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }).start();
      }, popDelay + k * 260),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popKey]);

  const solved = stars > 0;
  const star = Math.round(S * 0.27);

  return (
    <>
      {here ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            { left: x - S * 0.78, top: y - S * 0.78, width: S * 1.56, height: S * 1.56, borderRadius: S * 0.78, backgroundColor: tint + "40", borderColor: tint },
            { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.06] }) }] },
          ]}
        />
      ) : null}
      <PressScale
        disabled={!open}
        onPress={onPress}
        style={[
          styles.stop,
          { left: x - S / 2, top: y - S / 2, width: S, height: S, borderRadius: S * 0.2, borderColor: open ? (solved || here ? tint : tint + "99") : "rgba(255,255,255,0.15)" },
          here && { shadowColor: tint, shadowOpacity: 0.9, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
        ]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !open }}
        accessibilityLabel={`${t("puzzle.number", { n: index + 1 })}. ${open ? (solved ? t("puzzle.stars", { n: stars }) : t("puzzle.unsolved")) : t("puzzle.locked")}${best ? `. ${t("puzzle.record.best", { best: formatSolveTime(best) })}` : ""}`}
      >
        <SpriteImage source={open ? tile.open : tile.shut} style={{ position: "absolute", left: 0, top: 0, width: S - 5, height: S - 5, borderRadius: S * 0.18, opacity: open ? 1 : 0.7 }} resizeMode="cover" />
        {open ? (
          <Text style={[styles.number, { fontSize: S * 0.42, textShadowColor: solved ? "#000" : tint }]} maxFontSizeMultiplier={1}>
            {index + 1}
          </Text>
        ) : (
          <SpriteImage source={PADLOCK} style={{ width: S * 0.42, height: S * 0.42, opacity: 0.85 }} resizeMode="contain" />
        )}
      </PressScale>
      {crown ? (
        <View pointerEvents="none" style={[styles.crown, { left: x + S / 2 - S * 0.3, top: y - S / 2 - S * 0.22, width: S * 0.48, height: S * 0.48, borderRadius: S * 0.24 }]}>
          <MaterialCommunityIcons name="crown" size={S * 0.32} color={GOLD} />
        </View>
      ) : null}
      {open ? (
        <View pointerEvents="none" style={[styles.under, { left: x - star * 1.9, top: y + S / 2 - star * 0.35, width: star * 3.8 }]}>
          <View style={styles.stars}>
            {Array.from({ length: MAX_STARS }, (_, k) => (
              <Animated.View
                key={k}
                style={{
                  marginTop: k === 1 ? star * 0.3 : 0,
                  transform: [{ scale: pops[k].interpolate({ inputRange: [0, 0.7, 1], outputRange: [k < stars ? 2.6 : 1, 1.25, 1] }) }],
                  opacity: k < stars ? pops[k].interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }) : 0.22,
                }}
              >
                <SpriteImage source={STAR} style={{ width: star, height: star }} resizeMode="contain" />
              </Animated.View>
            ))}
          </View>
          {best ? (
            <Text style={[styles.time, { fontSize: Math.max(9, S * 0.17) }]} maxFontSizeMultiplier={1}>
              {formatSolveTime(best)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 22, borderWidth: 1.5, overflow: "hidden", backgroundColor: "#0b0d10" },
  head: { height: HEADER, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 6 },
  kicker: { fontWeight: "900", fontSize: 11, letterSpacing: 2 },
  name: { color: "#FFF6E8", fontWeight: "900", fontSize: 24, letterSpacing: 0.5, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  score: { alignItems: "flex-end", gap: 3 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  scoreText: { color: GOLD, fontWeight: "900", fontSize: 15 },
  bar: { width: 110, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.14)", overflow: "hidden" },
  fill: { height: 5, borderRadius: 3 },
  mastered: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 9, borderWidth: 1, backgroundColor: "rgba(217, 180, 90,0.14)" },
  masteredText: { color: GOLD, fontWeight: "900", fontSize: 10, letterSpacing: 1.2 },
  chest: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 6, paddingRight: 10, paddingVertical: 3, borderRadius: 16, borderWidth: 1.5, backgroundColor: "rgba(217, 180, 90,0.16)", shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  chestText: { fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  dot: { position: "absolute", width: 6, height: 6, borderRadius: 3, shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  halo: { position: "absolute", borderWidth: 2 },
  burst: { position: "absolute", borderWidth: 4 },
  stop: { position: "absolute", borderWidth: 2.5, alignItems: "center", justifyContent: "center", backgroundColor: "#1a1410" },
  number: { color: "#F3EADB", fontWeight: "900", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  under: { position: "absolute", alignItems: "center" },
  crown: { position: "absolute", alignItems: "center", justifyContent: "center", backgroundColor: "#1a1410", borderWidth: 1.5, borderColor: GOLD },
  crownCount: { flexDirection: "row", alignItems: "center", gap: 3, marginRight: 6 },
  stars: { flexDirection: "row", justifyContent: "center" },
  time: { color: "#E6D6C2", fontWeight: "800", marginTop: 1, textShadowColor: "#000", textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  marker: { position: "absolute", alignItems: "center" },
  markerBubble: { borderWidth: 2.5, backgroundColor: "#1a1410", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  markerTip: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7, borderLeftColor: "transparent", borderRightColor: "transparent", marginTop: -1 },
  youTag: { position: "absolute", top: -9, paddingHorizontal: 6, borderRadius: 7 },
  youText: { color: "#0b0d10", fontWeight: "900", fontSize: 9, letterSpacing: 1 },
  openedWrap: { position: "absolute", left: 0, right: 0, top: 4, alignItems: "center" },
  openedBanner: { paddingHorizontal: 16, paddingVertical: 5, borderRadius: 14, borderWidth: 1.5, backgroundColor: "rgba(8,10,14,0.85)" },
  openedText: { fontWeight: "900", fontSize: 14, letterSpacing: 2 },
  locked: { alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(6,8,10,0.62)", paddingHorizontal: 30 },
  lockedText: { color: "#E6D6C2", fontWeight: "800", fontSize: 14, textAlign: "center" },
});
