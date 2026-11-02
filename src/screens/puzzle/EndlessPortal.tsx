import React, { useEffect, useRef } from "react";
import { Animated, Easing, ImageBackground, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import PressScale from "../../ui/components/PressScale";
import { useT } from "../../i18n/useT";
import { ENDLESS_AFTER } from "../../core/puzzles/puzzles";
import { ENDLESS_EMBERS_PER_STAR } from "../../core/stats/puzzleProgress";

const TINT = "#CE93D8";
const VORTEX = require("../../assets/sprites/tiles/Danger_Vortex.png");
const PADLOCK = require("../../assets/sprites/ui/Icon_Padlock.png");

type Props = {
  width: number;
  height: number;
  open: boolean;
  /** Puzzles of the path solved (for the locked portal's progress). */
  solvedPath: number;
  solved: number;
  bestRun: number;
  calm: boolean;
  onPlay: () => void;
};

/** The end of the path: a portal to the endless puzzles, turning slowly; sealed until the thirty are solved. */
export default function EndlessPortal({ width, height, open, solvedPath, solved, bestRun, calm, onPlay }: Props) {
  const { t } = useT();
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (calm) return;
    // Two half turns in a sequence (a lone timing in a loop runs once on the web).
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(spin, { toValue: 0.5, duration: 7000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(spin, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(spin, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [calm, spin]);
  const portal = Math.min(height * 0.42, width * 0.3, 150);

  return (
    <View style={[styles.panel, { width, height }]}>
      <ImageBackground source={require("../../assets/sprites/backgrounds/Bg_Crystal.jpg")} style={StyleSheet.absoluteFill} resizeMode="cover" imageStyle={{ opacity: 0.4 }} />
      <LinearGradient colors={["rgba(40,16,52,0.75)", "rgba(10,6,16,0.9)"]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.body}>
        <View style={{ width: portal, height: portal, alignItems: "center", justifyContent: "center" }}>
          <View style={[styles.glow, { width: portal, height: portal, borderRadius: portal / 2, opacity: open ? 0.55 : 0.2 }]} />
          <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }], opacity: open ? 1 : 0.45 }}>
            <SpriteImage source={VORTEX} style={{ width: portal * 0.86, height: portal * 0.86 }} resizeMode="contain" />
          </Animated.View>
          {!open ? <SpriteImage source={PADLOCK} style={{ position: "absolute", width: portal * 0.34, height: portal * 0.34 }} resizeMode="contain" /> : null}
        </View>
        <View style={styles.texts}>
          <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
            {t("puzzle.chapter", { n: "∞" }).toLocaleUpperCase()}
          </Text>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>
            {t("puzzle.endless.title")}
          </Text>
          <Text style={styles.line} maxFontSizeMultiplier={1.1}>
            {open ? t("puzzle.endless.body", { n: ENDLESS_EMBERS_PER_STAR }) : t("puzzle.endless.locked")}
          </Text>
          {open ? (
            <>
              <Text style={styles.stats} maxFontSizeMultiplier={1.1}>
                {t("puzzle.endless.stats", { solved, best: bestRun })}
              </Text>
              <PressScale onPress={onPlay} style={styles.button} accessibilityRole="button" accessibilityLabel={`${t("puzzle.endless.play")} #${solved + 1}`}>
                <Text style={styles.buttonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>
                  {`${t("puzzle.endless.play")} · #${solved + 1}`.toLocaleUpperCase()}
                </Text>
              </PressScale>
            </>
          ) : (
            <View style={styles.progress}>
              <View style={styles.bar}>
                <View style={[styles.fill, { width: `${Math.round((solvedPath / ENDLESS_AFTER) * 100)}%` }]} />
              </View>
              <Text style={styles.stats} maxFontSizeMultiplier={1.1}>
                {t("puzzle.endless.progress", { n: solvedPath, total: ENDLESS_AFTER })}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 22, borderWidth: 1.5, borderColor: TINT + "88", overflow: "hidden", backgroundColor: "#0b0810" },
  body: { flex: 1, flexDirection: "row", alignItems: "center", gap: 20, paddingHorizontal: 24 },
  glow: { position: "absolute", backgroundColor: TINT, shadowColor: TINT, shadowOpacity: 1, shadowRadius: 40, shadowOffset: { width: 0, height: 0 } },
  texts: { flex: 1, gap: 6 },
  kicker: { color: TINT, fontWeight: "900", fontSize: 11, letterSpacing: 2 },
  title: { color: "#F8EEFF", fontWeight: "900", fontSize: 26 },
  line: { color: "#E6D6EE", fontSize: 13 },
  stats: { color: "#F3E5F5", fontSize: 12, fontWeight: "800" },
  button: { alignSelf: "flex-start", minHeight: 42, minWidth: 180, borderRadius: 14, backgroundColor: TINT, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderBottomWidth: 3, borderBottomColor: "#7B1FA2", marginTop: 4 },
  buttonText: { color: "#2A0E33", fontWeight: "900", letterSpacing: 1, fontSize: 14 },
  progress: { gap: 5, marginTop: 4 },
  bar: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.14)", overflow: "hidden", maxWidth: 260 },
  fill: { height: 6, borderRadius: 3, backgroundColor: TINT },
});
