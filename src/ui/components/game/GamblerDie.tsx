import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { emitSound } from "../../../audio/audioEventBus";
import { useSettingsStore } from "../../../state/settings/store";

/** Where the pips of each face sit on a 3x3 grid (row, column). */
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 2], [2, 0]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

/** The faces shown while the die tumbles, and how long each stays: quick at first, slowing as it settles. */
const TUMBLE_STEPS = [55, 60, 65, 70, 80, 90, 100, 115, 130, 150, 175, 205];

/** A bone die face (ivory, dark pips, a rim in the scene's colour). */
export const DieFace = ({ face, size, rim }: { face: number; size: number; rim: string }) => {
  const pip = size * 0.17;
  const pad = size * 0.16;
  const cell = (size - pad * 2) / 3;
  return (
    <View style={[styles.face, { width: size, height: size, borderRadius: size * 0.2, borderColor: rim }]}>
      {(PIPS[face] ?? PIPS[1]).map(([r, c], i) => (
        <View
          key={i}
          style={[
            styles.pip,
            { width: pip, height: pip, borderRadius: pip / 2, left: pad + c * cell + (cell - pip) / 2, top: pad + r * cell + (cell - pip) / 2 },
          ]}
        />
      ))}
    </View>
  );
};

type Props = {
  /** The face the die lands on. */
  face: number;
  size: number;
  rim: string;
  /** Whether the landed face wins (its glow and sound). */
  won: boolean;
  /** Called once the die has landed (the result can be told). */
  onLanded: () => void;
};

/**
 * The gambler's die thrown on the table: it tumbles through random faces, spinning and slowing down, then lands on the face
 * the run's dice gave with a little bounce. Calm mode skips the tumble and shows the face at once.
 */
const GamblerDie = ({ face, size, rim, won, onLanded }: Props) => {
  const calm = useSettingsStore(s => s.reduceFlash);
  const [shown, setShown] = useState(() => (calm ? face : 1 + Math.floor(Math.random() * 6)));
  const spin = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const land = useRef(new Animated.Value(calm ? 1 : 0)).current;
  const landedRef = useRef(onLanded);
  landedRef.current = onLanded;

  useEffect(() => {
    if (calm) {
      landedRef.current();
      return;
    }
    const total = TUMBLE_STEPS.reduce((a, b) => a + b, 0);
    Animated.timing(spin, { toValue: 1, duration: total, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: total * 0.35, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(hop, { toValue: 0, duration: total * 0.65, easing: Easing.bounce, useNativeDriver: true }),
    ]).start();

    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 0;
    let last = shown;
    TUMBLE_STEPS.forEach((ms, i) => {
      at += ms;
      const final = i === TUMBLE_STEPS.length - 1;
      timers.push(
        setTimeout(() => {
          if (final) {
            setShown(face);
            emitSound(won ? "COIN_COLLECTED" : "UI_TAP");
            Animated.spring(land, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
            landedRef.current();
          } else {
            // Never the same face twice in a row, so every step reads as a roll.
            let next = 1 + Math.floor(Math.random() * 5);
            if (next >= last) next += 1;
            last = next;
            setShown(next);
            if (i % 2 === 0) emitSound("MOVE");
          }
        }, at),
      );
    });
    return () => timers.forEach(clearTimeout);
    // The throw happens once, when the die appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["-200deg", "720deg"] });
  const translateY = hop.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.45] });
  const scale = land.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const glow = land.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={{ width: size * 1.5, height: size * 1.5, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          { width: size * 1.45, height: size * 1.45, borderRadius: size, backgroundColor: won ? rim + "55" : "rgba(181, 82, 74,0.35)", opacity: glow },
        ]}
      />
      <Animated.View style={{ transform: [{ translateY }, { rotate }, { scale }] }}>
        <DieFace face={shown} size={size} rim={rim} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  face: {
    backgroundColor: "#E9DEC6",
    borderWidth: 2.5,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  pip: { position: "absolute", backgroundColor: "#2A1A10" },
  glow: { position: "absolute" },
});

export default GamblerDie;
