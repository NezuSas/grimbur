import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  /** A guardian (or the Grimbur) touches the hero's tile. */
  roar: boolean;
  /** A vortex touches the hero's tile. */
  vortex: boolean;
  /** How many hazards touch the hero: more of them, a stronger glow. */
  intensity?: number;
  /** Reduced motion: a steady, softer glow instead of a pulse. */
  calm?: boolean;
};

const ROAR = 'rgba(255,70,20,0.35)';
const PIT = 'rgba(176,60,210,0.35)';
const CLEAR = 'rgba(0,0,0,0)';

/**
 * A glow around the screen edges while the hero stands next to a hazard. It stays mounted and only its
 * opacity changes, so it fades out when the danger is gone instead of vanishing at once.
 */
const DangerVignette = ({ roar, vortex, intensity = 1, calm = false }: Props) => {
  const presence = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const active = roar || vortex;
  const strength = Math.min(1, 0.65 + 0.175 * Math.max(0, intensity - 1)) * (calm ? 0.6 : 1);

  useEffect(() => {
    Animated.timing(presence, { toValue: active ? strength : 0, duration: active ? 250 : 500, useNativeDriver: true }).start();
  }, [active, strength, presence]);

  useEffect(() => {
    if (!active || calm) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, calm, pulse]);

  // The colour of the last real danger is kept while fading out.
  const colour = useRef(ROAR);
  if (roar) colour.current = ROAR;
  else if (vortex) colour.current = PIT;
  const c = colour.current;

  const opacity = Animated.multiply(presence, pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }));
  const edge = (style: object, start: { x: number; y: number }, end: { x: number; y: number }) => (
    <LinearGradient colors={[c, CLEAR] as any} start={start} end={end} style={[styles.edge, style]} />
  );

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity, zIndex: 5 }]} pointerEvents="none">
      <View style={StyleSheet.absoluteFill}>
        {edge({ top: 0, left: 0, right: 0, height: '22%' }, { x: 0.5, y: 0 }, { x: 0.5, y: 1 })}
        {edge({ bottom: 0, left: 0, right: 0, height: '22%' }, { x: 0.5, y: 1 }, { x: 0.5, y: 0 })}
        {edge({ top: 0, bottom: 0, left: 0, width: '10%' }, { x: 0, y: 0.5 }, { x: 1, y: 0.5 })}
        {edge({ top: 0, bottom: 0, right: 0, width: '10%' }, { x: 1, y: 0.5 }, { x: 0, y: 0.5 })}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({ edge: { position: 'absolute' } });

export default DangerVignette;
