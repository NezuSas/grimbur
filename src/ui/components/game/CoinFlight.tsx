import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { AnimatedSprite } from "../SpriteImage";
import { Burst } from "../Burst";

const GEM = require("../../../assets/sprites/items/Icon_Gem.png");
const SIZE = 32;
/** The sparks get a head start before the gem leaves the tile. */
const LIFT_MS = 110;
const FLIGHT_MS = 560;

type Props = {
  startX: number;
  startY: number;
  /** Where the gem lands (the HUD gem counter). */
  targetX: number;
  targetY: number;
  /** The gem reached the counter (the counter ticks then). */
  onComplete: () => void;
};

/**
 * A picked gem: a spray of gem sparks on its tile, then the gem itself swings up on a curve into the HUD counter
 * (sideways first, then up, as if tossed) and shrinks into it. Native-driven; never mounted when calm.
 */
const CoinFlight = ({ startX, startY, targetX, targetY, onComplete }: Props) => {
  const x = useRef(new Animated.Value(startX)).current;
  const y = useRef(new Animated.Value(startY)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(x, { toValue: targetX, duration: FLIGHT_MS, delay: LIFT_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(y, { toValue: targetY, duration: FLIGHT_MS, delay: LIFT_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.3, duration: LIFT_MS + 140, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.55, duration: FLIGHT_MS - 140, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start(() => onComplete());
  }, []);

  return (
    <>
      <View pointerEvents="none" style={{ position: 'absolute', left: startX, top: startY, width: SIZE, height: SIZE, zIndex: 998 }}>
        {/* Each flight mounts once, so a fixed run throws the sparks once. */}
        <Burst run={1} source={GEM} spread={0.7} />
      </View>
      <AnimatedSprite
        source={GEM}
        style={{
          position: 'absolute',
          width: SIZE,
          height: SIZE,
          transform: [{ translateX: x }, { translateY: y }, { scale }],
          zIndex: 999,
        }}
      />
    </>
  );
};

export default CoinFlight;
