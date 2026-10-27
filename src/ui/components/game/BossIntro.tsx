import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Text from "../Text";
import BossSprite, { BOSS_FRAMES } from "../BossSprite";
import SpriteImage from "../SpriteImage";

type Props = {
  /** "The Grimbur". */
  name: string;
  /** The epithet under the name. */
  title: string;
  /** Spoken hint: a tap skips the introduction. */
  skipLabel: string;
  /** Reduced motion: the card only fades in and out (no bars, no rise, no shake). */
  calm: boolean;
  /** The introduction is over (played out or skipped). */
  onDone: () => void;
};

/** When the Grimbur roars (it shakes and raises its claws) and for how long, and when it all leaves. */
const ROAR_AT = 620;
const ROAR_MS = 520;
const LEAVE_AT = 2200;
const CALM_HOLD = 1600;

/**
 * The Grimbur's entrance on reaching its lair, as a card over the board (never on it: where it hides is the puzzle).
 * Black bars close in, the Grimbur rises out of the dark, roars, and its name slams down with its epithet under it;
 * then it all clears for the hunt. A tap skips it. Native-driven; when calm, the card simply fades in and out.
 */
const BossIntro = ({ name, title, skipLabel, calm, onDone }: Props) => {
  const { width, height } = useWindowDimensions();
  const bars = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const quake = useRef(new Animated.Value(0)).current;
  const slam = useRef(new Animated.Value(0)).current;
  const epithet = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(calm ? 0 : 1)).current;
  const [roaring, setRoaring] = useState(false);
  const leaving = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const leave = () => {
    if (leaving.current) return;
    leaving.current = true;
    Animated.timing(fade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onDoneRef.current());
  };
  const leaveRef = useRef(leave);
  leaveRef.current = leave;

  useEffect(() => {
    if (calm) {
      const run = Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true });
      run.start();
      const timer = setTimeout(() => leaveRef.current(), 250 + CALM_HOLD);
      return () => {
        run.stop();
        clearTimeout(timer);
      };
    }
    const to = (value: Animated.Value, toValue: number, duration: number) => Animated.timing(value, { toValue, duration, useNativeDriver: true });
    const run = Animated.parallel([
      to(bars, 1, 240),
      Animated.sequence([Animated.delay(150), Animated.spring(rise, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true })]),
      Animated.sequence([
        Animated.delay(ROAR_AT),
        to(quake, 1, 45), to(quake, -1, 60), to(quake, 0.8, 55), to(quake, -0.6, 55), to(quake, 0.3, 50), to(quake, 0, 45),
      ]),
      Animated.sequence([Animated.delay(ROAR_AT + 80), Animated.spring(slam, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true })]),
      Animated.sequence([Animated.delay(ROAR_AT + 380), Animated.timing(epithet, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true })]),
    ]);
    run.start();
    const roarOn = setTimeout(() => setRoaring(true), ROAR_AT);
    const roarOff = setTimeout(() => setRoaring(false), ROAR_AT + ROAR_MS);
    const done = setTimeout(() => leaveRef.current(), LEAVE_AT);
    return () => {
      run.stop();
      clearTimeout(roarOn);
      clearTimeout(roarOff);
      clearTimeout(done);
    };
  }, [calm, bars, rise, quake, slam, epithet, fade]);

  const size = Math.min(height * 0.42, width * 0.3);
  const barHeight = height * 0.13;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.wrap, { opacity: fade }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={leave} accessibilityRole="button" accessibilityLabel={`${name}. ${title}. ${skipLabel}`}>
        <View style={[StyleSheet.absoluteFill, styles.dim]} />
        {!calm && (
          <>
            <Animated.View style={[styles.bar, { top: 0, height: barHeight, transform: [{ translateY: bars.interpolate({ inputRange: [0, 1], outputRange: [-barHeight, 0] }) }] }]} />
            <Animated.View style={[styles.bar, { bottom: 0, height: barHeight, transform: [{ translateY: bars.interpolate({ inputRange: [0, 1], outputRange: [barHeight, 0] }) }] }]} />
          </>
        )}
        <View style={styles.center} pointerEvents="none">
          <Animated.View
            style={{
              width: size,
              height: size,
              opacity: calm ? 1 : rise.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
              transform: calm
                ? []
                : [
                    { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [size * 0.5, 0] }) },
                    { translateX: quake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }) },
                    { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                  ],
            }}
          >
            <View style={[styles.glow, { width: size, height: size, borderRadius: size / 2 }]} />
            {calm ? (
              <SpriteImage source={BOSS_FRAMES.idle} style={{ width: size, height: size }} resizeMode="contain" />
            ) : (
              <BossSprite hp={3} charged={roaring} style={{ width: size, height: size }} />
            )}
          </Animated.View>
          <Animated.View
            style={{
              alignItems: "center",
              opacity: calm ? 1 : slam.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
              transform: calm ? [] : [{ scale: slam.interpolate({ inputRange: [0, 1], outputRange: [1.6, 1] }) }],
            }}
          >
            <Text style={styles.name} maxFontSizeMultiplier={1.2}>
              {name.toLocaleUpperCase()}
            </Text>
          </Animated.View>
          <Animated.View style={{ opacity: calm ? 1 : epithet }}>
            <Text style={styles.title} maxFontSizeMultiplier={1.2}>
              {title}
            </Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: { zIndex: 60 },
  dim: { backgroundColor: "rgba(10,0,6,0.72)" },
  bar: { position: "absolute", left: 0, right: 0, backgroundColor: "#000" },
  center: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", backgroundColor: "rgba(255,23,68,0.22)" },
  name: {
    color: "#FF5252",
    fontWeight: "900",
    fontSize: 34,
    letterSpacing: 6,
    marginTop: 4,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  title: { color: "#FFD54F", fontSize: 15, fontStyle: "italic", letterSpacing: 1, marginTop: 2 },
});

export default BossIntro;
