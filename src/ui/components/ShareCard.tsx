import React, { useMemo } from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Text from "./Text";
import SpriteImage from "./SpriteImage";
import type { Character } from "../../data/characters";
import { formatNumberNow } from "../../i18n/useT";

/** The shared picture's size in pixels: the 1.91:1 shape social apps show. */
export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 630;

export type ShareCardData = {
  character: Character;
  heroName: string;
  /** "SLEW THE GRIMBUR", "REACHED FLOOR 7"... already translated. */
  headline: string;
  score: number;
  /** Floor reached and the floors of an expedition (the pips); `floors` is 0 for the endless descent (no pips). */
  level: number;
  floors: number;
  victory: boolean;
  gems: string;
  time: string;
  /** The depth's name when it is not Normal. */
  depth?: string;
  /** "Daily #16" and the streak, when the run was the daily challenge. */
  daily?: string;
  streak?: string;
  invite: string;
  scoreLabel: string;
};

const GOLD = "#FFD54F";

/**
 * The picture a player shares after a run: the hero, the result, the score and the floors cleared as a row of squares.
 * It is laid out `width` dp wide (no wider than the window: Android does not draw what lies outside it, which cut the old
 * 1200 dp card) and captured at SHARE_CARD_WIDTH x SHARE_CARD_HEIGHT pixels. Every size is in units of the 1200-wide design
 * and text ignores the system font scale, so the picture is identical on every phone.
 */
const ShareCard = ({ width, character, heroName, headline, score, level, floors, victory, gems, time, depth, daily, streak, invite, scoreLabel }: ShareCardData & { width: number }) => {
  const u = width / SHARE_CARD_WIDTH;
  const s = useMemo(() => makeStyles(u), [u]);
  const accent = character.arrowColor;
  const pips = Array.from({ length: floors }, (_, i) => {
    const floor = i + 1;
    if (victory) return floor === floors ? "crown" : "cleared";
    if (floor < level) return "cleared";
    if (floor === level) return "death";
    return "unreached";
  });
  const chip = (icon: React.ComponentProps<typeof Ionicons>["name"], color: string, text: string) => (
    <View key={icon} style={[s.chip, { borderColor: color + "99", backgroundColor: color + "1F" }]}>
      <Ionicons name={icon} size={26 * u} color={color} />
      <Text style={s.chipText} allowFontScaling={false}>{text}</Text>
    </View>
  );
  return (
    <View style={s.card}>
      <ImageBackground source={require("../../assets/sprites/backgrounds/Cover_Background.png")} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient colors={["rgba(18,12,38,0.35)", "rgba(12,8,28,0.88)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[s.frame, { borderColor: accent + "CC" }]} />

      <View style={s.left}>
        <View style={[s.halo, { backgroundColor: accent + "22", borderColor: accent + "66" }]} />
        {/* The full figure (the victory pose after a win): the round-cut portrait looked cropped when blown up this big. */}
        <SpriteImage source={victory ? character.winImage : character.playerImage} style={s.hero} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Text style={[s.heroName, { color: accent }]} allowFontScaling={false}>{heroName.toLocaleUpperCase()}</Text>
      </View>

      <View style={s.right}>
        <SpriteImage source={require("../../assets/sprites/ui/Logo_Grimbur.png")} style={s.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
        {daily ? <Text style={[s.daily, { color: accent }]} allowFontScaling={false}>{daily}</Text> : null}
        <Text style={[s.headline, victory && { color: GOLD }]} numberOfLines={2} allowFontScaling={false}>
          {headline.toLocaleUpperCase()}
        </Text>
        <View style={s.scoreRow}>
          <Text style={s.score} numberOfLines={1} allowFontScaling={false}>{formatNumberNow(score)}</Text>
          <Text style={s.scoreLabel} allowFontScaling={false}>{scoreLabel.toLocaleUpperCase()}</Text>
        </View>

        {floors > 0 ? (
          <View style={s.pips}>
            {pips.map((kind, i) => (
              <View
                key={i}
                style={[
                  s.pip,
                  kind === "cleared" && { backgroundColor: "#66BB6A", borderColor: "#A5D6A7" },
                  kind === "death" && { backgroundColor: "#EF5350", borderColor: "#FF8A80" },
                  kind === "crown" && { backgroundColor: GOLD, borderColor: "#FFF3B0" },
                ]}
              >
                {kind === "crown" ? <Ionicons name="trophy" size={26 * u} color="#3a2600" /> : null}
                {kind === "death" ? <Ionicons name="skull" size={24 * u} color="#3b0d0d" /> : null}
              </View>
            ))}
          </View>
        ) : null}

        <View style={s.chips}>
          {chip("diamond", "#4FC3F7", gems)}
          {chip("time", "#B39DDB", time)}
          {depth ? chip("flame", "#FF8A65", depth) : null}
          {streak ? chip("calendar", GOLD, streak) : null}
        </View>

        <Text style={s.invite} numberOfLines={2} allowFontScaling={false}>{invite}</Text>
      </View>
    </View>
  );
};

export default ShareCard;

const makeStyles = (u: number) =>
  StyleSheet.create({
    card: { width: SHARE_CARD_WIDTH * u, height: SHARE_CARD_HEIGHT * u, backgroundColor: "#201912", flexDirection: "row", alignItems: "center", overflow: "hidden" },
    frame: { position: "absolute", left: 14 * u, top: 14 * u, right: 14 * u, bottom: 14 * u, borderWidth: 4 * u, borderRadius: 34 * u },
    left: { width: 460 * u, height: "100%", alignItems: "center", justifyContent: "center" },
    halo: { position: "absolute", width: 380 * u, height: 380 * u, borderRadius: 190 * u, borderWidth: 4 * u },
    hero: { width: 420 * u, height: 470 * u, marginBottom: 30 * u },
    heroName: { position: "absolute", bottom: 34 * u, fontSize: 38 * u, fontWeight: "900", letterSpacing: 6 * u },
    right: { flex: 1, paddingRight: 64 * u, gap: 12 * u, justifyContent: "center" },
    logo: { width: 300 * u, height: 124 * u, marginLeft: -8 * u },
    daily: { fontSize: 28 * u, fontWeight: "900", letterSpacing: 4 * u },
    headline: { color: "#FFFFFF", fontSize: 54 * u, lineHeight: 62 * u, fontWeight: "900", letterSpacing: 2 * u },
    scoreRow: { flexDirection: "row", alignItems: "baseline", gap: 18 * u },
    score: { color: "#FFFFFF", fontSize: 104 * u, lineHeight: 118 * u, fontWeight: "900", letterSpacing: 2 * u },
    scoreLabel: { color: "#D6C4B2", fontSize: 30 * u, fontWeight: "900", letterSpacing: 6 * u },
    pips: { flexDirection: "row", gap: 10 * u, marginTop: 2 * u },
    pip: { width: 52 * u, height: 52 * u, borderRadius: 12 * u, borderWidth: 3 * u, backgroundColor: "#4D3B29", borderColor: "#6A5643", alignItems: "center", justifyContent: "center" },
    chips: { flexDirection: "row", gap: 12 * u, flexWrap: "wrap", marginTop: 4 * u },
    chip: { flexDirection: "row", alignItems: "center", gap: 10 * u, borderWidth: 3 * u, borderRadius: 18 * u, paddingHorizontal: 18 * u, paddingVertical: 8 * u },
    chipText: { color: "#FFFFFF", fontSize: 30 * u, fontWeight: "900" },
    invite: { color: "#E9E0D7", fontSize: 28 * u, fontStyle: "italic", marginTop: 6 * u },
  });
