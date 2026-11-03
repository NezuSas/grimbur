import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import type { ImageSourcePropType } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Glow, RayBurst, RuneCircle, Shockwave, SparkBurst } from "./encounterFx";
import Text from "../Text";
import SpriteImage from "../SpriteImage";
import { emitSound } from "../../../audio/audioEventBus";
import { useSettingsStore } from "../../../state/settings/store";
import { GLYPHS } from "../../glyphArt";
import { ABILITY_ART, TOOL_ART } from "../../toolArt";
import { RELIC_IMAGES } from "../../relicImages";
import {
  MAP_GEMS,
  MINER_BOMBS,
  MINER_GEMS,
  SCOUT_ARROWS,
  SCOUT_TILES,
  SHRINE_ARROWS,
  SMITH_ARROWS,
  SPRING_LOSS,
  type Encounter,
} from "../../../core/engine/encounters";

/** One thing paid or received: its picture and how many ("+3", "−2"); `bad` draws it as a loss. */
type Token = { art: ImageSourcePropType; amount: string; bad?: boolean };

/** What a scene shows once chosen: what was paid, what came of it, and whether luck was in play (a moment of suspense). */
type Reveal = { paid: Token[]; got: Token[]; suspense: boolean };

/** The exchange each scene tells, from its outcome (the gambler has its own die and is not here). */
export function revealFor(enc: Encounter): Reveal | null {
  const won = enc.outcome === "win";
  switch (enc.id) {
    case "scout":
      return { paid: [{ art: GLYPHS.arrows, amount: `−${SCOUT_ARROWS}` }], got: [{ art: ABILITY_ART.scout, amount: `×${SCOUT_TILES}` }], suspense: false };
    case "spring":
      return {
        paid: [],
        got: won ? [{ art: enc.gift === "arrow" ? GLYPHS.arrows : GLYPHS.shield, amount: "+1" }] : [{ art: GLYPHS.gem, amount: `−${SPRING_LOSS}`, bad: true }],
        suspense: true,
      };
    case "shrine":
      return { paid: [{ art: GLYPHS.arrows, amount: `−${SHRINE_ARROWS}` }], got: [{ art: enc.gift === "bomb" ? TOOL_ART.bomb : TOOL_ART.detector, amount: "+1" }], suspense: false };
    case "miner":
      return {
        paid: [{ art: TOOL_ART.bomb, amount: `−${MINER_BOMBS}` }],
        got: won && enc.relic ? [{ art: RELIC_IMAGES[enc.relic], amount: "+1" }] : [{ art: GLYPHS.gem, amount: `+${MINER_GEMS}` }],
        suspense: true,
      };
    case "map":
      return { paid: [{ art: GLYPHS.gem, amount: `−${MAP_GEMS}` }], got: [{ art: GLYPHS.lantern, amount: `×${enc.tiles ?? 1}` }], suspense: false };
    case "echo":
      return { paid: [], got: won ? [{ art: GLYPHS.flag, amount: "+1" }] : [{ art: GLYPHS.arrows, amount: "−1", bad: true }], suspense: true };
    case "smith":
      return { paid: [{ art: GLYPHS.shield, amount: "−1" }], got: [{ art: GLYPHS.arrows, amount: `+${SMITH_ARROWS}` }], suspense: false };
    default:
      return null;
  }
}

/**
 * Every picture a scene's exchange may show, whatever comes of it: drawn unseen while the choice is open, so the outcome
 * never pops in with an empty disc while its picture is still on the way.
 */
export function revealArts(id: Encounter["id"]): ImageSourcePropType[] {
  const outcomes: Encounter[] = [
    { id, outcome: "win", gift: "shield" },
    { id, outcome: "win", gift: "arrow" },
    { id, outcome: "lose" },
    { id, outcome: "done", gift: "detector" },
    { id, outcome: "done", gift: "bomb" },
  ];
  const arts = new Set<ImageSourcePropType>();
  for (const o of outcomes) {
    const r = revealFor(o);
    r?.paid.forEach(t => arts.add(t.art));
    r?.got.forEach(t => arts.add(t.art));
  }
  return [...arts];
}

/** The beats of the show: the price flying in, the held breath of a scene of luck, the reveal, the result settling. */
const PAY_MS = 520;
const SUSPENSE_MS = 1500;
const SETTLE_MS = 380;

const LOSS = "#B5524A";

const TokenView = ({ token, size, tint, dim = false }: { token: Token; size: number; tint: string; dim?: boolean }) => {
  const rim = token.bad ? LOSS : tint;
  return (
    <View style={{ alignItems: "center", gap: 3, opacity: dim ? 0.5 : 1 }}>
      <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2, borderColor: rim, backgroundColor: rim + "26" }]}>
        <View style={[styles.discInner, { borderRadius: size / 2, borderColor: rim + "55" }]} />
        <SpriteImage source={token.art} style={{ width: size * 0.8, height: size * 0.8 }} resizeMode="contain" />
      </View>
      <Text style={[styles.amount, { color: token.bad ? "#D58A7E" : token.amount.startsWith("−") ? "#CDBBA5" : "#A3BF7C" }]}>{token.amount}</Text>
    </View>
  );
};

type Props = {
  encounter: Encounter;
  tint: string;
  size: number;
  /** Called once what came of the scene is on the card (the result can be told). */
  onLanded: () => void;
};

/**
 * What came of a scene, played as a small show on the card. The price (arrows, gems, a bomb, the shield) flies into the
 * altar in the middle and is consumed in a flash; a scene of luck then holds its breath: a rune circle turns around a
 * trembling "?" whose glow swells, ticking faster like a heartbeat. Then the answer bursts out of a shockwave, light rays
 * and sparks, overshoots, settles and keeps floating. A loss bursts in red. Calm mode shows the result at once.
 */
const EncounterReveal = ({ encounter, tint, size, onLanded }: Props) => {
  const reveal = revealFor(encounter);
  const calm = useSettingsStore(s => s.reduceFlash);
  const [phase, setPhase] = useState<"pay" | "suspense" | "got">(() => (calm || !reveal ? "got" : reveal.paid.length ? "pay" : "suspense"));
  const fly = useRef(new Animated.Value(calm ? 1 : 0)).current;
  const pop = useRef(new Animated.Value(calm ? 1 : 0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const charge = useRef(new Animated.Value(0)).current;
  const landedRef = useRef(onLanded);
  landedRef.current = onLanded;
  const bad = !!reveal?.got.some(t => t.bad);
  // The colour of the reveal: red for a loss. Never shown before the reveal, or the suspense would give it away.
  const burst = bad ? LOSS : tint;
  const stage = size * 2.3;
  // From the price's place to the altar's centre, measured once both are laid out (an estimate until then).
  const [flyDistance, setFlyDistance] = useState(size / 2 + 12 + size * 0.42 + 12 + stage / 2);
  const boxes = useRef<{ paid?: { x: number; width: number }; stage?: { x: number; width: number } }>({});
  const measured = (part: "paid" | "stage") => (e: LayoutChangeEvent) => {
    boxes.current[part] = e.nativeEvent.layout;
    const { paid, stage: st } = boxes.current;
    if (paid && st) setFlyDistance(st.x + st.width / 2 - (paid.x + paid.width / 2));
  };

  useEffect(() => {
    if (calm || !reveal) {
      landedRef.current();
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, f: () => void) => timers.push(setTimeout(f, ms));
    let at = 0;
    if (reveal.paid.length) {
      // The price flies into the altar and is consumed.
      emitSound("UI_TAP");
      Animated.timing(fly, { toValue: 1, duration: PAY_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start();
      at = PAY_MS;
    }
    if (reveal.suspense) {
      later(at, () => {
        setPhase("suspense");
        // The held breath: a tremble, a glow that swells, ticks that quicken.
        Animated.timing(charge, { toValue: 1, duration: SUSPENSE_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
        Animated.loop(
          Animated.sequence([
            Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
            Animated.timing(shake, { toValue: -1, duration: 120, useNativeDriver: true }),
            Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
          ]),
        ).start();
      });
      for (let t = 0, step = 320; t < SUSPENSE_MS - 120; t += step, step = Math.max(110, step * 0.8)) later(at + t, () => emitSound("MOVE"));
      at += SUSPENSE_MS;
    }
    later(at, () => {
      shake.stopAnimation();
      shake.setValue(0);
      setPhase("got");
      emitSound(bad ? "TRAP_TRIGGERED" : encounter.id === "miner" && encounter.outcome === "win" ? "RELIC_PICKED" : "COIN_COLLECTED");
      Animated.spring(pop, { toValue: 1, friction: 4.5, tension: 140, useNativeDriver: true }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(bob, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bob, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ).start();
    });
    later(at + SETTLE_MS, () => landedRef.current());
    return () => {
      timers.forEach(clearTimeout);
      bob.stopAnimation();
      shake.stopAnimation();
    };
    // The show plays once, when the outcome appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!reveal) return null;
  const got = phase === "got";
  const flyer = {
    opacity: fly.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
    transform: [
      { translateX: fly.interpolate({ inputRange: [0, 1], outputRange: [0, flyDistance] }) },
      { translateY: fly.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -size * 0.35, 0] }) },
      { scale: fly.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }) },
    ],
  };
  const result = {
    opacity: pop.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
    transform: [
      { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
      { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.07] }) },
    ],
  };

  return (
    <View style={styles.row}>
      {reveal.paid.length ? (
        <>
          <View onLayout={measured("paid")}>
            {/* What was paid stays, dimmed, under its flying copy. */}
            <View style={styles.group}>
              {reveal.paid.map((t, i) => (
                <TokenView key={i} token={t} size={size} tint={tint} dim />
              ))}
            </View>
            {!calm ? (
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.group, flyer]}>
                {reveal.paid.map((t, i) => (
                  <TokenView key={i} token={t} size={size} tint={tint} />
                ))}
              </Animated.View>
            ) : null}
          </View>
          <Ionicons name="arrow-forward" size={size * 0.42} color={tint} style={{ marginBottom: size * 0.32 }} />
        </>
      ) : null}
      <View onLayout={measured("stage")} style={{ width: stage, height: stage, alignItems: "center", justifyContent: "center" }}>
        {/* The altar: a dark well with a rim of the scene's colour. */}
        <View style={[styles.altar, { width: stage * 0.78, height: stage * 0.78, borderRadius: stage, borderColor: tint + "44" }]} />
        <Glow size={stage * 0.9} color={(got ? burst : tint) + "40"} strength={got ? pop.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) : charge} />
        <RuneCircle size={stage * 0.72} color={tint} active={phase === "suspense"} />
        {!calm ? (
          <>
            <RayBurst size={stage * 1.15} color={burst + "AA"} play={got} />
            <Shockwave size={stage} color={burst} play={got} />
            <SparkBurst size={stage * 1.2} color={burst} play={got} />
            {/* The flash of the price consumed. */}
            {reveal.paid.length ? <SparkBurst size={stage * 0.7} color={tint} play={phase !== "pay"} count={9} duration={500} /> : null}
          </>
        ) : null}
        {got ? (
          <Animated.View style={[styles.group, result]}>
            {reveal.got.map((t, i) => (
              <TokenView key={i} token={t} size={size * 1.15} tint={tint} />
            ))}
          </Animated.View>
        ) : phase === "suspense" ? (
          <Animated.View
            style={[
              styles.disc,
              styles.mystery,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: tint,
                transform: [
                  { rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ["-10deg", "10deg"] }) },
                  { scale: charge.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] }) },
                ],
              },
            ]}
          >
            <Text style={[styles.question, { color: tint, fontSize: size * 0.56 }]}>?</Text>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  group: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  disc: { borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  discInner: { position: "absolute", left: 3, top: 3, right: 3, bottom: 3, borderWidth: 1 },
  mystery: { backgroundColor: "rgba(20,12,8,0.75)" },
  question: { fontWeight: "900", includeFontPadding: false },
  amount: { fontSize: 15, fontWeight: "900", minWidth: 28, textAlign: "center" },
  altar: { position: "absolute", backgroundColor: "rgba(10,6,4,0.55)", borderWidth: 1.5 },
});

export default EncounterReveal;
