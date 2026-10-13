import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';

export type PopupType = 'coin' | 'kill' | 'trap' | 'shield' | 'ammo';

const POPUP_STYLE: Record<PopupType, { color: string; label: (points: number) => string }> = {
  coin:   { color: '#FFD700', label: p => `💎 +${p}` },
  kill:   { color: '#FF3B30', label: p => `💀 +${p}` },
  trap:   { color: '#FF9800', label: p => `⚠️ ${p}` },
  shield: { color: '#4FC3F7', label: () => '🛡️ SHIELD' },
  ammo:   { color: '#FF9800', label: p => `🏹 +${p}` },
};

type Props = {
  points: number;
  type?: PopupType;
  onComplete: () => void;
};

const ScorePopup = ({ points, type = 'kill', onComplete }: Props) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(1)).current;
  const scale      = useRef(new Animated.Value(0.6)).current;
  const { color, label } = POPUP_STYLE[type];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -80, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(scale,    { toValue: 1.3, duration: 200, useNativeDriver: true }),
        Animated.timing(scale,    { toValue: 1.0, duration: 100, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(opacity,  { toValue: 0,   duration: 500, useNativeDriver: true }),
      ]),
    ]).start(() => onComplete());
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.killPopup,
        { transform: [{ translateY }, { scale }], opacity, borderColor: color },
      ]}
    >
      <Text style={[styles.killPopupText, { color }]}>{label(points)}</Text>
    </Animated.View>
  );
};

export default ScorePopup;

const styles = StyleSheet.create({
  killPopup: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    zIndex: 998,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  killPopupText: {
    fontWeight: '900',
    fontSize: 40,
    letterSpacing: 1,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
