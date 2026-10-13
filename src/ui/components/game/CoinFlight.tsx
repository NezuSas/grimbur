import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import SpriteImage, { AnimatedSprite } from "../SpriteImage";

type Props = {
  startX: number;
  startY: number;
  /** Where the gem lands (the HUD gem counter). */
  targetX: number;
  targetY: number;
  onComplete: () => void;
};

const CoinFlight = ({ startX, startY, targetX, targetY, onComplete }: Props) => {
  const pos = useRef(new Animated.ValueXY({ x: startX, y: startY })).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(pos, {
        toValue: { x: targetX, y: targetY },
        duration: 500,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.2, duration: 250, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.5, duration: 250, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        delay: 50,
        useNativeDriver: true,
      })
    ]).start(() => onComplete());
  }, []);

  return (
    <AnimatedSprite
      source={require("../../../assets/sprites/items/Icon_Gem.png")}
      style={{
        position: 'absolute',
        width: 32,
        height: 32,
        transform: [
          { translateX: pos.x },
          { translateY: pos.y },
          { scale: scale }
        ],
        opacity: opacity,
        zIndex: 999,
      }}
    />
  );
};

export default CoinFlight;
