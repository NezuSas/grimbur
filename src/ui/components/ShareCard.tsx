import React from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Text from "./Text";
import SpriteImage from "./SpriteImage";
import type { Character } from "../../data/characters";

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
 * The picture a player shares after a run: the hero, the result, the score and the floors cleared as a row of squares. It is drawn
 * at a fixed size (1200 x 630, the shape social apps show) off-screen and captured as an image, so it looks the same on every phone.
 */
const ShareCard = ({ character, heroName, headline, score, level, floors, victory, gems, time, depth, daily, streak, invite, scoreLabel }: ShareCardData) => {
  const accent = character.arrowColor;
  const pips = Array.from({ length: floors }, (_, i) => {
    const floor = i + 1;
    if (victory) return floor === floors ? "crown" : "cleared";
    if (floor < level) return "cleared";
    if (floor === level) return "death";
    return "unreached";
  });
  return (
    <View style={styles.card}>
      <ImageBackground source={require("../../assets/sprites/backgrounds/Cover_Background.png")} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient colors={["rgba(18,12,38,0.45)", "rgba(12,8,28,0.9)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.frame, { borderColor: accent + "CC" }]} />

      <View style={styles.left}>
        <View style={[styles.halo, { backgroundColor: accent + "22", borderColor: accent + "66" }]} />
        <SpriteImage source={victory ? character.winImage : character.scoreImage} style={styles.hero} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Text style={[styles.heroName, { color: accent }]}>{heroName.toLocaleUpperCase()}</Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.brand}>GRIMBUR</Text>
        {daily ? <Text style={[styles.daily, { color: accent }]}>{daily}</Text> : null}
        <Text style={[styles.headline, victory && { color: GOLD }]} numberOfLines={2} adjustsFontSizeToFit>
          {headline.toLocaleUpperCase()}
        </Text>
        <View style={styles.scoreRow}>
          <Text style={styles.score}>{score.toLocaleString()}</Text>
          <Text style={styles.scoreLabel}>{scoreLabel.toLocaleUpperCase()}</Text>
        </View>

        {floors > 0 ? (
          <View style={styles.pips}>
            {pips.map((kind, i) => (
              <View
                key={i}
                style={[
                  styles.pip,
                  kind === "cleared" && { backgroundColor: "#66BB6A", borderColor: "#A5D6A7" },
                  kind === "death" && { backgroundColor: "#EF5350", borderColor: "#FF8A80" },
                  kind === "crown" && { backgroundColor: GOLD, borderColor: "#FFF3B0" },
                ]}
              >
                {kind === "crown" ? <Ionicons name="trophy" size={26} color="#3a2600" /> : null}
                {kind === "death" ? <Ionicons name="skull" size={24} color="#3b0d0d" /> : null}
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.chips}>
          <Chip icon="diamond" color="#4FC3F7" text={gems} />
          <Chip icon="time" color="#B39DDB" text={time} />
          {depth ? <Chip icon="flame" color="#FF8A65" text={depth} /> : null}
          {streak ? <Chip icon="calendar" color={GOLD} text={streak} /> : null}
        </View>

        <Text style={styles.invite}>{invite}</Text>
      </View>
    </View>
  );
};

const Chip = ({ icon, color, text }: { icon: React.ComponentProps<typeof Ionicons>["name"]; color: string; text: string }) => (
  <View style={[styles.chip, { borderColor: color + "99", backgroundColor: color + "1F" }]}>
    <Ionicons name={icon} size={26} color={color} />
    <Text style={styles.chipText}>{text}</Text>
  </View>
);

export default ShareCard;

const styles = StyleSheet.create({
  card: { width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT, backgroundColor: "#120C26", flexDirection: "row", alignItems: "center", overflow: "hidden" },
  frame: { position: "absolute", left: 14, top: 14, right: 14, bottom: 14, borderWidth: 4, borderRadius: 34 },
  left: { width: 470, height: "100%", alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: 380, height: 380, borderRadius: 190, borderWidth: 4 },
  hero: { width: 400, height: 440 },
  heroName: { position: "absolute", bottom: 40, fontSize: 38, fontWeight: "900", letterSpacing: 6 },
  right: { flex: 1, paddingRight: 64, gap: 14, justifyContent: "center" },
  brand: { color: GOLD, fontSize: 30, fontWeight: "900", letterSpacing: 7 },
  daily: { fontSize: 28, fontWeight: "900", letterSpacing: 4 },
  headline: { color: "#FFFFFF", fontSize: 64, fontWeight: "900", letterSpacing: 2 },
  scoreRow: { flexDirection: "row", alignItems: "baseline", gap: 18 },
  score: { color: "#FFFFFF", fontSize: 112, fontWeight: "900", letterSpacing: 2 },
  scoreLabel: { color: "#b9b4d4", fontSize: 30, fontWeight: "900", letterSpacing: 6 },
  pips: { flexDirection: "row", gap: 10, marginTop: 2 },
  pip: { width: 52, height: 52, borderRadius: 12, borderWidth: 3, backgroundColor: "#2c2650", borderColor: "#443d70", alignItems: "center", justifyContent: "center" },
  chips: { flexDirection: "row", gap: 12, flexWrap: "wrap", marginTop: 4 },
  chip: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 3, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 8 },
  chipText: { color: "#FFFFFF", fontSize: 30, fontWeight: "900" },
  invite: { color: "#d7d2ee", fontSize: 30, fontStyle: "italic", marginTop: 6 },
});
