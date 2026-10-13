import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const DangerVignette = ({ roar, vortex }: { roar: boolean, vortex: boolean }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: (roar || vortex) ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [roar, vortex]);

  if (!roar && !vortex) return null;

  return (
    <Animated.View 
      style={[StyleSheet.absoluteFill, { opacity: opacity.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }), zIndex: 5 }]} 
      pointerEvents="none"
    >
      <LinearGradient
        colors={['transparent', vortex ? 'rgba(156,39,176,0.15)' : 'rgba(255,140,0,0.1)'] as any}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 0.5, y: 1 }}
      />
    </Animated.View>
  );
};

export default DangerVignette;
