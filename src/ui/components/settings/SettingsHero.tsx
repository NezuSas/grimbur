import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "../Text";
import SpriteImage from "../SpriteImage";
import type { AttackButtonPlacement, ControlPosition, ControlSize, JoystickSkin, MovePadStyle } from "../../../state/settings/types";

/** The painted art of each Settings category, shown on the rail and on the pane's showcase. */
export const SETTINGS_ART = {
  sound: require("../../../assets/sprites/tools/Tool_Detector.png"),
  controls: require("../../../assets/sprites/forge/swift.png"),
  access: require("../../../assets/sprites/tools/Ability_Scout.png"),
  language: require("../../../assets/sprites/forge/scribe.png"),
  data: require("../../../assets/sprites/forge/satchel.png"),
  about: require("../../../assets/sprites/relics/lantern.png"),
} as const;

/** A slow breath, so the showcase feels alive without pulling the eye away from the settings. */
function useBreath() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return v;
}

type HeroProps = {
  art: ImageSourcePropType;
  tint: string;
  title: string;
  hint?: string;
  /** Side by side with the art (a narrow pane) instead of under it. */
  compact?: boolean;
  children?: React.ReactNode;
};

/** The showcase at the head of a Settings pane: its painted art in a glow, its name and what it is for. */
export const PaneHero = ({ art, tint, title, hint, compact, children }: HeroProps) => {
  const breath = useBreath();
  const size = compact ? 52 : 84;
  return (
    <View style={[styles.hero, { borderColor: tint + "55" }, compact && styles.heroCompact]}>
      <View style={[compact ? styles.heroRow : styles.heroCol]}>
        <View style={{ width: size + 16, height: size + 16, alignItems: "center", justifyContent: "center" }}>
          <Animated.View
            style={[
              styles.glow,
              { width: size + 12, height: size + 12, borderRadius: (size + 12) / 2, backgroundColor: tint },
              { opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.3] }) },
            ]}
          />
          <Animated.View style={{ transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }] }}>
            <SpriteImage source={art} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />
          </Animated.View>
        </View>
        <View style={[compact ? { flex: 1 } : { alignItems: "center" }, { gap: 3 }]}>
          <Text style={[styles.heroTitle, { color: tint }, compact ? styles.heroTitleCompact : { textAlign: "center" }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.15} accessibilityRole="header">
            {title.toLocaleUpperCase()}
          </Text>
          {hint ? (
            <Text style={[styles.heroHint, !compact && { textAlign: "center" }]} maxFontSizeMultiplier={1.2}>
              {hint}
            </Text>
          ) : null}
        </View>
      </View>
      {children}
    </View>
  );
};

const SIZE_SCALE: Record<ControlSize, number> = { small: 0.82, medium: 1, large: 1.2 };

type PreviewProps = {
  width: number;
  position: ControlPosition;
  attack: AttackButtonPlacement;
  size: ControlSize;
  pad: MovePadStyle;
  skin: JoystickSkin;
  hero: ImageSourcePropType;
  caption: string;
};

/**
 * A small run, drawn from the current settings: the pad on its side, the attack button where it will be, at the size
 * chosen. Every change on the right shows here at once, so the player sees the result before entering a dungeon.
 */
export const ControlsPreview = ({ width, position, attack, size, pad, skin, hero, caption }: PreviewProps) => {
  const height = Math.round(width * 0.56);
  const k = SIZE_SCALE[size];
  const padSize = Math.round(height * 0.42 * k);
  const attackSize = Math.round(height * 0.3 * k);
  const tile = Math.round(height * 0.24);
  const side = Math.round(width * 0.25);
  // The joystick knob drifts, as if a thumb were on it.
  const drift = useBreath();
  const knob = Math.round(padSize * 0.42);
  const arcade = skin === "arcade";

  const padView =
    pad === "floating" ? (
      <View style={[styles.stickBase, { width: padSize, height: padSize, borderRadius: padSize / 2 }, arcade ? styles.stickBaseArcade : styles.stickBaseConsole]}>
        <Animated.View
          style={[
            styles.stickKnob,
            { width: knob, height: knob, borderRadius: knob / 2 },
            arcade ? styles.stickKnobArcade : styles.stickKnobConsole,
            { transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-padSize * 0.16, padSize * 0.16] }) }] },
          ]}
        />
        {attack === "center" ? <SpriteImage source={require("../../../assets/sprites/ui/Attack_Ready.png")} style={[styles.centerAttack, { width: knob * 0.8, height: knob * 0.8 }]} resizeMode="contain" /> : null}
      </View>
    ) : (
      <View style={[styles.cross, { width: padSize, height: padSize }]}>
        {(["caret-up", "caret-down", "caret-back", "caret-forward"] as const).map((icon, i) => (
          <View
            key={icon}
            style={[
              styles.crossKey,
              { width: padSize / 3, height: padSize / 3 },
              i === 0 && { top: 0, left: padSize / 3 },
              i === 1 && { bottom: 0, left: padSize / 3 },
              i === 2 && { left: 0, top: padSize / 3 },
              i === 3 && { right: 0, top: padSize / 3 },
            ]}
          >
            <Ionicons name={icon} size={padSize / 5} color="#FFE7A8" />
          </View>
        ))}
        <View style={[styles.crossMid, { width: padSize / 3, height: padSize / 3, left: padSize / 3, top: padSize / 3 }]}>
          {attack === "center" ? <SpriteImage source={require("../../../assets/sprites/ui/Attack_Ready.png")} style={{ width: padSize / 3.3, height: padSize / 3.3 }} resizeMode="contain" /> : null}
        </View>
      </View>
    );

  const moveCol = (
    <View style={[styles.previewSide, { width: side }]} key="move">
      {padView}
    </View>
  );
  const attackCol = (
    <View style={[styles.previewSide, { width: side }]} key="attack">
      {attack === "side" ? <SpriteImage source={require("../../../assets/sprites/ui/Attack_Ready.png")} style={{ width: attackSize, height: attackSize }} resizeMode="contain" /> : null}
    </View>
  );

  return (
    <View style={{ gap: 6, alignItems: "center" }}>
      <View style={[styles.preview, { width, height }]} accessible accessibilityLabel={caption}>
        <Image source={require("../../../assets/sprites/backgrounds/Bg_Lair.jpg")} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,7,4,0.45)" }]} />
        <View style={styles.previewRow}>
          {position === "left" ? moveCol : attackCol}
          <View style={styles.previewBoard}>
            {[0, 1, 2].map(r => (
              <View key={r} style={{ flexDirection: "row" }}>
                {[0, 1, 2].map(c => (
                  <SpriteImage
                    key={c}
                    source={r === 1 && c === 1 ? require("../../../assets/sprites/tiles/Tile_Revealed_Lair.png") : require("../../../assets/sprites/tiles/Tile_Hidden_Lair.png")}
                    style={{ width: tile, height: tile }}
                    resizeMode="cover"
                  />
                ))}
              </View>
            ))}
            <SpriteImage source={hero} style={{ position: "absolute", width: tile * 1.1, height: tile * 1.1, left: tile * 0.95, top: tile * 0.85 }} resizeMode="contain" />
          </View>
          {position === "left" ? attackCol : moveCol}
        </View>
      </View>
      <View style={styles.captionRow}>
        <View style={styles.liveDot} />
        <Text style={styles.caption} numberOfLines={1} maxFontSizeMultiplier={1.15}>
          {caption.toLocaleUpperCase()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: { gap: 12, padding: 14, borderRadius: 20, borderWidth: 1.5, backgroundColor: "rgba(34,26,18,0.92)", overflow: "hidden" },
  heroCompact: { paddingVertical: 10 },
  heroCol: { alignItems: "center", gap: 6 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  glow: { position: "absolute" },
  heroTitle: { fontWeight: "900", fontSize: 20, letterSpacing: 2.5 },
  heroTitleCompact: { fontSize: 15, letterSpacing: 1.2 },
  heroHint: { color: "#D4C2B0", fontSize: 12.5, lineHeight: 17, fontWeight: "600" },
  preview: { borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,213,79,0.45)", overflow: "hidden", justifyContent: "center" },
  previewRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  previewSide: { alignItems: "center", justifyContent: "flex-end", alignSelf: "stretch", paddingBottom: 8 },
  previewBoard: { borderRadius: 6, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  stickBase: { alignItems: "center", justifyContent: "center", borderWidth: 2 },
  stickBaseConsole: { backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,213,79,0.7)" },
  stickBaseArcade: { backgroundColor: "rgba(20,20,20,0.6)", borderColor: "rgba(255,255,255,0.5)" },
  stickKnob: { borderWidth: 2 },
  stickKnobConsole: { backgroundColor: "#4A4436", borderColor: "#FFD54F" },
  stickKnobArcade: { backgroundColor: "#E53935", borderColor: "#FF8A80" },
  centerAttack: { position: "absolute" },
  cross: {},
  crossKey: { position: "absolute", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(60,45,28,0.92)", borderWidth: 1, borderColor: "rgba(255,213,79,0.55)", borderRadius: 5 },
  crossMid: { position: "absolute", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(60,45,28,0.92)" },
  captionRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#9EE37D" },
  caption: { color: "#B99A7C", fontWeight: "900", fontSize: 11, letterSpacing: 1.4 },
});
