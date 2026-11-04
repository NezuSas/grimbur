import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type ImageSourcePropType } from "react-native";
import Text from "../Text";
import SpriteImage from "../SpriteImage";
import { AMMO_GLYPH, GLYPHS, type GlyphName } from "../../glyphArt";
import type { WeaponId } from "../../../core/engine/weapons";
import { useT } from '../../../i18n/useT';

export type PopupType = 'coin' | 'kill' | 'trap' | 'shield' | 'ammo' | 'boss' | 'streak';

const POPUP_STYLE: Record<PopupType, { color: string; glyph: GlyphName | null; label: (points: number, shieldText: string) => string }> = {
  coin:   { color: '#C9A55A', glyph: 'gem',     label: p => `+${p}` },
  kill:   { color: '#C2463D', glyph: 'skull',   label: p => `+${p}` },
  boss:   { color: '#C23A44', glyph: 'monster', label: p => `+${p}` },
  trap:   { color: '#CC8638', glyph: 'trap',    label: p => `${p}` },
  shield: { color: '#7FAFC6', glyph: 'shield',  label: (_p, shieldText) => shieldText },
  ammo:   { color: '#CC8638', glyph: 'arrows',  label: p => `+${p}` },
  streak: { color: '#C9A55A', glyph: null,      label: () => '' },
};

/** Width of the box a popup centres itself in, around its anchor (a relic's name or a short line fits on two lines). */
const BOX_WIDTH = 240;

type Props = {
  /** The hero's weapon: an ammo popup shows its own ammo. */
  weapon?: WeaponId;
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
  /** A painted picture leading the label, instead of the type's glyph (the chest's relic, the vortex). */
  art?: ImageSourcePropType;
  /** A painted picture after the second line ("-1" then what it cost). */
  subArt?: ImageSourcePropType;
  /** Development: stays on screen, still (for screenshots). */
  hold?: boolean;
  onComplete: () => void;
};

const ScorePopup = ({ points, type = 'kill', x, y, slot = 0, sub, subColor, popScale = 1, art, subArt, hold, onComplete, weapon = 'bow' }: Props) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(1)).current;
  const scale      = useRef(new Animated.Value(0.6)).current;
  const { t } = useT();
  const { color, label } = POPUP_STYLE[type];
  const glyph = type === 'ammo' ? AMMO_GLYPH[weapon] : POPUP_STYLE[type].glyph;
  const text = label(points, t('popup.shield'));

  useEffect(() => {
    if (hold) {
      scale.setValue(popScale);
      return;
    }
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
    : { left: 0, right: 0, top: `${34 - slot * 9}%` as `${number}%` };

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.box,
        place,
        { width: anchored ? BOX_WIDTH : undefined, transform: [{ translateY }, { scale }], opacity },
      ]}
    >
      <View style={[styles.pill, { borderColor: color + "CC" }]}>
        <View style={[styles.sheen, { backgroundColor: color }]} />
        {art ?? (glyph && text !== "") ? (
          <SpriteImage source={art ?? GLYPHS[glyph!]} style={text !== "" ? styles.lead : styles.leadSmall} resizeMode="contain" />
        ) : null}
        <View style={styles.texts}>
          {text !== '' && (
            <Text style={[styles.text, { color }]} maxFontSizeMultiplier={1.2}>
              {text}
            </Text>
          )}
          {!!sub && (
            <View style={styles.subRow}>
              <Text style={[styles.sub, { color: subColor ?? color }, text === '' && styles.subAlone]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                {sub}
              </Text>
              {subArt ? <SpriteImage source={subArt} style={styles.subArt} resizeMode="contain" /> : null}
            </View>
          )}
        </View>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: BOX_WIDTH,
    backgroundColor: 'rgba(20,13,8,0.9)',
    paddingLeft: 6,
    paddingRight: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  /** A faint wash of the label's colour along the top, like light on a polished plate. */
  sheen: { position: 'absolute', left: 0, right: 0, top: 0, height: '45%', opacity: 0.12 },
  lead: { width: 24, height: 24 },
  leadSmall: { width: 22, height: 22 },
  texts: { flexShrink: 1, alignItems: 'flex-start' },
  text: {
    fontWeight: '900',
    fontSize: 18,
    lineHeight: 21,
    letterSpacing: 0.5,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  sub: {
    flexShrink: 1,
    fontWeight: '900',
    fontSize: 11.5,
    lineHeight: 14,
    letterSpacing: 0.6,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  /** A line on its own (a relic's name, a streak) reads a little larger. */
  subAlone: { fontSize: 13, lineHeight: 16 },
  subArt: { width: 18, height: 18 },
});
