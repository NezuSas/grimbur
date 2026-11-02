import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View, type StyleProp, type TextStyle } from "react-native";
import Text from "../../ui/components/Text";
import SpriteImage from "../../ui/components/SpriteImage";
import { emitSound } from "../../audio/audioEventBus";
import { haptic } from "../../shared/haptics";

const STAR = require("../../assets/sprites/ui/Icon_Star.png");

/** When the result card's pieces arrive (ms after it opens): the stars first, then the numbers, then what was won. */
export const STAR_START = 260;
export const STAR_GAP = 330;
export const numbersAt = (stars: number) => STAR_START + Math.max(1, stars) * STAR_GAP + 120;

/**
 * The stars won, flown in one by one: each drops from big onto its slot with a chime and a tap of the phone; the ones not won
 * stay as dim outlines. The middle one is bigger, as on the map.
 */
export function FlyingStars({ stars, calm }: { stars: number; calm: boolean }) {
  const land = useRef([0, 1, 2].map(() => new Animated.Value(calm ? 1 : 0))).current;
  useEffect(() => {
    if (calm) {
      emitSound("COIN_COLLECTED");
      return;
    }
    const timers = land.slice(0, stars).map((v, k) =>
      setTimeout(() => {
        emitSound("COIN_COLLECTED");
        haptic.impact();
        Animated.spring(v, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
      }, STAR_START + k * STAR_GAP),
    );
    return () => timers.forEach(clearTimeout);
  }, [calm, stars, land]);
  return (
    <View style={styles.stars}>
      {[0, 1, 2].map(k => {
        const big = k === 1;
        const size = big ? 66 : 52;
        return (
          <View key={k} style={{ width: size, height: size, marginBottom: big ? 6 : 0 }}>
            <SpriteImage source={STAR} style={{ width: size, height: size, opacity: 0.16 }} resizeMode="contain" />
            {k < stars ? (
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    opacity: land[k],
                    transform: [
                      { scale: land[k].interpolate({ inputRange: [0, 1], outputRange: [2.6, 1] }) },
                      { rotate: land[k].interpolate({ inputRange: [0, 1], outputRange: ["-40deg", "0deg"] }) },
                    ],
                  },
                ]}
              >
                <SpriteImage source={STAR} style={{ width: size, height: size }} resizeMode="contain" />
              </Animated.View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** A number that counts up from zero once its moment comes (shown whole at once when calm). */
export function CountUp({ value, delay, duration = 700, format = String, style, calm }: { value: number; delay: number; duration?: number; format?: (n: number) => string; style?: StyleProp<TextStyle>; calm: boolean }) {
  const [shown, setShown] = useState(calm ? value : 0);
  useEffect(() => {
    if (calm) {
      setShown(value);
      return;
    }
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const f = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - f, 3))));
      if (f < 1) frame = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [value, delay, duration, calm]);
  return (
    <Text style={style} maxFontSizeMultiplier={1.2}>
      {format(shown)}
    </Text>
  );
}

/** A piece of the card that drops in at its moment (with an optional sound), in place at once when calm. */
export function DropIn({ delay, calm, sound, children }: { delay: number; calm: boolean; sound?: "EMBER_GAIN" | "LEVEL_UP" | "RELIC_PICKED"; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(calm ? 1 : 0)).current;
  useEffect(() => {
    if (calm) return;
    const timer = setTimeout(() => {
      if (sound) emitSound(sound);
      Animated.spring(v, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [calm, delay, sound, v]);
  return (
    <Animated.View style={{ alignSelf: "stretch", alignItems: "center", opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1.15, 1] }) }] }}>
      {children}
    </Animated.View>
  );
}

/** Eases a value from 0 to 1 over `ms` once `delay` has passed (for a gentle fade of a whole block). */
export function useFadeIn(delay: number, calm: boolean, ms = 300): Animated.Value {
  const v = useRef(new Animated.Value(calm ? 1 : 0)).current;
  useEffect(() => {
    if (calm) return;
    Animated.timing(v, { toValue: 1, duration: ms, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [calm, delay, ms, v]);
  return v;
}

const styles = StyleSheet.create({
  stars: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 6, marginVertical: 6 },
});
