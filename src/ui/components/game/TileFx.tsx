import React, { memo, useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import SpriteImage from "../SpriteImage";
import type { FxFrames } from "../../weaponFxArt";

/** How long the effect stays on the tiles once the shot lands. */
export const TILE_FX_MS = 1300;
/** How fast the painted frames cycle. */
const FRAME_MS = 95;

type Props = {
  tiles: readonly number[];
  cols: number;
  tileSize: number;
  frames: FxFrames;
  /** When the shot lands (ms after mount): the effect starts then. */
  delay: number;
  /** The tile the shot landed on: it starts first, the others a beat later (the fire spreads out from it). */
  center: number;
  /** The board is tilted (2.5D): the effect is stretched back up so it stands on the tile instead of lying flat. */
  stand?: number;
  onDone: () => void;
};

/**
 * A painted effect standing on each tile a shot touched: flames licking up from the tiles of a bomb's blast, an arcane burst
 * rising from the tiles an orb lit. Four frames cycle while it burns; it flares up, holds and dies down. Each tile starts a
 * little after the one the shot landed on, so it spreads out. The look follows the style worn (weaponFxArt).
 */
const TileFx = ({ tiles, cols, tileSize, frames, delay, center, stand = 1, onDone }: Props) => {
  const life = useRef(new Animated.Value(0)).current;
  const cycle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loops = Math.ceil(TILE_FX_MS / (FRAME_MS * frames.length));
    const spin = Animated.loop(Animated.timing(cycle, { toValue: frames.length, duration: FRAME_MS * frames.length, easing: Easing.linear, useNativeDriver: true }), { iterations: loops });
    const run = Animated.sequence([Animated.delay(delay), Animated.parallel([Animated.timing(life, { toValue: 1, duration: TILE_FX_MS, easing: Easing.linear, useNativeDriver: true }), spin])]);
    run.start(({ finished }) => finished && onDone());
    return () => run.stop();
  }, []);

  const cr = Math.floor(center / cols);
  const cc = center % cols;
  return (
    <>
      {tiles.map(i => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        // Tiles farther from where it landed catch a moment later.
        const lag = Math.min(0.18, (Math.abs(r - cr) + Math.abs(c - cc)) * 0.07);
        const opacity = life.interpolate({ inputRange: [0, lag, lag + 0.1, 0.72, 1], outputRange: [0, 0, 1, 0.9, 0], extrapolate: "clamp" });
        const grow = life.interpolate({ inputRange: [0, lag, lag + 0.14, 0.8, 1], outputRange: [0.3, 0.3, 1.08, 1, 0.7], extrapolate: "clamp" });
        const size = tileSize * 1.05;
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: c * tileSize + (tileSize - size) / 2,
              // Stands on the lower part of its tile, rising up over it.
              top: r * tileSize + tileSize * 0.86 - size,
              width: size,
              height: size,
              zIndex: 12,
              opacity,
              transform: [{ translateY: size / 2 }, { scaleY: stand }, { scale: grow }, { translateY: -size / 2 }],
            }}
          >
            {frames.map((frame, k) => (
              <Animated.View
                key={k}
                style={{
                  position: "absolute",
                  width: size,
                  height: size,
                  // Step through the frames: each shows for its quarter of the cycle.
                  opacity: cycle.interpolate({
                    inputRange: [k - 0.01, k, k + 0.99, k + 1],
                    outputRange: [0, 1, 1, 0],
                    extrapolate: "clamp",
                  }),
                }}
              >
                <SpriteImage source={frame} style={{ width: size, height: size }} resizeMode="contain" />
              </Animated.View>
            ))}
            {/* The last frame also covers the loop's wrap (cycle back at 0 shows frame 0). */}
            <View />
          </Animated.View>
        );
      })}
    </>
  );
};

export default memo(TileFx);
