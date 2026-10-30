import React, { useEffect, useMemo, useRef } from "react";
import { Image, ImageBackground, StyleSheet, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Text from "./Text";
import type { Character } from "../../data/characters";
import { formatNumberNow } from "../../i18n/useT";

/** The shared picture's shape: the 1.91:1 that social apps show. Captured at the phone's own resolution (see shareResult). */
export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 630;

export type ShareCardData = {
  character: Character;
  heroName: string;
  /** "SLEW THE GRIMBUR", "REACHED FLOOR 7"... already translated. */
  headline: string;
  score: number;
  /** Floor reached and the floors of an expedition; `floors` is 0 for the endless descent (no track). */
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
const RED = "#FF5A4E";
const ART = {
  background: require("../../assets/sprites/backgrounds/Cover_Background.png"),
  logo: require("../../assets/sprites/ui/Logo_Grimbur.png"),
  gem: require("../../assets/sprites/items/Icon_Gem.png"),
  time: require("../../assets/sprites/tools/Tool_Undo.png"),
  depth: require("../../assets/sprites/items/Icon_Ember.png"),
  streak: require("../../assets/sprites/ui/Icon_Calendar.png"),
  skull: require("../../assets/sprites/ui/Icon_Skull.png"),
  trophy: require("../../assets/sprites/ui/Icon_Trophy.png"),
} as const;

/**
 * The picture a player shares after a run, laid out like a poster: the hero big in warm light on the left; on the right the
 * game's logo, the result on a ribbon, the score in gold, the way down the ten floors and the run's numbers in painted tiles;
 * an invitation along the bottom. Every size is in units of the 1200-wide design and text ignores the system font scale, so
 * the picture is the same on every phone. `onReady` fires once every picture in it has loaded (it is captured after that).
 */
const ShareCard = ({ width, onReady, character, heroName, headline, score, level, floors, victory, gems, time, depth, daily, streak, invite, scoreLabel }: ShareCardData & { width: number; onReady?: () => void }) => {
  const u = width / SHARE_CARD_WIDTH;
  const s = useMemo(() => makeStyles(u), [u]);
  const accent = victory ? GOLD : RED;
  const heroArt: ImageSourcePropType = victory ? character.winImage : character.playerImage;

  // Count the pictures as they load: the card is only ready to capture when all of them are drawn.
  const tiles = [
    { key: "gem", art: ART.gem, text: gems },
    { key: "time", art: ART.time, text: time },
    ...(depth ? [{ key: "depth", art: ART.depth, text: depth }] : []),
    ...(streak ? [{ key: "streak", art: ART.streak, text: streak }] : []),
  ];
  const expected = 3 + tiles.length + (floors > 0 ? 1 : 0); // background, hero, logo, tiles, the track's end
  const loaded = useRef(0);
  const ready = useRef(onReady);
  ready.current = onReady;
  const onLoaded = () => {
    loaded.current += 1;
    if (loaded.current === expected) ready.current?.();
  };
  useEffect(() => {
    loaded.current = 0;
  }, [expected]);

  return (
    <View style={s.card}>
      <ImageBackground source={ART.background} style={StyleSheet.absoluteFill} resizeMode="cover" onLoadEnd={onLoaded} />
      {/* Warm light on the hero's side, deep shade under the text */}
      <LinearGradient colors={["rgba(60,36,14,0.15)", "rgba(20,12,6,0.82)", "rgba(10,6,3,0.96)"]} locations={[0, 0.42, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]} start={{ x: 0.5, y: 0.6 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[s.frame, { borderColor: accent + "B3" }]} />
      <View style={[s.frameInner, { borderColor: accent + "40" }]} />

      {/* ── The hero ─────────────────────────────────────────────────────────── */}
      <View style={s.left}>
        {/* A soft light behind the hero: rings of falling strength instead of one hard-edged disc */}
        {[1, 0.78, 0.58, 0.4].map((k, i) => (
          <View key={i} style={[s.light, { width: 480 * u * k, height: 480 * u * k, borderRadius: 240 * u * k, top: (60 + 240 * (1 - k)) * u, backgroundColor: accent }]} />
        ))}
        <Image fadeDuration={0} source={heroArt} style={s.hero} resizeMode="contain" onLoadEnd={onLoaded} />
        <View style={[s.plate, { borderColor: accent }]}>
          <Text style={[s.plateText, { color: accent }]} numberOfLines={1} allowFontScaling={false}>
            {heroName.toLocaleUpperCase()}
          </Text>
        </View>
      </View>

      {/* ── The result ───────────────────────────────────────────────────────── */}
      <View style={s.right}>
        <Image fadeDuration={0} source={ART.logo} style={s.logo} resizeMode="contain" onLoadEnd={onLoaded} />
        <View style={[s.ribbon, { backgroundColor: accent }]}>
          <Text style={s.ribbonText} numberOfLines={1} allowFontScaling={false}>
            {(daily ? `${daily} · ${headline}` : headline).toLocaleUpperCase()}
          </Text>
        </View>
        <View style={s.scoreRow}>
          <Text style={[s.score, { color: victory ? GOLD : "#FFF4DE" }]} numberOfLines={1} allowFontScaling={false}>
            {formatNumberNow(score)}
          </Text>
          <Text style={s.scoreLabel} allowFontScaling={false}>{scoreLabel.toLocaleUpperCase()}</Text>
        </View>

        {floors > 0 ? (
          <View style={s.track}>
            {Array.from({ length: floors }, (_, i) => {
              const floor = i + 1;
              const fell = !victory && floor === level;
              const done = victory || floor < level;
              return (
                <React.Fragment key={i}>
                  {i > 0 ? <View style={[s.trackLine, (victory || floor <= level) && { backgroundColor: accent }]} /> : null}
                  {floor === floors ? (
                    <Image fadeDuration={0} source={victory ? ART.trophy : ART.skull} style={[s.trackEnd, !victory && { opacity: 0.75 }]} resizeMode="contain" onLoadEnd={onLoaded} />
                  ) : fell ? (
                    <View style={[s.trackFall, { backgroundColor: RED }]}>
                      <Ionicons name="close" size={22 * u} color="#fff" />
                    </View>
                  ) : (
                    <View style={[s.trackDot, done && { backgroundColor: accent, borderColor: accent }]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        ) : null}

        <View style={s.tiles}>
          {tiles.map(tile => (
            <View key={tile.key} style={s.tile}>
              <Image fadeDuration={0} source={tile.art} style={s.tileArt} resizeMode="contain" onLoadEnd={onLoaded} />
              <Text style={s.tileText} numberOfLines={1} allowFontScaling={false}>{tile.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── The invitation ───────────────────────────────────────────────────── */}
      <View style={s.footer}>
        <Text style={s.footerText} numberOfLines={1} allowFontScaling={false}>{invite}</Text>
      </View>
    </View>
  );
};

export default ShareCard;

const makeStyles = (u: number) =>
  StyleSheet.create({
    card: { width: SHARE_CARD_WIDTH * u, height: SHARE_CARD_HEIGHT * u, backgroundColor: "#1A120B", flexDirection: "row", overflow: "hidden" },
    frame: { position: "absolute", left: 16 * u, top: 16 * u, right: 16 * u, bottom: 16 * u, borderWidth: 3 * u, borderRadius: 28 * u },
    frameInner: { position: "absolute", left: 26 * u, top: 26 * u, right: 26 * u, bottom: 26 * u, borderWidth: 1.5 * u, borderRadius: 20 * u },
    left: { width: 470 * u, alignItems: "center", justifyContent: "flex-end", paddingBottom: 150 * u },
    light: { position: "absolute", opacity: 0.045 },
    hero: { width: 400 * u, height: 410 * u },
    plate: { position: "absolute", bottom: 100 * u, paddingHorizontal: 30 * u, paddingVertical: 8 * u, borderRadius: 14 * u, borderWidth: 2.5 * u, backgroundColor: "rgba(16,10,5,0.85)" },
    plateText: { fontSize: 30 * u, fontWeight: "900", letterSpacing: 6 * u },
    right: { flex: 1, justifyContent: "center", paddingRight: 70 * u, paddingBottom: 78 * u, gap: 14 * u },
    logo: { width: 290 * u, height: 112 * u, marginLeft: -10 * u, marginBottom: -4 * u },
    ribbon: { alignSelf: "flex-start", paddingHorizontal: 22 * u, paddingVertical: 8 * u, borderRadius: 10 * u },
    ribbonText: { color: "#1A0F04", fontSize: 26 * u, fontWeight: "900", letterSpacing: 3 * u },
    scoreRow: { flexDirection: "row", alignItems: "baseline", gap: 16 * u, marginTop: -4 * u },
    score: { fontSize: 120 * u, lineHeight: 132 * u, fontWeight: "900", letterSpacing: 1 * u, textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 4 * u }, textShadowRadius: 10 * u },
    scoreLabel: { color: "#CDB49A", fontSize: 28 * u, fontWeight: "900", letterSpacing: 6 * u },
    track: { flexDirection: "row", alignItems: "center", marginRight: 10 * u },
    trackLine: { flex: 1, height: 5 * u, borderRadius: 3 * u, backgroundColor: "rgba(255,255,255,0.16)" },
    trackDot: { width: 22 * u, height: 22 * u, borderRadius: 11 * u, borderWidth: 3 * u, borderColor: "rgba(255,255,255,0.35)", backgroundColor: "rgba(0,0,0,0.5)" },
    trackFall: { width: 34 * u, height: 34 * u, borderRadius: 17 * u, borderWidth: 3 * u, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
    trackEnd: { width: 44 * u, height: 44 * u },
    tiles: { flexDirection: "row", flexWrap: "wrap", gap: 12 * u },
    tile: { flexDirection: "row", alignItems: "center", gap: 10 * u, paddingVertical: 8 * u, paddingLeft: 10 * u, paddingRight: 20 * u, borderRadius: 16 * u, borderWidth: 2 * u, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(0,0,0,0.45)" },
    tileArt: { width: 40 * u, height: 40 * u },
    tileText: { color: "#FFF4DE", fontSize: 28 * u, fontWeight: "900" },
    footer: { position: "absolute", left: 26 * u, right: 26 * u, bottom: 26 * u, height: 58 * u, alignItems: "center", justifyContent: "center", borderBottomLeftRadius: 20 * u, borderBottomRightRadius: 20 * u, backgroundColor: "rgba(0,0,0,0.55)", borderTopWidth: 1.5 * u, borderTopColor: "rgba(255,213,79,0.25)" },
    footerText: { color: "#E9DCCB", fontSize: 25 * u, fontWeight: "800", letterSpacing: 1 * u },
  });
