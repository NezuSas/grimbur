import ShotDemo from "./ShotDemo";
import React from "react";
import { arcaneFx } from "../../ui/weaponFxArt";
import SpriteImage from "../../ui/components/SpriteImage";
import { Animated, View } from "react-native";
import { ORB_LOOKS, type OrbLook } from "../../ui/cosmeticArt";
import { useSettingsStore } from "../../state/settings/store";
import type { CosmeticId } from "../../core/cosmetics/cosmetics";
import { useFlightClock } from "./TrailPreview";

/** One cast across the preview, in ms: the flight, then the burst where the orb lands. */
const CAST_MS = 1800;
/** The share of the cast spent flying; the rest is the burst. */
const LAND = 0.55;
/** Where the orb flies (shares of the preview, from its centre) and where it lands. */
const FROM = -0.62;
const AT = 0.12;
/** The four tiles the burst lights around where the orb lands (the plus of ORB_BURST = 1). */
const PLUS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

/** The orb itself: a halo of its glow, a brighter ring, its heart and a white glint. */
export const OrbBall = ({ look, size }: { look: OrbLook; size: number }) => (
  <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
    <View style={{ position: "absolute", width: size, height: size, borderRadius: size, backgroundColor: look.glow, opacity: 0.22 }} />
    <View style={{ position: "absolute", width: size * 0.66, height: size * 0.66, borderRadius: size, backgroundColor: look.glow, opacity: 0.55 }} />
    <View style={{ width: size * 0.42, height: size * 0.42, borderRadius: size, backgroundColor: look.core }} />
    <View style={{ position: "absolute", left: size * 0.4, top: size * 0.37, width: size * 0.1, height: size * 0.1, borderRadius: size, backgroundColor: "#FFFFFF", opacity: 0.9 }} />
  </View>
);

type Props = { id: CosmeticId; size: number; small?: boolean };

/**
 * Mira's orb in a style: it floats across the preview with a soft wobble and a fading wake of its glow, then bursts where
 * it lands, a ring of light spreading and the four tiles around it lit (what the orb does on the board). Small previews and
 * calm mode show it still, just after the burst.
 */
const OrbPreview = ({ id, size, small }: Props) => {
  const calm = useSettingsStore(s => s.reduceFlash);
  const look = ORB_LOOKS[id] ?? ORB_LOOKS.orb_frost!;
  const still = calm || !!small;
  const clock = useFlightClock(still, CAST_MS);
  // The big preview plays what the style really does in a run, on the game's own stone blocks.
  if (!small) return <ShotDemo size={size} frames={arcaneFx(id)} mark="rune" tint={look.glow} projectile={s => <OrbBall look={look} size={s} />} />;

  const ball = size * 0.3;
  const tile = size * 0.17;
  const landX = AT * size;

  if (still) {
    // On a card the orb itself is the picture: big, glowing in its colours, with a few motes of its light around it.
    const big = size * 0.62;
    const motes = [[-0.36, -0.26, 0.07], [0.34, -0.3, 0.05], [0.38, 0.22, 0.06], [-0.3, 0.32, 0.045], [0.02, -0.42, 0.04]] as const;
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        {/* The arcane burst this style casts on the lit tiles (what is bought), the orb glowing over it. */}
        <SpriteImage source={arcaneFx(id)[2]} style={{ position: "absolute", width: size * 0.95, height: size * 0.95 }} resizeMode="contain" />
        {motes.slice(0, 2).map(([mx, my, ms], k) => (
          <View key={k} style={{ position: "absolute", left: size / 2 + mx * size - (ms * size) / 2, top: size / 2 + my * size - (ms * size) / 2, width: ms * size, height: ms * size, borderRadius: size, backgroundColor: look.core, opacity: 0.8 }} />
        ))}
        <View style={{ position: "absolute", top: size * 0.12 }}>
          <OrbBall look={look} size={big * 0.55} />
        </View>
      </View>
    );
  }

  // The flight: in from the left with a light wobble, slowing as it reaches where it lands.
  const flightIn = [0, LAND * 0.5, LAND];
  const x = clock.interpolate({ inputRange: [...flightIn, 1], outputRange: [FROM * size, (FROM + (AT - FROM) * 0.7) * size, landX, landX] });
  const y = clock.interpolate({ inputRange: [0, LAND * 0.33, LAND * 0.66, LAND, 1], outputRange: [0, -size * 0.05, size * 0.04, 0, 0] });
  // The orb swells as it bursts, then fades.
  const orbScale = clock.interpolate({ inputRange: [0, LAND, LAND + 0.08, LAND + 0.2, 1], outputRange: [1, 1, 1.35, 0.2, 0.2] });
  const orbOpacity = clock.interpolate({ inputRange: [0, 0.04, LAND + 0.1, LAND + 0.22, 1], outputRange: [0, 1, 1, 0, 0] });
  // The ring of the burst and the lit tiles around it.
  const ringScale = clock.interpolate({ inputRange: [0, LAND, LAND + 0.3, 1], outputRange: [0.2, 0.2, 2.2, 2.2] });
  const ringOpacity = clock.interpolate({ inputRange: [0, LAND, LAND + 0.04, LAND + 0.3, 1], outputRange: [0, 0, 0.9, 0, 0] });
  const tileOpacity = clock.interpolate({ inputRange: [0, LAND + 0.04, LAND + 0.14, 0.92, 1], outputRange: [0, 0, 0.55, 0, 0] });
  const tileScale = clock.interpolate({ inputRange: [0, LAND + 0.04, LAND + 0.16, 1], outputRange: [0.4, 0.4, 1, 1] });

  // A wake of three fading echoes behind the orb, each a little later on the same path.
  const echoes = [0.06, 0.12, 0.18].map((lag, k) => {
    const shift = (v: number) => Math.max(0, Math.min(1, v));
    return {
      k,
      x: clock.interpolate({ inputRange: [0, lag, ...flightIn.slice(1).map(c => shift(c + lag)), 1], outputRange: [FROM * size, FROM * size, (FROM + (AT - FROM) * 0.7) * size, landX, landX] }),
      opacity: clock.interpolate({ inputRange: [0, lag + 0.04, LAND, LAND + lag, 1], outputRange: [0, 0.45 - k * 0.12, 0.45 - k * 0.12, 0, 0] }),
      scale: 0.8 - k * 0.18,
    };
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: size }}>
      {PLUS.map(([dx, dy], k) => (
        <Animated.View
          key={k}
          pointerEvents="none"
          style={{ position: "absolute", left: size / 2 + landX + dx * tile * 1.15 - tile / 2, top: size / 2 + dy * tile * 1.15 - tile / 2, width: tile, height: tile, borderRadius: tile * 0.25, backgroundColor: look.glow, opacity: tileOpacity, transform: [{ scale: tileScale }] }}
        />
      ))}
      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", left: size / 2 + landX - ball / 2, top: size / 2 - ball / 2, width: ball, height: ball, borderRadius: ball, borderWidth: Math.max(1.5, size * 0.012), borderColor: look.core, opacity: ringOpacity, transform: [{ scale: ringScale }] }}
      />
      {echoes.map(e => (
        <Animated.View key={e.k} pointerEvents="none" style={{ position: "absolute", left: size / 2 - ball / 2, top: size / 2 - ball / 2, width: ball, height: ball, borderRadius: ball, backgroundColor: look.glow, opacity: e.opacity, transform: [{ translateX: e.x }, { scale: e.scale }] }} />
      ))}
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: size / 2 - ball / 2, top: size / 2 - ball / 2, opacity: orbOpacity, transform: [{ translateX: x }, { translateY: y }, { scale: orbScale }] }}>
        <OrbBall look={look} size={ball} />
      </Animated.View>
    </View>
  );
};

export default OrbPreview;
