import React, { useEffect, useRef } from "react";
import { Animated, Easing, ImageBackground, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import PressScale from "../../ui/components/PressScale";
import { useT } from "../../i18n/useT";
import type { TranslationKey } from "../../i18n/en";
import { PUZZLE_TIERS, PUZZLES_PER_TIER } from "../../core/puzzles/puzzles";
import { MAX_STARS, isPuzzleOpen, puzzleStarsAt, type PuzzleProgress } from "../../core/stats/puzzleProgress";

const STAR = require("../../assets/sprites/ui/Icon_Star.png");
const PADLOCK = require("../../assets/sprites/ui/Icon_Padlock.png");
const MEDAL = require("../../assets/sprites/ui/Icon_Medal.png");

export const TIER_TINTS = ["#9EE37D", "#4FC3F7", "#B39DDB", "#FF9A3C", "#FF5252"];

/** Each chapter is a part of the cave: its floor tiles and its backdrop, from the game's own biomes. */
const CHAPTER_ART: { open: ImageSourcePropType; shut: ImageSourcePropType; bg: ImageSourcePropType }[] = [
  // Apprentice: the mossy upper cave.
  { open: require("../../assets/sprites/tiles/Tile_Revealed_Moss.png"), shut: require("../../assets/sprites/tiles/Tile_Hidden_Moss.png"), bg: require("../../assets/sprites/backgrounds/Cover_Background.png") },
  // Tracker: the crystal halls.
  { open: require("../../assets/sprites/tiles/Tile_Revealed_Crystal.png"), shut: require("../../assets/sprites/tiles/Tile_Hidden_Crystal.png"), bg: require("../../assets/sprites/backgrounds/Bg_Crystal.jpg") },
  // Explorer: the violet deep.
  { open: require("../../assets/sprites/tiles/Tile_Revealed_Lair.png"), shut: require("../../assets/sprites/tiles/Tile_Hidden_Lair.png"), bg: require("../../assets/sprites/backgrounds/Bg_Lair.jpg") },
  // Expert: the old vault, gold underfoot.
  { open: require("../../assets/sprites/tiles/Tile_Revealed_Vault.png"), shut: require("../../assets/sprites/tiles/Tile_Hidden_Vault.png"), bg: require("../../assets/sprites/backgrounds/Cover_Background.png") },
  // Master: the magma at the bottom.
  { open: require("../../assets/sprites/tiles/Tile_Revealed_Magma.png"), shut: require("../../assets/sprites/tiles/Tile_Hidden_Magma.png"), bg: require("../../assets/sprites/backgrounds/Bg_Magma.jpg") },
];

/** Where each stop of a chapter sits down the path (0 top, 1 bottom): a trail that winds down into the cave. */
const DEPTH = [0.08, 0.62, 0.3, 0.86, 0.48, 0.96];

const HEADER = 58;

type Props = {
  tier: number;
  width: number;
  height: number;
  puzzles: PuzzleProgress | undefined;
  /** The first puzzle still unsolved (where the hero stands). */
  next: number;
  heroArt: ImageSourcePropType;
  calm: boolean;
  onOpen: (index: number) => void;
};

/**
 * One chapter of the puzzle path, drawn as a map: the chapter's part of the cave behind, its six puzzles as floor tiles on a
 * trail that winds down, the stars won under each, and the hero standing on the next one to solve.
 */
export default function ChapterMap({ tier, width, height, puzzles, next, heroArt, calm, onOpen }: Props) {
  const { t } = useT();
  const tint = TIER_TINTS[tier];
  const art = CHAPTER_ART[tier];
  const first = tier * PUZZLES_PER_TIER;
  const open = isPuzzleOpen(puzzles, first);
  const got = Array.from({ length: PUZZLES_PER_TIER }, (_, k) => puzzleStarsAt(puzzles, first + k));
  const stars = got.reduce((a, s) => a + s, 0);
  const total = PUZZLES_PER_TIER * MAX_STARS;
  const mastered = stars === total;
  const size = PUZZLE_TIERS[tier];

  // The trail fills what is left under the header. Room is kept above a stop for the hero and under it for its stars.
  const pathH = Math.max(120, height - HEADER - 10);
  const S = Math.round(Math.max(38, Math.min(78, pathH * 0.34, (width - 40) / 6.6)));
  const top = S * 0.95;
  const bottom = pathH - S * 0.5 - S * 0.34 - 6;
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
        <View style={styles.score} accessible accessibilityLabel={t("puzzle.totalStars", { n: stars, total })}>
          {mastered ? (
            <View style={[styles.mastered, { borderColor: GOLD }]}>
              <SpriteImage source={MEDAL} style={{ width: 16, height: 16 }} resizeMode="contain" />
              <Text style={styles.masteredText} maxFontSizeMultiplier={1.1}>
                {t("puzzle.chapterDone").toLocaleUpperCase()}
              </Text>
            </View>
          ) : null}
          <View style={styles.scoreRow}>
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
        {stops.map((p, k) => {
          const i = first + k;
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
              here={i === next && got[k] === 0}
              heroArt={heroArt}
              tile={art}
              calm={calm}
              onPress={() => onOpen(i)}
            />
          );
        })}
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

const GOLD = "#FFD54F";

type StopProps = {
  index: number;
  x: number;
  y: number;
  size: number;
  tint: string;
  open: boolean;
  stars: number;
  here: boolean;
  heroArt: ImageSourcePropType;
  tile: { open: ImageSourcePropType; shut: ImageSourcePropType };
  calm: boolean;
  onPress: () => void;
};

/** One puzzle on the trail: a floor tile with its number, its stars on an arc under it, the hero over the next one. */
function Stop({ index, x, y, size: S, tint, open, stars, here, heroArt, tile, calm, onPress }: StopProps) {
  const { t } = useT();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!here || calm) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [here, calm, pulse]);
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
        accessibilityLabel={`${t("puzzle.number", { n: index + 1 })}. ${open ? (solved ? t("puzzle.stars", { n: stars }) : t("puzzle.unsolved")) : t("puzzle.locked")}`}
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
      {open ? (
        <View pointerEvents="none" style={[styles.stars, { left: x - star * 1.7, top: y + S / 2 - star * 0.35, width: star * 3.4 }]}>
          {Array.from({ length: MAX_STARS }, (_, k) => (
            <SpriteImage
              key={k}
              source={STAR}
              style={{ width: star, height: star, opacity: k < stars ? 1 : 0.22, marginTop: k === 1 ? star * 0.3 : 0 }}
              resizeMode="contain"
            />
          ))}
        </View>
      ) : null}
      {here ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.marker,
            { left: x - S * 0.32, top: y - S / 2 - S * 0.82, width: S * 0.64 },
            { transform: [{ translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] },
          ]}
        >
          <View style={[styles.markerBubble, { width: S * 0.64, height: S * 0.64, borderRadius: S * 0.32, borderColor: tint }]}>
            <SpriteImage source={heroArt} style={{ width: S * 0.6, height: S * 0.6, borderRadius: S * 0.3 }} resizeMode="cover" />
          </View>
          <View style={[styles.markerTip, { borderTopColor: tint }]} />
          <View style={[styles.youTag, { backgroundColor: tint }]}>
            <Text style={styles.youText} maxFontSizeMultiplier={1}>
              {t("puzzle.you").toLocaleUpperCase()}
            </Text>
          </View>
        </Animated.View>
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
  mastered: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 9, borderWidth: 1, backgroundColor: "rgba(255,213,79,0.14)" },
  masteredText: { color: GOLD, fontWeight: "900", fontSize: 10, letterSpacing: 1.2 },
  dot: { position: "absolute", width: 6, height: 6, borderRadius: 3, shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  halo: { position: "absolute", borderWidth: 2 },
  stop: { position: "absolute", borderWidth: 2.5, alignItems: "center", justifyContent: "center", backgroundColor: "#1a1410" },
  number: { color: "#fff", fontWeight: "900", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  stars: { position: "absolute", flexDirection: "row", justifyContent: "center" },
  marker: { position: "absolute", alignItems: "center" },
  markerBubble: { borderWidth: 2.5, backgroundColor: "#1a1410", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  markerTip: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7, borderLeftColor: "transparent", borderRightColor: "transparent", marginTop: -1 },
  youTag: { position: "absolute", top: -9, paddingHorizontal: 6, borderRadius: 7 },
  youText: { color: "#0b0d10", fontWeight: "900", fontSize: 9, letterSpacing: 1 },
  locked: { alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(6,8,10,0.62)", paddingHorizontal: 30 },
  lockedText: { color: "#E6D6C2", fontWeight: "800", fontSize: 14, textAlign: "center" },
});
