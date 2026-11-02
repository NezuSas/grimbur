import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Text from "../Text";
import SpriteImage from "../SpriteImage";
import { PanelTrim } from "./popup";

type Props = {
  /** A new key plays the banner again. */
  fanfareKey: number;
  tint: string;
  /** One picture, or several side by side (a family's relics). */
  art: ImageSourcePropType | ImageSourcePropType[];
  kicker: string;
  title: string;
  line?: string;
  top: number;
  calm?: boolean;
  onDone: () => void;
  /** Development only: stays up (for screenshots). */
  hold?: boolean;
};

/**
 * A moment worth marking during a run (a relic family completed, a creature new to the bestiary): a pop-up card in its
 * colour that springs in under the HUD, glows and goes away by itself. Never blocks touches.
 */
const Fanfare: React.FC<Props> = ({ fanfareKey, tint, art, kicker, title, line, top, calm = false, onDone, hold = false }) => {
  const show = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    show.setValue(0);
    glow.setValue(0);
    const pulse = calm
      ? Animated.delay(0)
      : Animated.loop(Animated.sequence([Animated.timing(glow, { toValue: 1, duration: 450, useNativeDriver: true }), Animated.timing(glow, { toValue: 0, duration: 450, useNativeDriver: true })]), { iterations: 3 });
    const run = Animated.sequence([
      calm ? Animated.timing(show, { toValue: 1, duration: 160, useNativeDriver: true }) : Animated.spring(show, { toValue: 1, friction: 5, tension: 110, useNativeDriver: true }),
      Animated.delay(2600),
      ...(hold ? [] : [Animated.timing(show, { toValue: 0, duration: 280, useNativeDriver: true })]),
    ]);
    pulse.start();
    run.start(({ finished }) => {
      if (finished && !hold) doneRef.current();
    });
    return () => {
      run.stop();
      pulse.stop();
    };
  }, [fanfareKey, calm, hold, show, glow]);

  const arts = Array.isArray(art) ? art : [art];
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${kicker}. ${title}${line ? `. ${line}` : ""}`}
      style={[styles.wrap, { top, opacity: show, transform: [{ scale: show.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]}
    >
      <View style={[styles.card, { borderColor: tint + "CC", shadowColor: tint }]}>
        <LinearGradient colors={["#493827", "#2D2318", "#201912"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.16] }) }]} />
        <PanelTrim tint={tint} />
        <View style={styles.arts}>
          {arts.slice(0, 3).map((a, i) => (
            <View key={i} style={[styles.well, { borderColor: tint + "AA", backgroundColor: tint + "22" }]}>
              <SpriteImage source={a} style={styles.art} resizeMode="contain" />
            </View>
          ))}
        </View>
        <View style={styles.texts}>
          <Text style={[styles.kicker, { color: tint }]} maxFontSizeMultiplier={1.1}>
            {kicker.toLocaleUpperCase()}
          </Text>
          <Text style={[styles.title, { textShadowColor: tint + "AA" }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>
            {title.toLocaleUpperCase()}
          </Text>
          {line ? (
            <Text style={styles.line} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.1}>
              {line}
            </Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
};

export default Fanfare;

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 1100, elevation: 40 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    maxWidth: "86%",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 2,
    overflow: "hidden",
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  arts: { flexDirection: "row", gap: 6 },
  well: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  art: { width: 40, height: 40 },
  texts: { flexShrink: 1, gap: 1 },
  kicker: { fontWeight: "900", fontSize: 11.5, letterSpacing: 2 },
  title: { color: "#fff", fontWeight: "900", fontSize: 18, letterSpacing: 1.5, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  line: { color: "#E6D6C4", fontSize: 12.5, fontWeight: "700" },
});
