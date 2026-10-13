import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CoinFlight = ({ startX, startY, onComplete }: { startX: number, startY: number, onComplete: () => void }) => {
  const pos = useRef(new Animated.ValueXY({ x: startX, y: startY })).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(pos, {
        toValue: { x: screenWidth * 0.85, y: screenHeight * 0.05 },
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
    <Animated.Image
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
