import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from "react-native";
import Text from "../Text";
import { useT } from '../../../i18n/useT';

export type PopupType = 'coin' | 'kill' | 'trap' | 'shield' | 'ammo' | 'boss' | 'streak';

const POPUP_STYLE: Record<PopupType, { color: string; label: (points: number, shieldText: string) => string }> = {
  coin:   { color: '#FFD700', label: p => `💎 +${p}` },
  kill:   { color: '#FF3B30', label: p => `💀 +${p}` },
  boss:   { color: '#FF1744', label: p => `👹 +${p}` },
  trap:   { color: '#FF9800', label: p => `⚠️ ${p}` },
  shield: { color: '#4FC3F7', label: (_p, shieldText) => `🛡️ ${shieldText}` },
  ammo:   { color: '#FF9800', label: p => `🏹 +${p}` },
  streak: { color: '#FFD700', label: () => '' },
};

/** Width of the box a popup centres itself in, around its anchor. */
const BOX_WIDTH = 190;

type Props = {
  points: number;
  type?: PopupType;
  /** Screen coordinates of the tile it rises from. Without them it appears near the middle of the screen. */
  x?: number;
  y?: number;
  /** Position in a stack of popups born close together (0 = lowest); higher ones start further up. */
  slot?: number;
  /** Second line (for example "x2 COMBO" or "x3"). When the type is `streak` it is the only text. */
  sub?: string | null;
  /** Overrides the colour of the second line (the combo grows warmer). */
  subColor?: string;
  /** Peak scale of the pop (the combo grows it). */
  popScale?: number;
  onComplete: () => void;
};

const ScorePopup = ({ points, type = 'kill', x, y, slot = 0, sub, subColor, popScale = 1, onComplete }: Props) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(1)).current;
  const scale      = useRef(new Animated.Value(0.6)).current;
  const { t } = useT();
  const { color, label } = POPUP_STYLE[type];
  const text = label(points, t('popup.shield'));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -46, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(scale,    { toValue: 1.25 * popScale, duration: 160, useNativeDriver: true }),
        Animated.timing(scale,    { toValue: popScale, duration: 100, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(450),
        Animated.timing(opacity,  { toValue: 0,   duration: 450, useNativeDriver: true }),
      ]),
    ]).start(() => onComplete());
  }, []);

  const anchored = x !== undefined && y !== undefined;
  const place = anchored
    ? { left: x - BOX_WIDTH / 2, top: y - 18 - slot * 26 }
    : { alignSelf: 'center' as const, top: `${45 - slot * 6}%` as `${number}%` };

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.box,
        place,
        { width: anchored ? BOX_WIDTH : undefined, transform: [{ translateY }, { scale }], opacity },
      ]}
    >
      <Animated.View style={[styles.pill, { borderColor: color }]}>
        {text !== '' && (
          <Text style={[styles.text, { color }]} maxFontSizeMultiplier={1.2}>
            {text}
          </Text>
        )}
        {!!sub && (
          <Text style={[styles.sub, { color: subColor ?? color }, type === 'streak' && styles.text]} maxFontSizeMultiplier={1.2}>
            {sub}
          </Text>
        )}
      </Animated.View>
    </Animated.View>
  );
};

export default ScorePopup;

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 998,
  },
  pill: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  text: {
    fontWeight: '900',
    fontSize: 26,
    letterSpacing: 0.5,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sub: {
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
