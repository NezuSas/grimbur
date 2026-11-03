import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
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
      return { paid: [{ art: GLYPHS.gem, amount: `−${MAP_GEMS}` }], got: [{ art: GLYPHS.lantern, amount: "×1" }], suspense: false };
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

/** How long the suspense lasts, and the beat between paying and receiving. */
const SUSPENSE_MS = 1300;
const TICK_MS = 260;
const EXCHANGE_MS = 420;

const TokenView = ({ token, size, tint, glow = false }: { token: Token; size: number; tint: string; glow?: boolean }) => (
  <View style={{ alignItems: "center", gap: 2 }}>
    {glow ? (
      <View
        pointerEvents="none"
        style={[styles.burst, { width: size * 1.6, height: size * 1.6, borderRadius: size, left: "50%", marginLeft: -size * 0.8, top: -size * 0.3, backgroundColor: (token.bad ? "#B5524A" : tint) + "33" }]}
      />
    ) : null}
    <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2, borderColor: token.bad ? "#B5524A" : tint, backgroundColor: (token.bad ? "#B5524A" : tint) + "22" }]}>
      <SpriteImage source={token.art} style={{ width: size * 0.78, height: size * 0.78 }} resizeMode="contain" />
    </View>
    <Text style={[styles.amount, { color: token.bad ? "#D58A7E" : token.amount.startsWith("−") ? "#D8C8B7" : "#A3BF7C" }]}>{token.amount}</Text>
  </View>
);

type Props = {
  encounter: Encounter;
  tint: string;
  size: number;
  /** Called once what came of the scene is on the card (the result can be told). */
  onLanded: () => void;
};

/**
 * What came of a scene, told as a little exchange on the card: what was paid slides in and dims, then what it brought pops
 * out with a burst and a sound. A scene of luck first holds its breath (a "?" shaking among rings) before the answer. Calm
 * mode shows the exchange at once.
 */
const EncounterReveal = ({ encounter, tint, size, onLanded }: Props) => {
  const reveal = revealFor(encounter);
  const calm = useSettingsStore(s => s.reduceFlash);
  const [phase, setPhase] = useState<"suspense" | "paid" | "got">(() => (calm || !reveal ? "got" : reveal.suspense ? "suspense" : "paid"));
  const paidIn = useRef(new Animated.Value(calm ? 1 : 0)).current;
  const gotIn = useRef(new Animated.Value(calm ? 1 : 0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const landedRef = useRef(onLanded);
  landedRef.current = onLanded;
  const bad = !!reveal?.got.some(t => t.bad);

  useEffect(() => {
    if (calm || !reveal) {
      landedRef.current();
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, f: () => void) => timers.push(setTimeout(f, ms));
    let at = 0;
    if (reveal.paid.length) {
      Animated.timing(paidIn, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      emitSound("UI_TAP");
    }
    if (reveal.suspense) {
      // Held breath: the "?" trembles while rings ripple out of it, ticking like a heartbeat.
      Animated.loop(
        Animated.sequence([
          Animated.timing(shake, { toValue: 1, duration: 70, useNativeDriver: true }),
          Animated.timing(shake, { toValue: -1, duration: 140, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0, duration: 70, useNativeDriver: true }),
        ]),
      ).start();
      Animated.loop(Animated.timing(ring, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true })).start();
      later(0, () => setPhase("suspense"));
      for (let t = TICK_MS; t < SUSPENSE_MS; t += TICK_MS) later(t, () => emitSound("MOVE"));
      at = SUSPENSE_MS;
    } else {
      at = EXCHANGE_MS;
    }
    later(at, () => {
      shake.stopAnimation();
      ring.stopAnimation();
      shake.setValue(0);
      setPhase("got");
      emitSound(bad ? "TRAP_TRIGGERED" : encounter.id === "miner" && encounter.outcome === "win" ? "RELIC_PICKED" : "COIN_COLLECTED");
      Animated.spring(gotIn, { toValue: 1, friction: 5, tension: 150, useNativeDriver: true }).start();
      landedRef.current();
    });
    return () => timers.forEach(clearTimeout);
    // The exchange plays once, when the outcome appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!reveal) return null;
  const paidStyle = {
    opacity: paidIn.interpolate({ inputRange: [0, 1], outputRange: [0, phase === "got" ? 0.55 : 1] }),
    transform: [{ translateX: paidIn.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.4, 0] }) }, { scale: phase === "got" ? 0.88 : 1 }],
  };
  const gotStyle = {
    opacity: gotIn,
    transform: [{ scale: gotIn.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
  };

  return (
    <View style={styles.row}>
      {reveal.paid.length ? (
        <>
          <Animated.View style={[styles.group, paidStyle]}>
            {reveal.paid.map((t, i) => (
              <TokenView key={i} token={t} size={size} tint={tint} />
            ))}
          </Animated.View>
          <Ionicons name="arrow-forward" size={size * 0.42} color={tint} style={{ marginBottom: size * 0.3 }} />
        </>
      ) : null}
      <View style={{ minWidth: size * 1.2, alignItems: "center", justifyContent: "center" }}>
        {phase === "got" ? (
          <Animated.View style={[styles.group, gotStyle]}>
            {reveal.got.map((t, i) => (
              <TokenView key={i} token={t} size={size} tint={tint} glow />
            ))}
          </Animated.View>
        ) : phase === "suspense" ? (
          <View style={{ alignItems: "center", justifyContent: "center", height: size + 18 }}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderColor: tint,
                  opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
                  transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.disc,
                styles.mystery,
                { width: size, height: size, borderRadius: size / 2, borderColor: tint, transform: [{ rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ["-9deg", "9deg"] }) }] },
              ]}
            >
              <Text style={[styles.question, { color: tint, fontSize: size * 0.52 }]}>?</Text>
            </Animated.View>
          </View>
        ) : (
          <View style={{ width: size, height: size + 18 }} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  group: { flexDirection: "row", gap: 8, alignItems: "center" },
  disc: { borderWidth: 2, alignItems: "center", justifyContent: "center" },
  mystery: { backgroundColor: "rgba(20,12,8,0.7)" },
  question: { fontWeight: "900", includeFontPadding: false },
  amount: { fontSize: 15, fontWeight: "900", minWidth: 28, textAlign: "center" },
  ring: { position: "absolute", borderWidth: 2 },
  burst: { position: "absolute" },
});

export default EncounterReveal;
