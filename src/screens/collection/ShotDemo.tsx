import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import SpriteImage from "../../ui/components/SpriteImage";
import TileFx, { TILE_FX_MS, TILE_MARK_MS } from "../../ui/components/game/TileFx";
import { BLOCK_ART } from "../../ui/biomeArt";
import type { FxFrames } from "../../ui/weaponFxArt";

/** The demo board: 3 x 3 stone blocks, the shot lands on the middle one. */
const COLS = 3;
const CENTER = 4;
const PLUS = [CENTER, 1, 3, 5, 7];
/** How long the shot flies in before it lands. */
const FLY_MS = 650;
/** A short rest after the effect and the mark have faded, before the next throw. */
const REST_MS = 350;
export const DEMO_CYCLE_MS = FLY_MS + Math.max(TILE_FX_MS, TILE_MARK_MS) + REST_MS;

type Props = {
  size: number;
  /** The painted effect the style leaves on the tiles. */
  frames: FxFrames;
  /** The mark on the stone: a bomb's scorch, an orb's rune. */
  mark: "scorch" | "rune";
  /** The style's colour (embers / rune glow). */
  tint: string;
  /** What flies in (the bomb or the orb), drawn at the given size. */
  projectile: (size: number) => React.ReactNode;
  /** A bomb is lobbed in an arc; an orb drifts in straight. */
  arc?: boolean;
};

/**
 * What a weapon style really does in a run, played on a little board of the game's own stone blocks: the bomb (or orb) flies
 * in, lands on the middle tile, and the style's painted effect rises from the tiles it hits while the stone is scorched (or
 * rune-marked), exactly as on the board (the same TileFx). Loops.
 */
const ShotDemo = ({ size, frames, mark, tint, projectile, arc = false }: Props) => {
  const tile = Math.floor((size * 0.86) / COLS);
  const boardW = tile * COLS;
  const fly = useRef(new Animated.Value(0)).current;
  const [round, setRound] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const throwOnce = () => {
      fly.setValue(0);
      setRound(r => r + 1);
      Animated.timing(fly, { toValue: 1, duration: FLY_MS, easing: arc ? Easing.linear : Easing.out(Easing.quad), useNativeDriver: true }).start();
      timer = setTimeout(() => alive && throwOnce(), DEMO_CYCLE_MS);
    };
    throwOnce();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  const ball = tile * 0.62;
  // From off the left edge to the middle tile; a bomb rises and falls on the way.
  const fromX = -tile * 1.6;
  const x = fly.interpolate({ inputRange: [0, 1], outputRange: [fromX, 0] });
  const y = arc
    ? fly.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -tile * 0.75, -tile * 1.0, -tile * 0.75, 0] })
    : fly.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -tile * 0.08, 0] });
  const spin = fly.interpolate({ inputRange: [0, 1], outputRange: ["-30deg", arc ? "320deg" : "0deg"] });
  const shown = fly.interpolate({ inputRange: [0, 0.05, 0.97, 1], outputRange: [0, 1, 1, 0] });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: size }}>
      <View style={{ width: boardW, height: boardW }}>
        {Array.from({ length: COLS * COLS }, (_, i) => (
          <SpriteImage
            key={i}
            source={BLOCK_ART.cave.tileRevealed}
            style={{ position: "absolute", left: (i % COLS) * tile, top: Math.floor(i / COLS) * tile, width: tile, height: tile }}
            resizeMode="contain"
          />
        ))}
        {round > 0 ? (
          <TileFx key={round} tiles={PLUS} cols={COLS} tileSize={tile} frames={frames} delay={FLY_MS} center={CENTER} mark={mark} tint={tint} onDone={() => {}} />
        ) : null}
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: tile * 1.5 - ball / 2,
            top: tile * 1.5 - ball / 2,
            zIndex: 20,
            opacity: shown,
            transform: [{ translateX: x }, { translateY: y }, { rotate: spin }],
          }}
        >
          {projectile(ball)}
        </Animated.View>
      </View>
    </View>
  );
};

export default ShotDemo;
